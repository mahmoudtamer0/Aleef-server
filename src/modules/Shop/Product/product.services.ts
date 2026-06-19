import { clearCache, getCache, setCache } from "../../../cache";
import pool from "../../../db"
import ApiError from "../../../utils/ApiError"
import { generateFinalPrice } from "../../../utils/generateFinalPrice"



// addProduct
export const addProduct = async ({ title, description, originalPrice, discount, categories, stock }: any, reqFiles: any): Promise<any> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const finalPrice = Math.round(await generateFinalPrice(Number(originalPrice), Number(discount)));
        const categoryList = Array.isArray(categories) ? categories : [categories];

        const categoryIds: string[] = [];
        for (const catName of categoryList) {
            const name = catName.trim().toLowerCase();
            const findCat = await client.query(
                `SELECT id FROM categories WHERE name = $1`,
                [name]
            );
            if (findCat.rowCount === 0) throw new ApiError(400, `invalid category: ${catName}`);
            categoryIds.push(findCat.rows[0].id);
        }

        const newProduct = await client.query(
            `INSERT INTO products (title, description, "originalPrice", "finalPrice", discount, stock, thumbnail_url, thumbnail_cloudinary_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [
                title, description,
                Number(originalPrice), Number(finalPrice), Number(discount), stock !== undefined && stock !== "" ? Number(stock) : 0,
                reqFiles?.thumbnail?.[0]?.path ?? null,
                reqFiles?.thumbnail?.[0]?.filename ?? null
            ]
        );

        const productId = newProduct.rows[0].id;

        if (reqFiles?.productImages?.length > 0) {
            for (const img of reqFiles.productImages) {
                await client.query(
                    `INSERT INTO product_images (product_id, url, cloudinary_id) VALUES ($1, $2, $3)`,
                    [productId, img.path, img.filename]
                );
            }
        }

        for (const catId of categoryIds) {
            await client.query(
                `INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)`,
                [productId, catId]
            );
        }

        await client.query("COMMIT");

        clearCache(`products:`);
        return newProduct.rows[0];

    } catch (err) {
        console.error("❌ Error adding product:", err);
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}


export const getProducts = async (reqQuery: any): Promise<any> => {
    const { category, minPrice, maxPrice, search, sort } = reqQuery;
    console.log("getProducts", reqQuery);

    const page = Math.max(1, reqQuery.page * 1 || 1);
    const limit = 6;
    const offset = (page - 1) * limit;

    const cacheKey = `products:${page}_${limit}_${sort}_${category}_${minPrice}_${maxPrice}_${search}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const params: any[] = [];
    const filters: string[] = [];

    if (search && search !== "") {
        params.push(`%${search}%`);
        filters.push(`(p.title ILIKE $${params.length} OR p.description ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
    }

    if (category && category !== "") {
        params.push(category.trim().toLowerCase());
        filters.push(`c.name = $${params.length}`);
    }

    if (minPrice) {
        params.push(Number(minPrice));
        filters.push(`p."finalPrice" >= $${params.length}`);
    }

    if (maxPrice) {
        params.push(Number(maxPrice));
        filters.push(`p."finalPrice" <= $${params.length}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const orderClause = sort === "best-selling"
        ? `ORDER BY p.buys DESC, p.stock DESC`
        : `ORDER BY p.stock DESC, p."updatedAt" DESC`;

    params.push(limit, offset);
    const limitClause = `LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const mainQuery = `
        SELECT 
            p.id, p.title, p.description, p."originalPrice", p."finalPrice",
            p.discount, p.stock, p.buys,
            p."averageRate", p."ratingsQuantity", p."createdAt", p."updatedAt",
            jsonb_build_object('url', p.thumbnail_url, 'cloudinary_id', p.thumbnail_cloudinary_id) AS thumbnail,
            json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name)) AS categories,
            COUNT(*) OVER() AS total_count
        FROM products p
        LEFT JOIN product_categories pc ON p.id = pc.product_id
        LEFT JOIN categories c ON pc.category_id = c.id
        ${whereClause}
        GROUP BY p.id
        ${orderClause}
        ${limitClause}
    `;

    const products = await pool.query(mainQuery, params);

    const totalCount = products.rows[0]?.total_count ?? 0;

    const response = {
        products: products.rows,
        results: products.rowCount,
        totalProducts: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page
    };

    setCache(cacheKey, response, 500);
    return response;
};

export const getProduct = async ({ prodId }: any) => {

    const cached = getCache(`product:${prodId}`);
    if (cached) {
        return cached;
    }


    const product = await pool.query(`SELECT products.id, title, "originalPrice", "finalPrice",
        discount, description, stock, buys,
        CAST("averageRate" AS FLOAT) AS "averageRate", "ratingsQuantity",
        jsonb_build_object('url', thumbnail_url, 'cloudinary_id', thumbnail_cloudinary_id) AS thumbnail,
        json_agg(DISTINCT jsonb_build_object('url', i.url, 'cloudinary_id', i.cloudinary_id)) AS "productImages"
        FROM products
        LEFT JOIN product_images i ON products.id = i.product_id
        WHERE products.id = $1
        GROUP BY products.id`, [prodId]);

    if (product.rowCount === 0) {
        throw new ApiError(404, "not found");
    }

    product.rows[0].productImages = (product.rows[0].productImages ?? [])
        .filter((img: any) => img !== null && img.url !== null);

    product.rows[0].productImages.unshift(product.rows[0].thumbnail);


    const response = product.rows[0];

    setCache(`product:${prodId}`, response, 300);
    return response;

}



export const calculateCart = async (cart: any) => {

    const productIds = cart.map((item: any) => item.productId);

    const getProducts = await pool.query(
        `SELECT id, "finalPrice"
        FROM products
        WHERE id = ANY($1::uuid[])`,
        [productIds]
    );

    const products = getProducts.rows;

    let subTotal = 0;
    let delivery = 20;
    let tax = 0.14;

    for (let i = 0; i < products.length; i++) {
        const item = cart[i]
        const product = products.find((p: any) => p.id === item.productId);
        if (!product) {
            throw new ApiError(404, "not found");
        }
        subTotal += item.quantity * product.finalPrice;
    }


    return {
        subTotal,
        delivery,
        taxPercent: "14%",
        tax: Math.floor(subTotal * tax),
        totalCart: subTotal + delivery + Math.floor(subTotal * tax),
    }
}


export const editProduct = async (
    prodId: any,
    { title, description, originalPrice, discount, categories, stock, deletedImages }: any,
    reqFiles: any
) => {
    const client = await pool.connect();

    try {

        const fields: string[] = [];
        const values: any[] = [];
        let index = 1;

        if (!prodId) {
            throw new ApiError(400, "product id is required");
        }

        if (title) {
            fields.push(`title = $${index}`);
            values.push(title);
            index++;
        }

        if (description) {
            fields.push(`description = $${index}`);
            values.push(description);
            index++;
        }

        const hasPrice = originalPrice !== undefined && originalPrice !== null;
        const hasDiscount = discount !== undefined && discount !== null;

        if (hasPrice || hasDiscount) {
            const findProduct = await client.query(
                `SELECT "originalPrice", discount FROM products WHERE id = $1`,
                [prodId]
            );
            const currentPrice = Number(findProduct.rows[0].originalPrice);
            const currentDiscount = Number(findProduct.rows[0].discount);

            const finalOriginalPrice = hasPrice ? Number(originalPrice) : currentPrice;
            const finalDiscount = hasDiscount ? Number(discount) : currentDiscount;
            const finalPrice = Math.round(await generateFinalPrice(finalOriginalPrice, finalDiscount));

            if (hasPrice) {
                fields.push(`"originalPrice" = $${index}`);
                values.push(finalOriginalPrice);
                index++;
            }
            if (hasDiscount) {
                fields.push(`discount = $${index}`);
                values.push(finalDiscount);
                index++;
            }
            fields.push(`"finalPrice" = $${index}`);
            values.push(finalPrice);
            index++;
        }

        if (stock !== undefined) {
            fields.push(`stock = $${index}`);
            values.push(Number(stock));
            index++;
        }

        if (reqFiles?.productImages?.length > 0) {
            const images = reqFiles.productImages.map(
                (img: { path: string; filename: string }) => ({
                    url: img.path,
                    cloudinary_id: img.filename,
                })
            );
            for (const img of images) {
                await client.query(
                    `INSERT INTO product_images (product_id, url, cloudinary_id) VALUES ($1, $2, $3)`,
                    [prodId, img.url, img.cloudinary_id]
                );
            }
        }

        if (reqFiles?.thumbnail?.length > 0) {
            const thumbnail = {
                url: reqFiles.thumbnail[0].path,
                cloudinary_id: reqFiles.thumbnail[0].filename,
            };
            fields.push(`thumbnail_url = $${index}`);
            values.push(thumbnail.url);
            index++;
            fields.push(`thumbnail_cloudinary_id = $${index}`);
            values.push(thumbnail.cloudinary_id);
            index++;
        }

        if (deletedImages && Array.isArray(deletedImages)) {
            for (const imgId of deletedImages) {
                await client.query(
                    `DELETE FROM product_images WHERE id = $1 AND product_id = $2`,
                    [imgId, prodId]
                );
            }
        }

        if (categories) {
            const categoryList: string[] = Array.isArray(categories) ? categories : [categories];

            await client.query(`DELETE FROM product_categories WHERE product_id = $1`, [prodId]);

            for (const catName of categoryList) {
                const findCat = await client.query(
                    `SELECT id FROM categories WHERE name = $1`,
                    [catName.trim().toLowerCase()]
                );
                if (findCat.rowCount === 0) {
                    throw new ApiError(400, `invalid category: ${catName}`);
                }
                await client.query(
                    `INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)`,
                    [prodId, findCat.rows[0].id]
                );
            }
        }

        if (fields.length > 0) {
            values.push(prodId);
            await client.query(
                `UPDATE products SET ${fields.join(", ")} WHERE id = $${index}`,
                [...values]
            );
        }

        await client.query("COMMIT");

        clearCache(`product:${prodId}`);


        return;
    } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("❌ Error editing product:", err.message, err.code);
        throw err;
    } finally {
        client.release();
    }

};

export const deleteProduct = async (prodId: any) => {
    const client = await pool.connect();
    try {
        console.log("deleting product:", prodId);
        await client.query("BEGIN");
        await client.query(`DELETE FROM products WHERE id = $1`, [prodId]);
        await client.query(`DELETE FROM product_images WHERE product_id = $1`, [prodId]);
        await client.query(`DELETE FROM product_categories WHERE product_id = $1`, [prodId]);
        await client.query("COMMIT");

        clearCache(`products:`);
    } catch (err: any) {
        await client.query("ROLLBACK");
        console.error("❌ Error deleting product:", err.message, err.code);
        throw err;
    } finally {
        client.release();
    }
};
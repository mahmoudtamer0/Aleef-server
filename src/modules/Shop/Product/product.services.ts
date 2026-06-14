import { getCache, setCache } from "../../../cache";
import pool from "../../../db"
import ApiError from "../../../utils/ApiError"
import { generateFinalPrice } from "../../../utils/generateFinalPrice"



export const addProduct = async ({ title, description, originalPrice, discount, category, stock }: any, reqFiles: any): Promise<any> => {

    await pool.query("BEGIN");
    const finalPrice = await generateFinalPrice(Number(originalPrice), Number(discount));

    const findCat = await pool.query(`SELECT id FROM categories WHERE name = $1`, [category.trim().toLowerCase()])
    if (findCat.rowCount === 0) {
        throw new ApiError(400, "invalid category")
    }

    const newProduct = await pool.query(`INSERT INTO products (title, description, "originalPrice", "finalPrice", discount, stock, thumbnail_url, thumbnail_cloudinary_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`, [
        title,
        description,
        Number(originalPrice),
        Number(finalPrice),
        Number(discount),
        stock,
        reqFiles.thumbnail ? reqFiles.thumbnail[0].path : null,
        reqFiles.thumbnail ? reqFiles.thumbnail[0].filename : null
    ]);

    if (reqFiles.productImages && reqFiles.productImages.length > 0) {
        for (const img of reqFiles.productImages) {
            await pool.query(`INSERT INTO product_images (product_id, url, cloudinary_id) VALUES ($1, $2, $3)`, [newProduct.rows[0].id, img.path, img.filename]);
        }
    }

    await pool.query(`INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)`, [newProduct.rows[0].id, findCat.rows[0].id]);

    await pool.query("COMMIT");
    return newProduct.rows[0];
}


export const getProducts = async (reqQuery: any): Promise<any> => {

    const { category,
        minPrice,
        maxPrice,
        search,
        sort } = reqQuery;

    const cached = getCache(`products:${reqQuery.page}_${reqQuery.limit}_${reqQuery.sort}_${reqQuery.category}_${reqQuery.minPrice}_${reqQuery.maxPrice}_${reqQuery.search}`);
    if (cached) {
        console.log("cached")
        return cached;
    }

    const filters: string[] = []

    const page = reqQuery.page * 1 || 1;
    const limit = reqQuery.limit < 8 ? reqQuery.limit * 1 || 8 : 8;
    const offset = (page - 1) * limit


    let mainQuery = `SELECT 
        p.id, p.title, p.description, p."originalPrice", p."finalPrice",
        p.discount, p.stock, p.buys,
        p."averageRate", p."ratingsQuantity", p."createdAt", p."updatedAt",
        jsonb_build_object('url', p.thumbnail_url, 'cloudinary_id', p.thumbnail_cloudinary_id) AS thumbnail,
        json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name)) AS categories,
        COUNT(*) OVER() AS total_count
    FROM products p
    LEFT JOIN product_categories pc ON p.id = pc.product_id
    LEFT JOIN categories c ON pc.category_id = c.id
    `;

    if (search && search != "") {
        const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filters.push(`(p.title ILIKE '%${safeSearch}%' OR p.description ILIKE '%${safeSearch}%' OR c.name ILIKE '%${safeSearch}%')`)
    }

    if (category && category != "") {
        filters.push(`c.name = '${category}'`)
    }

    if (minPrice) {
        filters.push(`p."finalPrice" >= ${Number(minPrice)}`)
    }

    if (maxPrice) {
        filters.push(`p."finalPrice" <= ${Number(maxPrice)}`)
    }


    if (filters.length > 0) {
        mainQuery += ` WHERE ${filters.join(" AND ")}`
    }

    mainQuery += ` GROUP BY p.id`;

    if (sort) {
        if (sort == "best-selling") {
            mainQuery += ` ORDER BY p.buys DESC`
        }
    } else {
        mainQuery += ` ORDER BY p.stock DESC, p."updatedAt" DESC`
    }

    mainQuery += ` LIMIT ${limit} OFFSET ${offset}`


    const products = await pool.query(mainQuery);

    const totalCount = products.rows[0]?.total_count ?? 0;

    const response = {
        products: products.rows,
        results: products.rowCount,
        totalProducts: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page
    }

    setCache(`products:${reqQuery.page}_${reqQuery.limit}_${reqQuery.sort}_${reqQuery.category}_${reqQuery.minPrice}_${reqQuery.maxPrice}_${reqQuery.search}`, response, 500);
    return {
        ...response
    };

}

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

    if (product.rows[0].productImages && product.rows[0].productImages[0] !== null) {
        product.rows[0].productImages.unshift(product.rows[0].thumbnail);
    }

    const response = product.rows[0];

    setCache(`product:${prodId}`, response, 500);
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


export const editProduct = async (prodId: any, { title, description, originalPrice, discount, category, stock, deletedImages }: any, reqFiles: any
) => {

    const fields = [];
    const values = [];
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

    if (originalPrice !== undefined && discount !== undefined) {
        const finalPrice = await generateFinalPrice(Number(originalPrice), Number(discount));
        fields.push(`"originalPrice" = $${index}`);
        values.push(Number(originalPrice));
        index++;
        fields.push(`discount = $${index}`);
        values.push(Number(discount));
        index++;
        fields.push(`"finalPrice" = $${index}`);
        values.push(Number(finalPrice));
        index++;
    }

    if (originalPrice !== undefined && !discount && discount === undefined) {
        const findProduct = await pool.query(`SELECT discount FROM products WHERE id = $1`, [prodId]);
        const discountValue = findProduct.rows[0].discount || 0;
        const finalPrice = await generateFinalPrice(Number(originalPrice), Number(discountValue || 0));

        fields.push(`"originalPrice" = $${index}`);
        values.push(Number(originalPrice));
        index++;
        fields.push(`"finalPrice" = $${index}`);
        values.push(Number(finalPrice));
        index++;
    }

    if (discount !== undefined && !originalPrice && originalPrice === undefined) {
        const findProduct = await pool.query(`SELECT "originalPrice" FROM products WHERE id = $1`, [prodId]);
        const originalPriceValue = findProduct.rows[0].originalPrice || 0;
        const finalPrice = await generateFinalPrice(Number(originalPriceValue), Number(discount));
        fields.push(`discount = $${index}`);
        values.push(Number(discount));
        index++;
        fields.push(`"finalPrice" = $${index}`);
        values.push(Number(finalPrice));
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
                cloudinary_id: img.filename
            })
        );
        for (const img of images) {
            await pool.query(`INSERT INTO product_images (product_id, url, cloudinary_id) VALUES ($1, $2, $3)`, [prodId, img.url, img.cloudinary_id]);
        }
    }

    if (reqFiles?.thumbnail?.length > 0) {
        const thumbnail = {
            url: reqFiles.thumbnail[0].path,
            cloudinary_id: reqFiles.thumbnail[0].filename
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
            await pool.query(`DELETE FROM product_images WHERE id = $1 AND product_id = $2`, [imgId, prodId]);
        }
    }

    if (category) {
        const findCat = await pool.query(`SELECT id FROM categories WHERE name = $1`, [category.trim().toLowerCase()]);
        if (findCat.rowCount === 0) {
            throw new ApiError(400, "invalid category");
        }
        const categoryId = findCat.rows[0].id;
        await pool.query(`DELETE FROM product_categories WHERE product_id = $1`, [prodId]);
        await pool.query(`INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)`, [prodId, categoryId]);
    }

    if (fields.length > 0) {
        values.push(prodId);
        await pool.query(`UPDATE products SET ${fields.join(", ")} WHERE id = $${index}`, [...values]);
    }

    return;
}
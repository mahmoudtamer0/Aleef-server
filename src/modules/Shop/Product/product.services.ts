import pool from "../../../db"
import ApiError from "../../../utils/ApiError"
import { generateFinalPrice } from "../../../utils/generateFinalPrice"
// import Pet from "../../Pet/pet.schema"
// import Category from "../Categories/categories.schema"
// import Address from "../Order/address.schema"
// import Product from "./product.schema"


//mongo version
// export const addProduct = async ({ title, description, originalPrice, discount, category, stock, buys }: any, reqFiles: any) => {



//     const finalPrice = await generateFinalPrice(Number(originalPrice), Number(discount));

//     const findCat = await Category.findOne({ name: category.trim().toLowerCase() })
//     if (!findCat) {
//         throw new ApiError(400, "invalid category")
//     }

//     const newProduct: any = await Product.create({
//         title,
//         description,
//         originalPrice: Number(originalPrice),
//         finalPrice: Number(finalPrice),
//         discount: Number(discount),
//         category: [findCat._id],
//         stock: stock,
//         buys: buys,
//     })

//     if (
//         !reqFiles ||
//         (!reqFiles.productImages && !reqFiles.thumbnail)
//     ) {
//         throw new ApiError(400, "images required");
//     }

//     if (reqFiles.productImages && reqFiles.productImages.length > 0) {
//         newProduct.productImages = reqFiles.productImages.map(
//             (img: { path: string; filename: string }) => ({
//                 url: img.path,
//                 cloudinary_id: img.filename
//             })
//         );
//     }

//     if (reqFiles.thumbnail && reqFiles.thumbnail.length > 0) {
//         newProduct.thumbnail = {
//             url: reqFiles.thumbnail[0].path,
//             cloudinary_id: reqFiles.thumbnail[0].filename
//         };
//     }

//     await newProduct.save()

//     return newProduct

// }

//sql version
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


//mongo version
// export const getProducts = async (reqQuery: any, user: any) => {
//     interface FilterType {
//         category?: string;
//         finalPrice?: {
//             $gte?: number;
//             $lte?: number;
//         };

//         $or?: Array<{
//             title?: {
//                 $regex: string;
//                 $options: string;
//             };
//             description?: {
//                 $regex: string;
//                 $options: string;
//             };
//             "category.name"?: {
//                 $regex: string;
//                 $options: string;
//             };
//         }>;
//     }
//     const {
//         category,
//         minPrice,
//         maxPrice,
//         search,
//         sort,
//     } = reqQuery;
//     let filter: FilterType = {};
//     let toSort = {}
//     let typePriority: string | null = null;


//     const page = reqQuery.page * 1 || 1;
//     const limit = reqQuery.limit < 8 ? reqQuery.limit * 1 || 8 : 8;
//     const skip = (page - 1) * limit

//     if (category && category != "") {
//         const findCat = await Category.findOne({ name: category }).select("_id").lean();
//         if (findCat) {
//             filter.category = findCat._id.toString()
//         } else {
//             filter.category = ""
//         }
//     } else {
//         const lastPet = await Pet.findOne({ owner: user.id })
//             .sort({ createdAt: -1 })
//             .select("type")
//             .lean();

//         if (lastPet) {
//             typePriority = lastPet.type;
//         }
//     }

//     if (minPrice || maxPrice) {
//         filter.finalPrice = {};
//         if (minPrice) filter.finalPrice.$gte = Number(minPrice);
//         if (maxPrice) filter.finalPrice.$lte = Number(maxPrice);
//     }


//     if (search) {

//         const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//         filter.$or = [
//             { title: { $regex: safeSearch, $options: "i" } },
//             { description: { $regex: safeSearch, $options: "i" } },
//             { "category.name": { $regex: safeSearch, $options: "i" } }
//         ];
//     }


//     if (sort) {
//         if (sort == "best-selling") {
//             toSort = { buys: -1 }
//         } else if (sort == "on-sale") {
//             toSort = { discount: -1 }
//         } else if (sort == "min-price") {
//             toSort = { finalPrice: +1 }
//         } else if (sort == "max-price") {
//             toSort = { finalPrice: -1 }
//         } else {
//             toSort = { updatedAt: -1 }
//         }
//     } else {
//         toSort = { stock: -1, updatedAt: -1 };
//     }


//     const products = await Product.aggregate([
//         {
//             $lookup: {
//                 from: "categories",
//                 localField: "category",
//                 foreignField: "_id",
//                 as: "category"
//             }
//         },
//         {
//             $addFields: {
//                 petPriority: {
//                     $cond: [
//                         {
//                             $in: [
//                                 typePriority + "s",
//                                 "$category.name"
//                             ]
//                         },
//                         1,
//                         0
//                     ]
//                 }
//             }
//         },
//         {
//             $match: {
//                 ...filter,
//             }
//         },
//         {
//             $sort: {
//                 petPriority: -1,
//                 ...toSort
//             }
//         },
//         {
//             $skip: skip
//         },
//         {
//             $limit: limit
//         },
//         {
//             $project: {
//                 title: 1,
//                 originalPrice: 1,
//                 finalPrice: 1,
//                 description: 1,
//                 category: 1,
//                 thumbnail: 1,
//                 stock: 1,
//                 discount: 1,
//                 averageRate: 1,
//                 ratingsQuantity: 1
//             }
//         }
//     ])


//     const total = await Product.countDocuments(filter).lean();

//     return {
//         products,
//         totalProducts: total,
//         results: products.length,
//         totalPages: Math.ceil(total / limit),
//         page
//     }

// }

//sql version
export const getProducts = async (reqQuery: any): Promise<any> => {

    const { category,
        minPrice,
        maxPrice,
        search,
        sort } = reqQuery;

    const filters: string[] = []

    const page = reqQuery.page * 1 || 1;
    const limit = reqQuery.limit < 8 ? reqQuery.limit * 1 || 8 : 8;
    const offset = (page - 1) * limit


    let mainQuery = `SELECT 
        p.id, p.title, p.description, p."originalPrice", p."finalPrice",
        p.discount, p.stock, p.buys,
        p."averageRate", p."ratingsQuantity", p."createdAt", p."updatedAt",
        jsonb_build_object('url', p.thumbnail_url, 'cloudinary_id', p.thumbnail_cloudinary_id) AS thumbnail,
        json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name)) AS categories
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



    let countQuery = `SELECT COUNT(DISTINCT p.id) AS total FROM products p`;

    if (filters.length > 0) {
        countQuery += ` LEFT JOIN product_categories pc ON p.id = pc.product_id
        LEFT JOIN categories c ON pc.category_id = c.id WHERE ${filters.join(" AND ")}`
    }


    const [products, totalCount] = await Promise.all([
        pool.query(mainQuery),
        pool.query(countQuery)
    ])


    return {
        products: products.rows,
        results: products.rowCount,
        totalProducts: totalCount.rows[0].total,
        totalPages: Math.ceil(totalCount.rows[0].total / limit),
        page
    };

}


//mongo version
// export const getProduct = async ({ prodId }: any) => {

//     const product = await Product.findById(prodId)
//         .select("title originalPrice finalPrice discount description category stock thumbnail productImages buys averageRate ratingsQuantity")
//         .populate({ path: "category", select: "name -_id" })
//         .lean();

//     if (!product) throw new ApiError(404, "not found");

//     product.productImages.unshift(product.thumbnail);

//     return product

// }

//sql version
export const getProduct = async ({ prodId }: any) => {
    const product = await pool.query(`SELECT products.id, title, "originalPrice", "finalPrice",
        discount, description, stock, buys,
        CAST("averageRate" AS FLOAT) AS "averageRate", "ratingsQuantity",
        jsonb_build_object('url', thumbnail_url, 'cloudinary_id', thumbnail_cloudinary_id) AS thumbnail,
        json_agg(DISTINCT jsonb_build_object('url', i.url, 'cloudinary_id', i.cloudinary_id)) AS "productImages",
        json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name)) AS category
        FROM products
        LEFT JOIN product_images i ON products.id = i.product_id
        LEFT JOIN product_categories pc ON products.id = pc.product_id
        LEFT JOIN categories c ON pc.category_id = c.id
        WHERE products.id = $1
        GROUP BY products.id`, [prodId]);
    if (product.rowCount === 0) {
        throw new ApiError(404, "not found");
    }

    if (product.rows[0].productImages && product.rows[0].productImages[0] !== null) {
        product.rows[0].productImages.unshift(product.rows[0].thumbnail);
    }

    return product.rows[0];
}

//mongo version
// export const calculateCart = async (cart: any) => {

//     let subTotal = 0;
//     let delivery = 20;
//     let tax = 0.14;

//     for (let i = 0; i < cart.length; i++) {
//         const item = cart[i]

//         const product = await Product.findOne({ _id: item.productId }).lean().select("_id finalPrice");
//         if (!product) {
//             throw new ApiError(404, "not found");
//         }
//         subTotal += item.quantity * product.finalPrice;
//     }

//     //  const address = await Address.findOne({ user: user.id }).lean().select("street city phone");


//     return {
//         subTotal,
//         delivery,
//         taxPercent: "14%",
//         tax: Math.floor(subTotal * tax),
//         totalCart: subTotal + delivery + Math.floor(subTotal * tax),
//         // address: address ? {
//         //     address: address.address,
//         //     city: address.city,
//         //     phone: address.phone
//         // } : null
//     }

// }


//sql version


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


//mongo version
// export const editProduct = async (prodId: any, { title, description, originalPrice, discount, category, stock, deletedImages }: any, reqFiles: any
// ) => {

//     const product = await Product.findById(prodId);

//     if (!product) {
//         throw new ApiError(404, "product not found");
//     }

//     let finalPrice = product.finalPrice;

//     if (originalPrice || discount !== undefined) {
//         finalPrice = await generateFinalPrice(
//             Number(originalPrice || product.originalPrice),
//             Number(discount ?? product.discount)
//         );
//     }

//     if (title !== undefined) product.title = title;
//     if (description !== undefined) product.description = description;
//     if (originalPrice !== undefined) product.originalPrice = Number(originalPrice);
//     if (discount !== undefined) product.discount = Number(discount);
//     if (category !== undefined) product.category = category;
//     if (stock !== undefined) product.stock = Number(stock);

//     product.finalPrice = Number(finalPrice);

//     if (reqFiles?.productImages?.length > 0) {

//         const images = reqFiles.productImages.map(
//             (img: { path: string; filename: string }) => ({
//                 url: img.path,
//                 cloudinary_id: img.filename
//             })
//         );

//         product.productImages = images;
//     }

//     if (reqFiles?.thumbnail?.length > 0) {
//         product.thumbnail = {
//             url: reqFiles.thumbnail[0].path,
//             cloudinary_id: reqFiles.thumbnail[0].filename
//         };
//     }

//     await product.save();

//     return;

// };

//sql version
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
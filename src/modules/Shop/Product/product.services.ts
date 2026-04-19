import ApiError from "../../../utils/ApiError"
import { generateFinalPrice } from "../../../utils/generateFinalPrice"
import Category from "../Categories/categories.schema"
import Product from "./product.schema"




export const addProduct = async ({ title, description, originalPrice, discount, category, stock, buys }: any, reqFiles: any) => {



    const finalPrice = await generateFinalPrice(Number(originalPrice), Number(discount))

    const newProduct = await Product.create({
        title,
        description,
        originalPrice: Number(originalPrice),
        finalPrice: Number(finalPrice),
        discount: Number(discount),
        category: category,
        stock: stock,
        buys: buys,
    })

    if (
        !reqFiles ||
        (!reqFiles.productImages && !reqFiles.thumbnail)
    ) {
        throw new ApiError(400, "images required");
    }

    if (reqFiles.productImages && reqFiles.productImages.length > 0) {
        newProduct.productImages = reqFiles.productImages.map(
            (img: { path: string; filename: string }) => ({
                url: img.path,
                cloudinary_id: img.filename
            })
        );
    }

    if (reqFiles.thumbnail && reqFiles.thumbnail.length > 0) {
        newProduct.thumbnail = {
            url: reqFiles.thumbnail[0].path,
            cloudinary_id: reqFiles.thumbnail[0].filename
        };
    }

    await newProduct.save()

    return newProduct

}

export const addManyProducts = async (products: any) => {

    await Product.insertMany(products)
    return;
}

export const getProducts = async (reqQuery: any) => {
    interface FilterType {
        category?: string;
        finalPrice?: {
            $gte?: number;
            $lte?: number;
        };

        $or?: Array<{
            title?: {
                $regex: string;
                $options: string;
            };
            description?: {
                $regex: string;
                $options: string;
            };
            "category.name"?: {
                $regex: string;
                $options: string;
            };
        }>;
    }
    const {
        category,
        minPrice,
        maxPrice,
        search,
        sort,
    } = reqQuery;
    let filter: FilterType = {};
    let toSort = {}

    const page = reqQuery.page * 1 || 1;
    const limit = reqQuery.limit * 1 || 10;
    const skip = (page - 1) * limit

    if (category && category != "") {
        const findCat = await Category.findOne({ name: category })
        if (findCat) {
            filter.category = findCat._id.toString()
        } else {
            filter.category = ""
        }
    }

    if (minPrice || maxPrice) {
        filter.finalPrice = {};
        if (minPrice) filter.finalPrice.$gte = Number(minPrice);
        if (maxPrice) filter.finalPrice.$lte = Number(maxPrice);
    }


    if (search) {

        const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
            { title: { $regex: safeSearch, $options: "i" } },
            { description: { $regex: safeSearch, $options: "i" } },
            { "category.name": { $regex: safeSearch, $options: "i" } }
        ];
    }


    if (sort) {
        if (sort == "best-selling") {
            toSort = { buys: -1 }
        } else if (sort == "on-sale") {
            toSort = { discount: -1 }
        } else if (sort == "min-price") {
            toSort = { finalPrice: +1 }
        } else if (sort == "max-price") {
            toSort = { finalPrice: -1 }
        } else {
            toSort = { updatedAt: -1 }
        }
    } else {
        toSort = { updatedAt: -1 }
    }


    const products = await Product.aggregate([
        {
            $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "category"
            }
        },
        {
            $match: {
                ...filter,
            }
        },
        {
            $sort: toSort
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        {
            $project: {
                title: 1,
                originalPrice: 1,
                finalPrice: 1,
                description: 1,
                category: 1,
                thumbnail: 1,
                discount: 1,
                averageRate: 1,
                ratingsQuantity: 1
            }
        }
    ]);


    const total = await Product.countDocuments(filter)

    return {
        products,
        totalProducts: total,
        results: products.length,
        totalPages: Math.ceil(total / limit),
        page
    }

}

export const getProduct = async ({ prodId }: any) => {

    const getProduct = await Product.findById(prodId).lean().select("-__v -createdAt -updatedAt").populate({
        path: "category",
    })

    if (!getProduct) throw new ApiError(404, "not found");

    const product = {
        ...getProduct,
        productImages: [getProduct.thumbnail, ...getProduct.productImages]
    }

    return product

}

export const calculateCart = async (cart: any) => {

    let subTotal = 0;
    let delivery = 20;
    let tax = 0.14;

    for (let i = 0; i < cart.length; i++) {
        const item = cart[i]

        const product = await Product.findOne({ _id: item.productId }).lean().select("_id finalPrice");
        console.log("product:", product)
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
        totalCart: subTotal + delivery + Math.floor(subTotal * tax)
    }

}

import catchAsync from "../../../utils/catchAsync";
import * as productService from "./product.services"

export const addProduct = catchAsync(async (req, res, next) => {

    const createProduct = await productService.addProduct(req.body, req.files)

    return res.status(201).json({
        status: "success",
        message: "product added successfuly",
        createProduct
    })

})


export const addManyProducts = catchAsync(async (req, res, next) => {

    const { products } = req.body

    await productService.addManyProducts(products)

    return res.status(201).json({
        status: "success",
        message: "products added successfuly",
    })

})


export const getProducts = catchAsync(async (req, res, next) => {

    const products = await productService.getProducts(req.query, req.user)

    return res.status(201).json({
        status: "success",
        products: products.products,
        results: products.results,
        page: products.page,
        totalPages: products.totalPages,
        totalProducts: products.totalProducts
    })

})

export const getProductsSql = catchAsync(async (req, res, next) => {

    const products = await productService.getProductsSql()
    return res.status(201).json({
        status: "success",
        products: products.rows,
    })

})

export const getProductsMongo = catchAsync(async (req, res, next) => {

    const products = await productService.getProductsMongo()

    return res.status(201).json({
        status: "success",
        products,
    })
})


export const getProduct = catchAsync(async (req, res, next) => {

    const product = await productService.getProduct(req.params)

    return res.status(201).json({
        status: "success",
        product,
    })

})

export const calculateCart = catchAsync(async (req, res, next) => {

    const { cart } = req.body
    const user = req.user
    const totalCart = await productService.calculateCart(cart, user)

    return res.status(200).json({
        status: "success",
        subTotal: totalCart.subTotal,
        delivery: totalCart.delivery,
        taxPercent: totalCart.taxPercent,
        taxPayed: totalCart.tax,
        totalCart: totalCart.totalCart,
        address: totalCart.address
    })
})


export const editProduct = catchAsync(async (req, res, next) => {

    const { prodId } = req.params

    const product = await productService.editProduct(
        {
            prodId,
            ...req.body
        },
        req.files
    );

    res.status(200).json({
        message: "product updated successfully",
        product
    });
});
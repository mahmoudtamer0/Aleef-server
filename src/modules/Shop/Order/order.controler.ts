import catchAsync from "../../../utils/catchAsync";
import * as orderService from "./order.services"



export const createOrder = catchAsync(async (req, res, next) => {
    const user = req.user
    const { cart, shippingAddress, paymentMethod } = req.body
    const order = await orderService.createOrder(cart, shippingAddress, paymentMethod, user)

    return res.status(201).json({
        status: "success",
        order
    })
})


export const getMyUpComingOrders = catchAsync(async (req, res, next) => {
    const user = req.user
    const orders = await orderService.getMyUpcomingOrders(user)

    return res.status(200).json({
        status: "success",
        orders: orders
    })
})


export const getMyPreviousOrders = catchAsync(async (req, res, next) => {
    const user = req.user
    const orders = await orderService.getMyPreviousOrders(user)

    return res.status(200).json({
        status: "success",
        orders: orders
    })
})

export const getAllOrders = catchAsync(async (req, res, next) => {
    const reqQuery = req.query
    const orders = await orderService.getAllOrders(reqQuery)

    return res.status(200).json({
        status: "success",
        orders: orders.orders,
        totalOrders: orders.totalOrders,
        totalPages: orders.totalPages,
        results: orders.results,
        page: orders.page
    })
})

export const getAllOrderDetailsForAdmin = catchAsync(async (req, res, next) => {
    const { orderId } = req.params
    const order = await orderService.getAllOrderDetailsForAdmin(orderId)

    return res.status(200).json({
        status: "success",
        order: order
    })
})

export const updateOrder = catchAsync(async (req, res, next) => {
    const { orderId } = req.params as { orderId: string };
    const { status } = req.body
    const order = await orderService.changeOrderStatus(orderId, status)

    return res.status(200).json({
        status: "success",
        order: order
    })
})
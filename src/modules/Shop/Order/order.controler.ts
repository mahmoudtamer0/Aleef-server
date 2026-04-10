import catchAsync from "../../../utils/catchAsync";
import * as orderService from "./order.services"



export const createOrder = catchAsync(async (req, res, next) => {
    const user = req.user
    const { cart, shippingAddress, paymentMethod } = req.body
    const order = await orderService.createOrder(cart, shippingAddress, paymentMethod, user)

    return res.status(200).json({
        status: "success",
        order
    })
})



import ApiError from "../../../utils/ApiError"
import Order from "./order.schema";
import Product from "../Product/product.schema"
import OrderItems from "./orderItems";
import User from "../../User/user.schema";
import { sendEmail } from "../../../utils/sendEmail";
import mongoose from "mongoose";






export const createOrder = async (cart: any, shippingAddress: any, paymentMethod: string, reqUser: any) => {


    let subTotal = 0;
    let delivery = 20;
    let tax = 0.14;

    const user = await User.findById(reqUser.id).lean().select("email name")
    if (!user) {
        throw new ApiError(404, "user not found");
    }

    const products = await Promise.all(cart.map((item: any) => Product.findById(item.productId)));

    for (let i = 0; i < products.length; i++) {
        const product = products[i]
        const item = cart[i]
        if (!product) {
            throw new ApiError(404, "not found this product");
        }

        if (product.stock < item.quantity) {
            throw new ApiError(400, `stock available for ${product.title} is : ${product.stock}`,)
        }


        subTotal += item.quantity * product.finalPrice;
    }


    const order = new Order({
        user: user._id,
        shippingAddress,
        paymentMethod,
        subTotal: subTotal,
        delivery: delivery,
        taxPayed: Math.floor(subTotal * tax),
        totalPrice: subTotal + delivery + Math.floor(subTotal * tax)
    })

    await order.save()

    for (const item of cart) {
        const product = products.find(prod => prod._id.toString() == item.productId)

        const orderItem = new OrderItems({
            order: order._id,
            product: product._id,
            title: product.title,
            image: product.thumbnail.url,
            price: product.finalPrice,
            quantity: item.quantity
        })

        await orderItem.save()

        product.stock -= item.quantity;
        product.buys += 1;
        await product.save();
    }

    setImmediate(() => {
        sendEmail({
            email: user.email,
            subject: "Your Order has been placed 🛍️",
            text: "",
            message: `
<div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">

    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

        <h1 style="color: #267D77; text-align: center;">Aleef</h1>
        <h2 style="text-align: center; color: #333;">Order Confirmation</h2>

        <p style="color: #555; font-size: 16px;">
            Hello ${user.name}, your order has been successfully placed 🎉
        </p>

        <hr style="margin: 20px 0;" />

        <h3 style="color: #267D77;">Order Details</h3>

        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>

        <h3 style="color: #267D77; margin-top: 20px;">Summary</h3>

        <p><strong>Subtotal:</strong> ${subTotal} EGP</p>
        <p><strong>Delivery:</strong> ${delivery} EGP</p>
        <p><strong>Tax:</strong> ${Math.floor(subTotal * tax)} EGP</p>

        <h2 style="color: #333;">
            Total: ${subTotal + delivery + Math.floor(subTotal * tax)} EGP
        </h2>

        <hr style="margin: 20px 0;" />

        <h3 style="color: #267D77;">Shipping Address</h3>
        <p style="color: #555;">
            ${shippingAddress.street || ""} <br/>
            ${shippingAddress.city || ""} <br/>
            ${shippingAddress.phone || ""}
        </p>

        <div style="text-align: center; margin-top: 30px;">
            <p style="color: #777; font-size: 14px;">
                We’ll notify you once your order is shipped 🚚
            </p>
        </div>

        <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
            <p>If you did not make this order, please contact support.</p>

            <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
        </div>

    </div>

</div>
`
        }).catch(err => {
            console.error("Email failed:", err);
        });
    })



    return order;



}



export const getMyUpComingOrders = async (user: any) => {

    const orders = await Order.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(user.id),
                $or: [
                    { status: "pending" },
                    { status: "shipped" }
                ]
            }
        },
        {
            $lookup: {
                from: "orderitems",
                localField: "_id",
                foreignField: "order",
                as: "items"
            }
        },
        {
            $project: {
                totalOrder: "$totalPrice",
                shippingAddress: 1,
                paymentMethod: 1,
                status: 1,
                items: 1
            }
        }
    ]);

    return orders;
}

export const getMyPreviousOrders = async (user: any) => {

    const orders = await Order.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(user.id),
                $or: [
                    { status: "cancelled" },
                    { status: "delivered" }
                ]
            }

        },
        {
            $lookup: {
                from: "orderitems",
                localField: "_id",
                foreignField: "order",
                as: "items"
            }
        },
        {
            $project: {
                totalOrder: "$totalPrice",
                shippingAddress: 1,
                paymentMethod: 1,
                status: 1,
                items: 1
            }
        }
    ]);

    return orders;
}
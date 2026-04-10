import ApiError from "../../../utils/ApiError"
import { generateFinalPrice } from "../../../utils/generateFinalPrice"
import Order from "./order.schema";
import Product from "../Product/product.schema"
import OrderItems from "./orderItems";
import User from "../../User/user.schema";
import { sendEmail } from "../../../utils/sendEmail";






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
            throw new ApiError(400, `stock available for this product is : ${product.stock}`,)
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


    await sendEmail({
        email: user.email,
        subject: "Order Confirmation",
        text: "",
        message: `
    <div style="font-family: Arial; padding:20px;">
    <h2 style="color:#333;">Order Confirmation</h2>
    <p>Hello ${user.name},</p>
    <p>Your order has been received successfully.</p>

    <div style="background:#f5f5f5; padding:10px; margin:10px 0;">
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Total:</strong> $${order.totalPrice}</p>
    </div>

    <p>We will notify you when it ships 🚚</p>
    </div>
`,
    })


    return order;



}
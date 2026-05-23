import ApiError from "../../../utils/ApiError"
import Order from "./order.schema";
import Product from "../Product/product.schema"
import OrderItems from "./orderItems";
import User from "../../User/user.schema";
import { sendEmail } from "../../../utils/sendEmail";
import mongoose from "mongoose";
import Address from "./address.schema";


export const createOrder = async (cart: any, shippingAddress: any, paymentMethod: string, reqUser: any) => {


    let subTotal = 0;
    let delivery = 20;
    let tax = 0.14;

    const user = await User.findById(reqUser.id).lean().select("email name");
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


    const [order] = await Promise.all([
        new Order({
            user: user._id,
            shippingAddress,
            paymentMethod,
            subTotal: subTotal,
            delivery: delivery,
            taxPayed: Math.floor(subTotal * tax),
            totalPrice: subTotal + delivery + Math.floor(subTotal * tax)
        }).save(),

        Address.findOneAndUpdate(
            { user: user._id },
            { ...shippingAddress, user: user._id },
            { upsert: true, new: true }
        )
    ])


    for (const item of cart) {
        const product = products.find(prod => prod._id.toString() == item.productId);

        if (!product) {
            throw new ApiError(404, "not found this product");
        }

        await Promise.all([
            OrderItems.create({
                order: order._id,
                product: product._id,
                title: product.title,
                image: product.thumbnail.url,
                price: product.finalPrice,
                quantity: item.quantity
            }),
            Product.updateOne({ _id: product._id }, { $inc: { stock: -item.quantity, buys: 1 } }),
        ])
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


export const getAllOrders = async (reqQuery: any) => {

    interface FilterType {
        status?: any;
        $or?: Array<{
            "shippingAddress.address"?: {
                $regex: string;
                $options: string;
            };
            "shippingAddress.city"?: {
                $regex: string;
                $options: string;
            };
            "user.name"?: {
                $regex: string;
                $options: string;
            };
            "user.email"?: {
                $regex: string;
                $options: string;
            };
            "user.phone"?: {
                $regex: string;
                $options: string;
            };
            "user._id"?: {
                $regex: string;
                $options: string;
            };
            _id?: any;
        }>;
    }
    interface SortType {
        updatedAt?: number;
        totalPrice?: number;
    }

    const { status, search, sort } = reqQuery;
    let filter: FilterType = {};
    let toSort: SortType = {}

    const page = reqQuery.page * 1 || 1;
    const limit = reqQuery.limit < 10 ? reqQuery.limit * 1 || 10 : 10;
    const skip = (page - 1) * limit


    if (status && status != "") {
        console.log(status)
        filter.status = status
    }

    if (sort && sort != "") {
        if (sort == "newest") {
            toSort.updatedAt = -1
        } else if (sort == "oldest") {
            toSort.updatedAt = 1
        } else if (sort == "cheapest") {
            toSort.totalPrice = 1
        } else if (sort == "priciest") {
            toSort.totalPrice = -1
        } else {
            toSort.updatedAt = -1
        }
    } else {
        toSort.updatedAt = -1
    }

    if (search) {
        const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        filter.$or = [
            {
                "shippingAddress.city": {
                    $regex: safeSearch,
                    $options: "i"
                }
            },
            {
                "shippingAddress.address": {
                    $regex: safeSearch,
                    $options: "i"
                }
            },
            {
                "user.name": {
                    $regex: safeSearch,
                    $options: "i"
                }
            },
            {
                "user.email": {
                    $regex: safeSearch,
                    $options: "i"
                }
            },
            {
                "user.phone": {
                    $regex: safeSearch,
                    $options: "i"
                }
            }
        ];

        // search by order id
        if (mongoose.Types.ObjectId.isValid(search)) {
            filter.$or.push({
                _id: new mongoose.Types.ObjectId(search)
            });
        }
    }

    const orders = await Order.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $match: filter
        },
        {
            $unwind: "$user"
        },
        {
            $project: {
                totalOrder: "$totalPrice",
                shippingAddress: 1,
                paymentMethod: 1,
                status: 1,
                "user.name": 1,
                "user.email": 1,
                "user._id": 1,
                "user.phone": 1,
                "user.profilePic": 1
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
        }
    ]);


    const total = await Order.countDocuments(filter).lean();

    return {
        orders,
        totalOrders: total,
        results: orders.length,
        totalPages: Math.ceil(total / limit),
        page
    };
}


export const getAllOrderDetailsForAdmin = async (orderId: any) => {
    const order = await Order.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(orderId)
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
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $project: {
                totalOrder: "$totalPrice",
                shippingAddress: 1,
                paymentMethod: 1,
                status: 1,
                items: 1,
                "user.name": 1,
                "user.email": 1,
                "user._id": 1,
                "user.phone": 1,
                "user.profilePic": 1
            }
        }
    ]);

    return order[0];
}
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    subTotal: {
        type: Number,
        required: true
    },
    delivery: {
        type: Number,
        required: true
    },
    taxPayed: {
        type: Number,
        required: true
    },

    totalPrice: {
        type: Number,
        required: true
    },

    shippingAddress: {
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        }
    },

    paymentMethod: {
        type: String,
        enum: ["cash", "card"],
        default: "cash"
    },

    status: {
        type: String,
        enum: [
            "pending",
            "shipped",
            "delivered",
            "cancelled"
        ],
        default: "pending"
    }

}, { timestamps: true });


const Order = mongoose.model("Order", orderSchema);

export default Order
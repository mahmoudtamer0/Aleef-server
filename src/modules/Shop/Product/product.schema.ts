import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },

    description: {
        type: String,
        required: true,
    },

    originalPrice: {
        type: Number,
        required: true,
    },

    finalPrice: {
        type: Number,
        required: true,
    },

    discount: {
        type: Number,
        default: 0,
    },

    category: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true
        }
    ],

    stock: {
        type: Number,
        default: 0,
    },

    buys: {
        type: Number,
        default: 0,
    },

    thumbnail: {
        url: String,
        cloudinary_id: String
    },

    productImages: [{
        url: { type: String },
        cloudinary_id: { type: String }
    }],

    averageRate: {
        type: Number,
        default: 5,
    },
    ratingsQuantity: {
        type: Number,
        default: 0,
    },

}, { timestamps: true });

productSchema.index({
    title: "text",
    finalPrice: 1,
    updatedAt: -1
});

const Product = mongoose.model("Product", productSchema);

export default Product
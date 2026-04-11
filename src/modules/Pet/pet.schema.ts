import mongoose from "mongoose";


const petSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ["dog", "cat", "bird", "other"],
    },
    breed: {
        type: String,
    },
    birthDate: {
        type: Date,
        required: true,
    },
    gender: {
        type: String,
        required: true,
        enum: ["male", "female"],
    },

    weight: {
        type: Number,
    },
    profilePic: {
        type: String,
        default: "https://res.cloudinary.com/ddgniiotg/image/upload/v1773086407/default_eop2qt.jpg"
    },
    cloudinary_id: {
        type: String,
        default: "default"
    },


}, { timestamps: true })

const Pet = mongoose.model("Pet", petSchema);

export default Pet
import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: "USER"
    },
    profilePic: {
        type: String,
        default: "https://res.cloudinary.com/ddgniiotg/image/upload/v1773086407/default_eop2qt.jpg"
    },
    cloudinary_id: {
        type: String,
        default: "default"
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },

    emailVerificationCode: String,
    emailVerificationExpires: Date,
    status: {
        type: String,
        enum: ["active", "banned"],
        default: "active"
    },

    banExpiresAt: Date
}, { timestamps: true })
// userSchema.index({ email: 1 },);
const User = mongoose.model("User", userSchema);

export default User
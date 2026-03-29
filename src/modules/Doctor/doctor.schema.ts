import mongoose from "mongoose";


const doctorSchema = new mongoose.Schema({
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
    license_number: {
        type: String,
        required: true,
        unique: true
    },
    city: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: "DOCTOR"
    },
    profilePic: {
        type: String,
        require: true
    },
    cloudinary_id: {
        type: String,
        require: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },

    emailVerificationCode: String,
    emailVerificationExpires: Date,
    status: {
        type: String,
        enum: ["active", "banned", "pending"],
        default: "pending"
    },

    banExpiresAt: Date
}, { timestamps: true })

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor
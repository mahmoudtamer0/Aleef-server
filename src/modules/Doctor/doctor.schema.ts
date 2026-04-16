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
    about: {
        type: String,
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
    specialization: {
        type: String,
        required: true,
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
    IdentityVerificationImage: {
        type: String,
        require: true
    },
    NationalIdFront: {
        type: String,
        require: true
    },
    NationalIdBack: {
        type: String,
        require: true
    },
    cloudinary_id: {
        type: String,
        require: true
    },
    rating: {
        type: Number,
        default: 5
    },
    ratingsCount: {
        type: Number,
        default: 0
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    workingHours: {
        sunday: {
            start: { type: String, default: "10:00" },
            end: { type: String, default: "18:00" },
            isAvailable: { type: Boolean, default: true }
        },
        monday: {
            start: { type: String, default: "10:00" },
            end: { type: String, default: "18:00" },
            isAvailable: { type: Boolean, default: true }
        },
        tuesday: {
            start: { type: String, default: "10:00" },
            end: { type: String, default: "18:00" },
            isAvailable: { type: Boolean, default: true }
        },
        wednesday: {
            start: { type: String, default: "10:00" },
            end: { type: String, default: "18:00" },
            isAvailable: { type: Boolean, default: true }
        },
        thursday: {
            start: { type: String, default: "10:00" },
            end: { type: String, default: "18:00" },
            isAvailable: { type: Boolean, default: true }
        },
        friday: {
            start: { type: String, default: "10:00" },
            end: { type: String, default: "18:00" },
            isAvailable: { type: Boolean, default: false }
        },
        saturday: {
            start: { type: String, default: "10:00" },
            end: { type: String, default: "18:00" },
            isAvailable: { type: Boolean, default: true }
        },
    },

    slotDuration: {
        type: Number,
        default: 30, // minutes
    },

    emailVerificationCode: String,
    emailVerificationExpires: Date,
    status: {
        type: String,
        enum: ["active", "banned", "pending"],
        default: "pending"
    },

    appointmentFee: {
        type: Number,
        required: true,
    },

    banExpiresAt: Date
}, { timestamps: true })

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor
import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
    {
        pet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pet",
            required: true,
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor", //
            required: true,
        },

        date: {
            type: Date,
            required: true,
        },

        time: {
            type: String,
            required: true,
        },

        reason: {
            type: String,
        },

        status: {
            type: String,
            enum: ["pending", "confirmed", "rejected", "completed", "cancelled"],
            default: "pending",
        },

        notes: {
            type: String,
        },

        price: {
            type: Number,
        },

        rejectionReason: {
            type: String,
            default: null,
            trim: true
        },

        expiresAt: {
            type: Date,
            default: null
        }
    },

    { timestamps: true }
);

appointmentSchema.index({
    doctor: 1,
    status: 1
});


export default mongoose.model("Appointment", appointmentSchema);
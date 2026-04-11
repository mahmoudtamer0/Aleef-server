import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema(
    {
        pet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pet",
            required: true,
        },

        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        condition: {
            type: String,
            required: true,
        },

        treatment: String,

        notes: String,

        attachments: [String], // صور / تقارير

        date: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

export default mongoose.model("MedicalRecord", medicalRecordSchema);
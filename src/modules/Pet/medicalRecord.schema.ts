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
            ref: "Doctor",
        },

        condition: {
            type: String,
            required: true,
        },

        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },

        attachments: [String],

        date: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

medicalRecordSchema.index({ pet: 1, updatedAt: -1 });

export default mongoose.model("MedicalRecord", medicalRecordSchema);
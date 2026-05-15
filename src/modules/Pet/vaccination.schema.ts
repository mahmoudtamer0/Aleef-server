// models/vaccination.model.ts

import mongoose from "mongoose";

const vaccinationSchema = new mongoose.Schema(
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

        type: {
            type: String,
            enum: ["upcomming", "vaccined"],
        },

        vaccineName: {
            type: String,
            required: true,
            trim: true,
        },

        dose: {
            type: String,
            trim: true,
        },

        notes: {
            type: String,
            trim: true,
        },

        vaccinatedAt: {
            type: Date,
        },

        nextDueDate: {
            type: Date,
        },

    },
    {
        timestamps: true,
    }
);

vaccinationSchema.index({ pet: 1, vaccineName: 1 });
vaccinationSchema.index({ pet: 1, type: 1 });

export default mongoose.model("Vaccination", vaccinationSchema);
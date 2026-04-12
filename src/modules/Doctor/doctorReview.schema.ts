import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true,
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        rate: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },

        comment: {
            type: String,
            trim: true,
            maxlength: 1000,
        },

        // appointment: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "Appointment",
        // },
    },
    { timestamps: true }
);


const DoctorReview = mongoose.model("DoctorReviews", reviewSchema);

export default DoctorReview
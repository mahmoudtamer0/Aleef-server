import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    device: {
        type: String,
        default: "unknown"
    },

    createdAt: {
        type: Date,
        default: Date.now,
        expires: 30 * 24 * 60 * 60
    }
}, { timestamps: true });
sessionSchema.index({ userId: 1 })

const Session = mongoose.model("Session", sessionSchema);

export default Session
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

    fcmToken: {
        type: String,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now,
        expires: 5 * 24 * 60 * 60
    }
}, { timestamps: true });

const Session = mongoose.model("Session", sessionSchema);

export default Session
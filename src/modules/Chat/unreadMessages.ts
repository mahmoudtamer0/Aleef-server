import mongoose from "mongoose";


const unreadMessagesSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat"
    },
    lastMessage: {
        type: String,
        default: ""
    },

    unreadCount: {
        type: Number,
        default: 0
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

const UnreadMessage = mongoose.model("UnreadMessage", unreadMessagesSchema);

export default UnreadMessage;
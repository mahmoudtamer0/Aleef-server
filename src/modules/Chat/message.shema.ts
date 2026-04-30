import mongoose from "mongoose";





const messageSchema = new mongoose.Schema({
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "senderModel"
    },

    senderModel: {
        type: String,
        required: true,
        enum: ["User", "Doctor", "Bot"]
    },
    chatType: {
        type: String,
        enum: ["personal", "chatbot"], default: "private"
    },
    isDeleted: { type: Boolean, default: false },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

messageSchema.index(
    { createdAt: 1 },
    {
        expireAfterSeconds: 60 * 60 * 24 * 2,
        partialFilterExpression: {
            chatType: "chatbot"
        }
    }
);


const Message = mongoose.model("Message", messageSchema);

export default Message;
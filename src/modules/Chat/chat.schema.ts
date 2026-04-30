import mongoose from "mongoose";


const chatSchema = new mongoose.Schema({
    members: [
        {
            memberId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                refPath: "members.memberModel"
            },
            memberModel: {
                type: String,
                required: true,
                enum: ["User", "Doctor", "Bot"]
            }
        }
    ],
    chatType: {
        type: String,
        require: true,
        enum: ["personal", "chatbot"], default: "private"
    },

    status: {
        type: String,
        require: true,
        enum: ["active", "inactive"], default: "active"
    },

    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    }
}, { timestamps: true });



const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
import Chat from "../modules/Chat/chat.schema";
import Message from "../modules/Chat/message.shema";
import ApiError from "./ApiError";


interface CreateMessageInput {
    chatId: string;
    sender: string;
    senderModel: "User" | "Doctor" | "Bot";
    message: string;
}


export const createMessage = async ({ chatId, sender, senderModel, message }: CreateMessageInput) => {

    const chat = await Chat.findById(chatId);

    if (!chat) {
        throw new ApiError(404, "Chat not found");
    }

    if (!chat.members.map(id => id.memberId.toString()).includes(sender)) {
        throw new ApiError(403, "Not a member of this chat");
    }

    const creatMessage = await Message.create({
        chatId,
        sender: sender,
        senderModel: senderModel,
        text: message
    });

    return creatMessage;
};
import Chat from "./chat.schema";
import Message from "./message.shema";
import ApiError from "../../utils/ApiError";

export const getChats = async (user: any) => {

    const chats = await Chat.find({
        "members.memberId": user.id
    })
        .populate({
            path: "lastMessage",
            select: "text createdAt"
        })
        .populate({
            path: "members.memberId",
            select: "name profilePic"
        })
        .sort({ updatedAt: -1 })
        .lean();

    const formattedChats = chats.map(chat => {

        const otherMember = chat.members.find(
            (m: any) => m.memberId._id.toString() !== user.id
        );

        return {
            id: chat._id,
            lastMessage: chat.lastMessage,
            person: otherMember?.memberId,


        };
    });

    return formattedChats;
};
import Chat from "./chat.schema";
import Message from "./message.shema";
import UnreadMessage from "./unreadMessages";
import { BOT_ID } from "../../constants/bot";

export const getChats = async (user: any) => {

    const chats = await Chat.find({
        "members.memberId": user.id,
        chatType: { $ne: "chatbot" }
    })
        .populate({
            path: "lastMessage"
        })
        .populate({
            path: "members.memberId",
            select: "name profilePic"
        })
        .sort({ updatedAt: -1 })
        .lean();

    const unread = await UnreadMessage.find({
        userId: user.id
    }).lean();


    const unreadMap = new Map(
        unread.map(u => [u?.chatId?.toString(), u])
    );

    const formattedChats = chats.map(chat => {

        const otherMember = chat.members.find(
            (m: any) => m.memberId._id.toString() !== user.id
        );

        const member = otherMember?.memberId as any;

        const unreadData = unreadMap.get(chat._id.toString());

        return {
            id: chat._id,

            person: member
                ? {
                    _id: member._id,
                    name: member.name,
                    profilePic: member.profilePic
                }
                : null,

            lastMessage: chat.lastMessage,

            unreadCount: unreadData?.unreadCount || 0
        };
    });

    return formattedChats;
};


export const getChatMessages = async (chatId: any, user: any) => {

    const chat = await Chat.findById(chatId)
        .populate({
            path: "members.memberId",
            select: "name profilePic"
        })
        .lean();

    if (!chat) throw new Error("Chat not found");

    const messages = await Message.find(
        { chatId },
        { __v: false }
    )
        .populate({
            path: "sender",
            select: "name profilePic"
        })
        .sort({ createdAt: 1 })
        .lean();

    const otherMember = chat.members.find(
        (m: any) => m.memberId._id.toString() !== user.id
    );


    const member = otherMember?.memberId as any;

    const otherUser = otherMember
        ? {
            _id: member._id,
            name: member.name,
            profilePic: member.profilePic,
            role: otherMember.memberModel
        }
        : null;

    const messagesToSend = messages.map(message => {

        const sender = message.sender as any;

        return {
            isDeleted: message.isDeleted,
            _id: message._id,
            chatId: message.chatId,
            sender: sender
                ? {
                    _id: sender._id,
                    name: sender.name,
                    profilePic: sender.profilePic
                }
                : null,
            text: message.text,
            createdAt: message.createdAt
        };
    });

    return {
        chatId,
        user: otherUser,
        messages: messagesToSend
    };
};


export const getChatbotMessages = async (user: any) => {

    let chat = await Chat.findOne({
        chatType: "chatbot",
        "members.memberId": user.id
    })

    if (!chat) {
        chat = await Chat.create({
            members: [
                { memberId: user.id, memberModel: "User" },
                { memberId: BOT_ID, memberModel: "Bot" }
            ],
            chatType: "chatbot"
        })
    }

    await chat.populate({
        path: "members.memberId",
        select: "name profilePic"
    })



    const messages = await Message.find(
        { chatId: chat._id },
        { __v: false }
    )
        .sort({ createdAt: 1 })
        .lean();

    // const bot = botMember?.memberId as any;

    const messagesToSend = messages.map(message => {

        const sender = message.sender as any;

        return {
            isDeleted: message.isDeleted,
            _id: message._id,
            chatId: message.chatId,
            sender: sender
                ? {
                    _id: sender._id,
                }
                : null,
            text: message.text,
            createdAt: message.createdAt
        };
    });

    return {
        chatId: chat._id,
        messages: messagesToSend
    };
}; 
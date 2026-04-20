import Chat from "../modules/Chat/chat.schema";
import UnreadMessage from "../modules/Chat/unreadMessages";
import { createMessage } from "../utils/createMessage";


export = (io: any, socket: any) => {


    socket.on("join_chat", async (chatId: string) => {
        socket.join(chatId);
        const member = await UnreadMessage.findOne({
            userId: socket.user.id,
            chatId
        });

        if (!member) {
            await UnreadMessage.create({
                userId: socket.user.id,
                chatId,
                lastMessage: "",
                unreadCount: 0
            });
        } else {
            member.unreadCount = 0;
            await member.save();
        }
    });

    socket.on("send_message", async (data: { chatId: string; message: string }) => {
        try {
            const model = socket.user.role === "DOCTOR" ? "Doctor" : "User";

            if (data.message.trim().length < 1) {
                io.to(socket.user.id).emit("error_message", {
                    errMessage: "you can't send empty message :)"
                });
                return;
            }

            const message = await createMessage({
                chatId: data.chatId,
                sender: socket.user.id,
                senderModel: model,
                message: data.message,
            });


            const populatedMessage = await message.populate({
                path: "sender",
                select: "name profilePic"
            });
            const sender = populatedMessage.sender as any;


            io.to(data.chatId).emit("receive_message", {
                _id: message._id,
                text: message.text,
                sender: {
                    _id: sender._id,
                    name: sender.name,
                    profilePic: sender.profilePic
                },
                chatId: data.chatId,
                createdAt: message.createdAt,
                isDeleted: message.isDeleted,
            });

            const chat = await Chat.findById(data.chatId);

            if (!chat) return;

            const otherUser = chat.members.find(
                (m: any) => m.memberId.toString() !== socket.user.id
            );

            if (!otherUser) return;







            await UnreadMessage.updateOne(
                {
                    userId: otherUser.memberId,
                    chatId: data.chatId
                },
                {
                    $inc: { unreadCount: 1 },
                    $set: { lastMessage: populatedMessage.text }
                },
                { upsert: true }
            );

            chat.lastMessage = populatedMessage._id;
            await chat.save();


            io.to(otherUser.memberId.toString()).emit("chat_updated", {
                chatId: data.chatId,
                lastMessage: {
                    _id: populatedMessage._id,
                    text: populatedMessage.text,
                    createdAt: populatedMessage.createdAt,
                    sender: populatedMessage.sender
                },
                unreadIncrement: 1
            });

            io.to(socket.user.id.toString()).emit("chat_updated", {
                chatId: data.chatId,
                lastMessage: {
                    _id: populatedMessage._id,
                    text: populatedMessage.text,
                    createdAt: populatedMessage.createdAt,
                    sender: populatedMessage.sender
                },
                unreadIncrement: 0
            });

        } catch (err) {
            console.error("Error sending message:", err);
        }
    })

};

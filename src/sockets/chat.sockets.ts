import Chat from "../modules/Chat/chat.schema";
import Doctor from "../modules/Doctor/doctor.schema";
import User from "../modules/User/user.schema";
import UnreadMessage from "../modules/Chat/unreadMessages";
import { createMessage } from "../utils/createMessage";


export = (io: any, socket: any) => {

    socket.on("join_chat", async (chatId: string) => {
        console.log("User joined chat:", chatId);

        (socket as any).currentChat = chatId;

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

    socket.on("leave_chat", (chatId: string) => {
        socket.leave(chatId);
        (socket as any).currentChat = null;
    });

    socket.on("send_message", async (data: { chatId: string; message: string }) => {
        try {
            const model: "Doctor" | "User" =
                socket.user.role === "DOCTOR" ? "Doctor" : "User";

            if (data.message.trim().length < 1) {
                io.to(socket.user.id).emit("error_message", {
                    errMessage: "you can't send empty message :)"
                });
                return;
            }
            const chat = await Chat.findById(data.chatId);
            if (!chat) return;

            const isMember = chat.members.some(
                (m: any) => m.memberId.toString() === socket.user.id
            );

            if (!isMember) return;

            const message = await createMessage({
                chatId: data.chatId,
                sender: socket.user.id,
                senderModel: model,
                message: data.message,
                chatType: "personal"
            });


            const populatedMessage = await message.populate({
                path: "sender",
                select: "name profilePic"
            });
            const sender = populatedMessage.sender as any;

            socket.emit("receive_message", {
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


            const otherUser = chat.members.find(
                (m: any) => m.memberId.toString() !== socket.user.id
            );

            if (!otherUser) return;

            const sockets = await io.in(`user:${otherUser.memberId.toString()}`).fetchSockets();

            const isInSameChat = sockets.some(
                (s: any) => (s as any).currentChat === data.chatId
            );

            const isOnline = sockets.length > 0;



            if (isInSameChat) {
                io.to(`user:${otherUser.memberId.toString()}`).emit("receive_message", {
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

            } else if (isOnline) {
                const unread = await UnreadMessage.findOneAndUpdate(
                    {
                        userId: otherUser.memberId,
                        chatId: data.chatId
                    },
                    {
                        $inc: { unreadCount: 1 },
                        $set: { lastMessage: populatedMessage.text }
                    },
                    { new: true, upsert: true }
                );


                io.to(`user:${otherUser.memberId.toString()}`).emit("chat_updated", {
                    id: data.chatId,
                    person: {
                        _id: sender._id,
                        name: sender.name,
                        profilePic: sender.profilePic
                    },
                    lastMessage: {
                        _id: populatedMessage._id,
                        text: populatedMessage.text,
                        createdAt: populatedMessage.createdAt,
                        sender: populatedMessage.sender
                    },
                    unreadCount: unread.unreadCount,
                    updatedAt: chat.updatedAt
                });

                // io.to(`user:${otherUserId}`).emit("notification", { });

            } else {
                await UnreadMessage.findOneAndUpdate(
                    {
                        userId: otherUser.memberId,
                        chatId: data.chatId
                    },
                    {
                        $inc: { unreadCount: 1 },
                        $set: { lastMessage: populatedMessage.text }
                    },
                    { new: true, upsert: true }
                );
                // await sendNotification();
            }

            chat.lastMessage = populatedMessage._id;
            await chat.save();



            const otherMemberProfile =
                otherUser.memberModel === "Doctor"
                    ? await Doctor.findById(otherUser.memberId)
                        .lean()
                        .select("name profilePic")
                    : await User.findById(otherUser.memberId)
                        .lean()
                        .select("name profilePic");


            io.to(`user:${socket.user.id}`).emit("chat_updated", {
                id: data.chatId,
                person: {
                    _id: otherUser.memberId,
                    name: otherMemberProfile?.name || "Unknown",
                    profilePic: otherMemberProfile?.profilePic || null
                },
                lastMessage: {
                    _id: populatedMessage._id,
                    text: populatedMessage.text,
                    createdAt: populatedMessage.createdAt,
                    sender: populatedMessage.sender
                },
                unreadCount: 0,
                updatedAt: chat.updatedAt
            });

        } catch (err) {
            console.error("Error sending message:", err);
        }
    })


};

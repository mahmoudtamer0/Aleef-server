import { response } from "express";
import { BOT_ID } from "../constants/bot";
import Chat from "../modules/Chat/chat.schema";
import UnreadMessage from "../modules/Chat/unreadMessages";
import { createMessage } from "../utils/createMessage";


export = (io: any, socket: any) => {


    socket.on("chat_send", async (data: { message: string }) => {
        try {
            console.log("Received message from client:", data.message);

            if (socket.user.role === "DOCTOR") {
                io.to(socket.user.id).emit("error_message", {
                    errMessage: "Doctors can't chat with chatbot :)"
                });
                return;
            }

            const res = await fetch("https://chatbot-production-a866.up.railway.app/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    msg: data.message
                })
            })




            let chat = await Chat.findOne({
                chatType: "chatbot",
                "members.memberId": socket.user.id
            });

            if (!chat) {
                chat = await Chat.create({
                    chatType: "chatbot",
                    members: [
                        {
                            memberId: socket.user.id,
                            memberModel: "User"
                        }
                    ]

                });
            }

            const message = await createMessage({
                chatId: chat._id.toString(),
                sender: socket.user.id,
                senderModel: "User",
                message: data.message,
            });


            // if (data.message.trim().length < 1) {
            //     io.to(socket.user.id).emit("error_message", {
            //         errMessage: "you can't send empty message :)"
            //     });
            //     return;
            // }






            const dataTofetch: any = await res.json();
            console.log("dataTofetch:", dataTofetch)
            io.to(socket.user.id).emit("chat_response", {
                message: dataTofetch?.Response
            });


        } catch (err) {
            console.error("Error sending message:", err);
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
                messageId: message._id,
                _id: socket.user.id,
                text: populatedMessage.text,
                senderId: sender._id,
                senderProfilePic: sender.profilePic,
                chatId: data.chatId
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

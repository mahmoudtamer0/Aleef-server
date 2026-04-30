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

            const botresponse = fetch("https://chatbot-production-a866.up.railway.app/chat", {
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
                        },
                        {
                            memberId: BOT_ID,
                            memberModel: "Bot"
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

            const res = await botresponse;
            const dataTofetch: any = await res.json();

            io.to(socket.user.id).emit("chat_response", {
                message: dataTofetch?.Response
            });

            await createMessage({
                chatId: chat._id.toString(),
                sender: BOT_ID.toString(),
                senderModel: "Bot",
                message: dataTofetch?.Response,
            });

            return;


        } catch (err) {
            console.error("Error sending message:", err);
        }
    });


};

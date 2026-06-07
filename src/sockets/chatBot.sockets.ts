import { BOT_ID } from "../constants/bot";
import pool from "../db";


export = (io: any, socket: any) => {


    // socket.on("chat_send", async (data: { message: string }) => {
    //     try {
    //         const chatBotApiKey = process.env["CHATBOT_API_KEY"];

    //         if (!chatBotApiKey) {
    //             io.to(socket.user.id).emit("error_message", {
    //                 errMessage: "Chatbot API key is not configured"
    //             });
    //             return;
    //         }
    //         if (socket.user.role === "DOCTOR") {
    //             io.to(socket.user.id).emit("error_message", {
    //                 errMessage: "Doctors can't chat with chatbot :)"
    //             });
    //             return;
    //         }


    //         const botresponse = fetch(chatBotApiKey, {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json"
    //             },
    //             body: JSON.stringify({
    //                 msg: data.message
    //             })
    //         })




    //         let chat = await Chat.findOne({
    //             chatType: "chatbot",
    //             "members.memberId": socket.user.id
    //         }).lean();


    //         if (!chat) {
    //             chat = await Chat.create({
    //                 chatType: "chatbot",
    //                 members: [
    //                     {
    //                         memberId: socket.user.id,
    //                         memberModel: "User"
    //                     },
    //                     {
    //                         memberId: BOT_ID,
    //                         memberModel: "Bot"
    //                     }
    //                 ]
    //             });
    //         }

    //         const message = await createMessage({
    //             chatId: chat._id.toString(),
    //             sender: socket.user.id,
    //             senderModel: "User",
    //             message: data.message,
    //             chatType: "chatbot"
    //         });


    //         socket.emit("chat_response", {
    //             _id: message._id,
    //             text: message.text,
    //             sender: {
    //                 _id: message.sender,
    //             },
    //             createdAt: message.createdAt,
    //             isDeleted: message.isDeleted,
    //         });

    //         const res = await botresponse;
    //         const dataTofetch: any = await res.json();


    //         socket.emit("chat_response", {
    //             message: dataTofetch?.Response,
    //             sender: {
    //                 _id: BOT_ID,
    //             },
    //             createdAt: message.createdAt,
    //             isDeleted: false,
    //         });

    //         await createMessage({
    //             chatId: chat._id.toString(),
    //             sender: BOT_ID.toString(),
    //             senderModel: "Bot",
    //             message: dataTofetch?.Response,
    //             chatType: "chatbot"
    //         });

    //         return;


    //     } catch (err) {
    //         console.error("Error sending message:", err);
    //     }
    // });


    socket.on("chat_send", async (data: { message: string }) => {
        try {
            const chatBotApiKey = process.env["CHATBOT_API_KEY"];

            if (!chatBotApiKey) {
                io.to(socket.user.id).emit("error_message", {
                    errMessage: "Chatbot API key is not configured"
                });
                return;
            }
            if (socket.user.role === "DOCTOR") {
                io.to(socket.user.id).emit("error_message", {
                    errMessage: "Doctors can't chat with chatbot :)"
                });
                return;
            }


            const botresponse = fetch(chatBotApiKey, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    msg: data.message
                })
            })





            let chat = await pool.query(
                `SELECT c.id FROM chats c
                 JOIN chat_members cm ON c.id = cm."chatId"
                 WHERE c.chat_type = 'chatbot' AND cm.member_id = $1`,
                [socket.user.id]
            );

            if (!chat.rows.length) {
                const client = await pool.connect();
                try {
                    await client.query("BEGIN");
                    chat = await client.query(
                        `INSERT INTO chats (chat_type) VALUES ('chatbot') RETURNING id`
                    );

                    await client.query(
                        `INSERT INTO chat_members ("chatId", member_id, member_model) VALUES ($1, $2, 'User'), ($1, $3, 'Bot')`,
                        [chat.rows[0].id, socket.user.id, BOT_ID]
                    );

                    await client.query("COMMIT");
                } catch (err) {
                    await client.query("ROLLBACK");
                    throw err;
                } finally {
                    client.release()
                }

            }


            const message = await pool.query(
                `INSERT INTO messages ("chatId", sender, sender_model, chat_type, text)
                 VALUES ($1, $2, $3, 'chatbot', $4)
                 RETURNING id, "chatId", sender, sender_model, text, "isDeleted", "createdAt"`,
                [chat.rows[0].id, socket.user.id, "User", data.message]
            );

            socket.emit("chat_response", {
                _id: message.rows[0].id,
                text: message.rows[0].text,
                sender: {
                    id: socket.user.id,
                },
                createdAt: message.rows[0].createdAt,
                isDeleted: message.rows[0].isDeleted,
            });

            const res = await botresponse;
            const dataTofetch: any = await res.json();

            const botText = dataTofetch?.Response;
            if (!botText) {
                socket.emit("error_message", { errMessage: "Chatbot didn't respond" });
                return;
            }

            socket.emit("chat_response", {
                message: botText,
                sender: { id: BOT_ID },
                createdAt: new Date(),
                isDeleted: false,
            });

            await pool.query(
                `INSERT INTO messages ("chatId", sender, sender_model, chat_type, text)
                VALUES ($1, $2, 'Bot', 'chatbot', $3)`,
                [chat.rows[0].id, BOT_ID, botText]
            );

            return;


        } catch (err) {
            console.error("Error sending message:", err);
        }
    });

};

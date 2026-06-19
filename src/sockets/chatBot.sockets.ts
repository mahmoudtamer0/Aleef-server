import { clearCache } from "../cache";
import { BOT_ID } from "../constants/bot";
import pool from "../db";


export = (io: any, socket: any) => {

    socket.on("chat_send", async (data: { message: string, image: string }) => {
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

            console.log("data:", data);

            const botresponse = fetch(chatBotApiKey, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    msg: data.message ?? "",
                    image_url: data.image ?? "",
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

            socket.emit("chat_response", {
                _id: crypto.randomUUID(),
                text: data.message,
                sender: {
                    id: socket.user.id,
                },
                image: data.image || null,
                createdAt: new Date(),
                isDeleted: new Date(),
            });

            await pool.query(
                `INSERT INTO messages ("chatId", sender, sender_model, chat_type, text,image)
                 VALUES ($1, $2, $3, 'chatbot', $4, $5)
                 RETURNING id, "chatId", sender, sender_model, text, "isDeleted", "createdAt"`,
                [chat.rows[0].id, socket.user.id, "User", data.message, data.image ?? null]
            );


            clearCache(`chatBotMessages_${socket.user.id}_${chat.rows[0].id}`);

            // const checkPlan = await pool.query(`SELECT id,
            //     COUNT(*) OVER() AS total_count
            //     FROM messages
            //     WHERE "chatId" = $1 AND sender_model = 'Bot' AND "createdAt" >= NOW() - INTERVAL '1 day'
            //     `, [chat.rows[0].id]);


            // const count = parseInt(checkPlan.rows[0]?.total_count ?? "0");

            // if (count >= 10) {
            //     socket.emit("chat_response", {
            //         message: "You have reached the daily limit of 10 messages",
            //         sender: { id: BOT_ID },
            //         createdAt: new Date(),
            //         isDeleted: false,
            //     });
            //     return;
            // }



            const res = await botresponse;
            const dataTofetch: any = await res.json();

            const botText = dataTofetch?.Response;
            if (!botText) {
                socket.emit("error_message", {
                    message: "Chatbot didn't respond",
                    sender: { id: BOT_ID },
                    createdAt: new Date(),
                    isDeleted: false,
                });
                return;
            }

            clearCache(`chatBotMessages_${socket.user.id}_${chat.rows[0].id}`);

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
            socket.emit("error_message", {
                _id: "1",
                text: "Chatbot didn't respond",
                sender: {
                    id: BOT_ID,
                },
                createdAt: new Date(),
                isDeleted: false,
            });
        }
    });

};

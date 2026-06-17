import { clearCache } from "../cache";
import pool from "../db";
import { sendNotificationService } from "../utils/notifications/sendNotificationService";


export = (io: any, socket: any) => {

    socket.on("join_chat", async (chatId: string) => {
        const member = await pool.query(
            `SELECT 1 FROM chat_members WHERE "chatId" = $1 AND member_id = $2`,
            [chatId, socket.user.id]
        );
        if (!member.rowCount) return;

        (socket as any).currentChat = chatId;
        socket.join(chatId);

        await pool.query(
            `INSERT INTO unread_messages (user_id, "chatId", "lastMessage", "unreadCount")
             VALUES ($1, $2, '', 0)
             ON CONFLICT ("chatId", user_id) DO UPDATE SET "unreadCount" = 0
             RETURNING id`,
            [socket.user.id, chatId]
        );
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
            const chatResult = await pool.query(
                `SELECT c.id, c."updatedAt", cm.member_id AS other_member_id, cm.member_model AS other_member_model,
                CASE WHEN cm.member_model = 'User' THEN
                    jsonb_build_object('id', ou.id, 'name', ou.name, 'profilePic', ou."profilePic")
                WHEN cm.member_model = 'Doctor' THEN
                    jsonb_build_object('id', od.id, 'name', od.name, 'profilePic', od."profilePic")
                END AS other_member_profile,
                CASE WHEN my_cm.member_model = 'User' THEN
                    jsonb_build_object('id', mu.id, 'name', mu.name, 'profilePic', mu."profilePic")
                WHEN my_cm.member_model = 'Doctor' THEN
                    jsonb_build_object('id', md.id, 'name', md.name, 'profilePic', md."profilePic")
                END AS sender_profile
                 FROM chats c
                 JOIN chat_members my_cm ON c.id = my_cm."chatId" AND my_cm.member_id = $1
                 JOIN chat_members cm ON c.id = cm."chatId" AND cm.member_id != $1
                 LEFT JOIN users ou ON cm.member_model = 'User' AND cm.member_id = ou.id
                 LEFT JOIN doctors od ON cm.member_model = 'Doctor' AND cm.member_id = od.id
                 LEFT JOIN users mu ON my_cm.member_model = 'User' AND my_cm.member_id = mu.id
                 LEFT JOIN doctors md ON my_cm.member_model = 'Doctor' AND my_cm.member_id = md.id
                 WHERE c.id = $2`,
                [socket.user.id, data.chatId]
            );

            if (!chatResult.rows.length) return;

            const { other_member_id } = chatResult.rows[0];

            const messageResult = await pool.query(
                `INSERT INTO messages ("chatId", sender, sender_model, chat_type, text)
                 VALUES ($1, $2, $3, 'personal', $4)
                 RETURNING id, "chatId", sender, sender_model, text, "isDeleted", "createdAt"`,
                [data.chatId, socket.user.id, model, data.message]
            );

            const message = messageResult.rows[0];



            const sender = chatResult.rows[0].sender_profile;


            await pool.query(
                `UPDATE chats SET "lastMessage" = $1, "updatedAt" = NOW() WHERE id = $2`,
                [message.id, data.chatId]
            );

            const formattedMessage = {
                id: message.id,
                text: message.text,
                sender: { id: sender.id, name: sender.name, profilePic: sender.profilePic },
                chatId: data.chatId,
                createdAt: message.createdAt,
                isDeleted: message.isDeleted,
            };


            clearCache(`chats:${socket.user.id}`);
            clearCache(`chat_messages_${socket.user.id}_${data.chatId}`);

            socket.emit("receive_message", formattedMessage);


            const otherProfile = chatResult.rows[0].other_member_profile;


            const sockets = await io.in(`user:${other_member_id}`).fetchSockets();
            const isInSameChat = sockets.some((s: any) => s.currentChat === data.chatId);
            const isOnline = sockets.length > 0;


            clearCache(`chats:${other_member_id}`);
            clearCache(`chat_messages_${other_member_id}_${data.chatId}`);
            clearCache(`all_chats:`);

            if (isInSameChat) {
                io.to(`user:${other_member_id}`).emit("receive_message", formattedMessage);

            } else if (isOnline) {



                const unreadResult = await pool.query(
                    `INSERT INTO unread_messages ("chatId", user_id, "lastMessage", "unreadCount")
                     VALUES ($1, $2, $3, 1)
                     ON CONFLICT ("chatId", user_id) DO UPDATE SET
                        "unreadCount" = unread_messages."unreadCount" + 1,
                        "lastMessage" = $3
                     RETURNING "unreadCount"`,
                    [data.chatId, other_member_id, message.text]
                );

                io.to(`user:${other_member_id}`).emit("chat_updated", {
                    id: data.chatId,
                    person: { _id: sender.id, name: sender.name, profilePic: sender.profilePic },
                    lastMessage: formattedMessage,
                    unreadCount: unreadResult.rows[0].unreadCount,
                    updatedAt: new Date()
                })



                io.to(`user:${other_member_id}`).emit("notification", {
                    type: "MESSAGE",
                    title: sender.name,
                    body: message.text,
                    data: {
                        type: "chat",
                        chatId: data.chatId,
                    }
                })

                const otherModel = model === "Doctor" ? "USER" : "DOCTOR";

                sendNotificationService(
                    other_member_id,
                    otherModel,
                    sender.name,
                    formattedMessage.text
                );


            } else {
                await pool.query(
                    `INSERT INTO unread_messages ("chatId", user_id, "lastMessage", "unreadCount")
                     VALUES ($1, $2, $3, 1)
                     ON CONFLICT ("chatId", user_id) DO UPDATE SET
                        "unreadCount" = unread_messages."unreadCount" + 1,
                        "lastMessage" = $3`,
                    [data.chatId, other_member_id, message.text]
                );

                const otherModel = model === "Doctor" ? "USER" : "DOCTOR";

                sendNotificationService(
                    other_member_id,
                    otherModel,
                    sender.name,
                    formattedMessage.text
                );
            }

            io.to(`user:${socket.user.id}`).emit("chat_updated", {
                id: data.chatId,
                person: { _id: other_member_id, name: otherProfile?.name || "Unknown", profilePic: otherProfile?.profilePic || null },
                lastMessage: formattedMessage,
                unreadCount: 0,
                updatedAt: new Date()
            });
        } catch (err) {
            console.error("Error sending message:", err);
        }
    })


};

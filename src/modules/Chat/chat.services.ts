import { BOT_ID } from "../../constants/bot";
import pool from "../../db";
import { getCache, setCache } from "../../cache";
import ApiError from "../../utils/ApiError";

export const getChats = async (user: any) => {

    const cacheKey = `chats:${user.id}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return cached;
    }

    const result = await pool.query(
        `SELECT
            c.id,
            c."updatedAt",
            jsonb_build_object(
                'id', msg.id,
                'chatId', msg."chatId",
                'sender', msg.sender,
                'senderModel', msg.sender_model,
                'chatType', msg.chat_type,
                'isDeleted', msg."isDeleted",
                'text', msg.text,
                'createdAt', msg."createdAt"
            ) AS "lastMessage",
            CASE
                WHEN cm.member_model = 'User' THEN
                    jsonb_build_object('id', u.id, 'name', u.name, 'profilePic', u."profilePic")
                WHEN cm.member_model = 'Doctor' THEN
                    jsonb_build_object('id', d.id, 'name', d.name, 'profilePic', d."profilePic")
            END AS person,
            COALESCE(um."unreadCount", 0) AS "unreadCount"
        FROM chats c
        JOIN chat_members my_cm ON c.id = my_cm."chatId" AND my_cm.member_id = $1
        JOIN chat_members cm ON c.id = cm."chatId" AND cm.member_id != $1
        LEFT JOIN users u ON cm.member_model = 'User' AND cm.member_id = u.id
        LEFT JOIN doctors d ON cm.member_model = 'Doctor' AND cm.member_id = d.id
        LEFT JOIN messages msg ON c."lastMessage" = msg.id
        LEFT JOIN unread_messages um ON um."chatId" = c.id AND um.user_id = $1
        WHERE c.chat_type = 'personal'
        ORDER BY c."updatedAt" DESC`,
        [user.id]
    );

    const response = result.rows

    setCache(`chats:${user.id}`, response, 300);

    return response;
};


export const getChatMessages = async (chatId: any, user: any) => {

    const cacheKey = `chat_messages_${user.id}_${chatId}`;
    const cached = getCache(cacheKey);

    if (cached) {
        return cached;
    }

    const chatResult = await pool.query(
        `SELECT cm.member_id, cm.member_model,
            CASE
                WHEN cm.member_model = 'User' THEN
                    jsonb_build_object('id', u.id, 'name', u.name, 'profilePic', u."profilePic", 'role', cm.member_model)
                WHEN cm.member_model = 'Doctor' THEN
                    jsonb_build_object('id', d.id, 'name', d.name, 'profilePic', d."profilePic", 'role', cm.member_model)
            END AS member
        FROM chat_members cm
        LEFT JOIN users u ON cm.member_model = 'User' AND cm.member_id = u.id
        LEFT JOIN doctors d ON cm.member_model = 'Doctor' AND cm.member_id = d.id
        WHERE cm."chatId" = $1 AND cm.member_id != $2`,
        [chatId, user.id]
    );

    if (!chatResult.rows.length) throw new ApiError(404, "Chat not found");

    const otherUser = chatResult.rows[0].member;

    const messagesResult = await pool.query(
        `SELECT
            m.id,
            m."chatId" AS "chatId",
            m."isDeleted" AS "isDeleted",
            m.text,
            m."createdAt",
            CASE
                WHEN m.sender_model = 'User' THEN
                    jsonb_build_object('id', u.id, 'name', u.name, 'profilePic', u."profilePic")
                WHEN m.sender_model = 'Doctor' THEN
                    jsonb_build_object('id', d.id, 'name', d.name, 'profilePic', d."profilePic")
            END AS sender
        FROM messages m
        LEFT JOIN users u ON m.sender_model = 'User' AND m.sender = u.id
        LEFT JOIN doctors d ON m.sender_model = 'Doctor' AND m.sender = d.id
        WHERE m."chatId" = $1
        ORDER BY m."createdAt" ASC`,
        [chatId]
    );

    const response = {
        chatId,
        person: otherUser,
        messages: messagesResult.rows
    };

    setCache(cacheKey, response, 300);

    return response;
};


export const getChatbotMessages = async (user: any) => {
    let chatResult = await pool.query(
        `SELECT c.id FROM chats c
         JOIN chat_members cm ON c.id = cm."chatId"
         WHERE c.chat_type = 'chatbot' AND cm.member_id = $1`,
        [user.id]
    );

    let chatId: string;

    if (!chatResult.rows.length) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const newChat = await client.query(
                `INSERT INTO chats (chat_type) VALUES ('chatbot') RETURNING id`
            );
            chatId = newChat.rows[0].id;
            await client.query(
                `INSERT INTO chat_members ("chatId", member_id, member_model) VALUES ($1, $2, 'User'), ($1, $3, 'Bot')`,
                [chatId, user.id, BOT_ID]
            );
            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    } else {
        chatId = chatResult.rows[0].id;
    }

    const cacheKey = `chatBotMessages_${user.id}_${chatId}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return cached;
    }

    const messagesResult = await pool.query(
        `SELECT
            id,
            "chatId" AS chatId,
            "isDeleted" AS "isDeleted",
            text,
            "createdAt",
            jsonb_build_object('id', sender) AS sender
        FROM messages
        WHERE "chatId" = $1
        ORDER BY "createdAt" ASC`,
        [chatId]
    );

    const response = {
        chatId,
        messages: messagesResult.rows
    };

    setCache(cacheKey, response, 300);

    return response;
};


export const getAllChats = async (reqQuery: any) => {
    const { search } = reqQuery;
    const page = Number(reqQuery.page) || 1;
    const limit = Number(reqQuery.limit) || 10;
    const offset = (page - 1) * limit;


    const cacheKey = `all_chats:${page}_${limit}_${search}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return cached;
    }

    const params: any[] = [];
    let paramIndex = 1;
    let searchClause = "";

    if (search && search !== "") {
        searchClause = `AND (u.name ILIKE $${paramIndex} OR d.name ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    const mainQuery = `
        SELECT
            c.id, c.chat_type AS "chatType",
            json_agg(DISTINCT jsonb_build_object(
                'id', COALESCE(u.id, d.id),
                'name', COALESCE(u.name, d.name),
                'profilePic', COALESCE(u."profilePic", d."profilePic")
            )) AS "memberDetails",
            COUNT(*) OVER() AS total_count
        FROM chats c
        JOIN chat_members cm ON c.id = cm."chatId"
        LEFT JOIN users u ON cm.member_model = 'User' AND cm.member_id = u.id
        LEFT JOIN doctors d ON cm.member_model = 'Doctor' AND cm.member_id = d.id
        WHERE c.chat_type = 'personal'
        ${searchClause}
        GROUP BY c.id
        ORDER BY c."updatedAt" DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const result = await pool.query(mainQuery, params);

    const total = Number(result.rows[0]?.total_count ?? 0);

    const response = {
        chats: result.rows,
        totalChats: total,
        results: result.rowCount,
        totalPages: Math.ceil(total / limit),
        page
    };

    setCache(cacheKey, response, 300);

    return response;
};



export const getChatMessagesForAdmin = async (chatId: any) => {

    const messagesResult = await pool.query(
        `SELECT
            m.id AS "_id",
            m."chatId" AS "chatId",
            m."isDeleted" AS "isDeleted",
            m.text,
            m."createdAt",
            CASE
                WHEN m.sender_model = 'User' THEN
                    jsonb_build_object('_id', u.id, 'name', u.name, 'profilePic', u."profilePic")
                WHEN m.sender_model = 'Doctor' THEN
                    jsonb_build_object('_id', d.id, 'name', d.name, 'profilePic', d."profilePic")
            END AS sender
        FROM messages m
        LEFT JOIN users u ON m.sender_model = 'User' AND m.sender = u.id
        LEFT JOIN doctors d ON m.sender_model = 'Doctor' AND m.sender = d.id
        WHERE m."chatId" = $1
        ORDER BY m."createdAt" ASC`,
        [chatId]
    );

    const response = {
        chatId,
        messages: messagesResult.rows
    };

    return response;
};
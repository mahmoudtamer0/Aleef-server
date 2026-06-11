import { getCache, setCache, clearCache } from "../../../cache";
import pool from "../../../db";
import ApiError from "../../../utils/ApiError";

export const getAllAppoinments = async (reqQuery: any) => {
    const { page = "1", limit = "10", search = "", status } = reqQuery;

    const currentPage = Number(page);
    const perPage = Number(limit);
    const offset = (currentPage - 1) * perPage;

    const cacheKey = `appointments:${page}_${limit}_${status}_${search}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return cached;
    }

    const filters: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search && search !== "") {
        filters.push(`(
            a.reason ILIKE $${paramIndex} OR
            u.name ILIKE $${paramIndex} OR
            d.name ILIKE $${paramIndex} OR
            p.name ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
    }

    if (status) {
        filters.push(`a.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const mainQuery = `
    SELECT
        a.id, a.date, a.time, a.reason, a.status, a.notes, a."rejectionReason",
        a."createdAt", a."updatedAt",
        jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email, 'profilePic', u."profilePic") AS owner,
        jsonb_build_object('id', d.id, 'name', d.name, 'email', d.email, 'profilePic', d."profilePic") AS doctor,
        jsonb_build_object('id', p.id, 'name', p.name) AS pet,
        COUNT(*) OVER() AS total_count
    FROM appointments a
    LEFT JOIN users u ON a.owner = u.id
    LEFT JOIN doctors d ON a.doctor = d.id
    LEFT JOIN pets p ON a.pet = p.id
    ${whereClause}
    ORDER BY a."updatedAt" DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
`;

    params.push(perPage, offset);

    const result = await pool.query(mainQuery, params);

    const totalAppointments = Number(result.rows[0]?.total_count ?? 0);

    const response = {
        totalAppointments,
        results: result.rowCount,
        page: currentPage,
        totalPages: Math.ceil(totalAppointments / perPage),
        appointments: result.rows,
        currentPage
    };

    setCache(cacheKey, response, 500);


    return response;

}



export const changeAppointmentStatus = async (appointmentId: any, status: any) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const appointment = await client.query(
            `UPDATE appointments SET status = $1, "updatedAt" = NOW() 
             WHERE id = $2 RETURNING *`,
            [status, appointmentId]
        );

        if (appointment.rowCount === 0) throw new ApiError(404, "Appointment not found");

        if (status === "accepted") {
            let chatResult = await client.query(
                `SELECT c.id FROM chats c
                 JOIN chat_members cm1 ON c.id = cm1."chatId" AND cm1.member_id = $1
                 JOIN chat_members cm2 ON c.id = cm2."chatId" AND cm2.member_id = $2
                 WHERE c.chat_type = 'personal' LIMIT 1`,
                [appointment.rows[0].owner, appointment.rows[0].doctor]
            );

            let chatId: string;

            if (!chatResult.rows.length) {
                const newChat = await client.query(
                    `INSERT INTO chats (chat_type) VALUES ('personal') RETURNING id`
                );
                chatId = newChat.rows[0].id;
                await client.query(
                    `INSERT INTO chat_members ("chatId", member_id, member_model) 
                     VALUES ($1, $2, 'User'), ($1, $3, 'Doctor')`,
                    [chatId, appointment.rows[0].owner, appointment.rows[0].doctor]
                );
            } else {
                chatId = chatResult.rows[0].id;
                await client.query(
                    `UPDATE chats SET status = 'active' WHERE id = $1`,
                    [chatId]
                );
            }

            const message = await client.query(
                `INSERT INTO messages ("chatId", sender, sender_model, chat_type, text)
                 VALUES ($1, $2, 'Doctor', 'personal', $3)
                 RETURNING id, text`,
                [chatId, appointment.rows[0].doctor,
                    `Your appointment on ${appointment.rows[0].date} at ${appointment.rows[0].time} has been accepted by the doctor.`]
            );

            await client.query(
                `INSERT INTO unread_messages ("chatId", user_id, "lastMessage", "unreadCount")
                 VALUES ($1, $2, $3, 1)
                 ON CONFLICT ("chatId", user_id) DO UPDATE SET
                    "unreadCount" = unread_messages."unreadCount" + 1,
                    "lastMessage" = $3`,
                [chatId, appointment.rows[0].owner, message.rows[0].text]
            );

            await client.query(
                `UPDATE chats SET "lastMessage" = $1, "updatedAt" = NOW() WHERE id = $2`,
                [message.rows[0].id, chatId]
            );

            clearCache(`chats:${appointment.rows[0].owner}`);
            clearCache(`chats:${appointment.rows[0].doctor}`);
            clearCache(`chat_messages_${appointment.rows[0].owner}_${chatId}`);
            clearCache(`all_chats:`);
        }

        await client.query("COMMIT");

        clearCache(`activeAppointment:${appointment.rows[0].owner}`);
        clearCache(`appointmentsRequests:${appointment.rows[0].doctor}`);
        clearCache(`appointment_details_user:${appointmentId}`);
        clearCache(`appointment_details_doctor:${appointmentId}`);
        clearCache(`appointments:`);
        clearCache(`prevAppointments:${appointment.rows[0].owner}`);
        clearCache(`prevAppointments:${appointment.rows[0].doctor}`);

        return;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const getAppointmentDetailsForAdmin = async (appointmentId: any) => {
    const cacheKey = `appointment_details_admin:${appointmentId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
        `SELECT a.id, a.date, a.time, a.reason, a.status, a.notes, a."rejectionReason",
            a."createdAt", a."updatedAt", a."appoinmentFee",
            jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email, 'profilePic', u."profilePic") AS owner,
            jsonb_build_object('id', d.id, 'name', d.name, 'specialization', d.specialization, 'profilePic', d."profilePic") AS doctor,
            jsonb_build_object('id', p.id, 'name', p.name, 'type', p.type, 'gender', p.gender, 'profilePic', p."profilePic") AS pet
        FROM appointments a
        JOIN users u ON u.id = a.owner
        JOIN doctors d ON d.id = a.doctor
        JOIN pets p ON p.id = a.pet
        WHERE a.id = $1`,
        [appointmentId]
    );

    if (!result.rows.length) throw new ApiError(404, "Appointment not found");

    setCache(cacheKey, result.rows[0], 300);
    return result.rows[0];
};

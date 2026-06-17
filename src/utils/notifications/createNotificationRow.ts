import pool from "../../db";

interface CreateNotificationParams {
    title: string;
    body: string;
    userId: number;
    type: 'order' | 'appointment' | 'pet' | 'chat' | 'vaccination';
    orderId?: number;
    appointmentId?: number;
    petId?: number;
    chatId?: number;
}

export const createNotification = async ({
    title,
    body,
    userId,
    type,
    orderId,
    appointmentId,
    petId,
    chatId,
}: CreateNotificationParams) => {
    await pool.query(
        `INSERT INTO notifications (title, body, user_id, type, order_id, appointment_id, pet_id, chat_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [title, body, userId, type, orderId ?? null, appointmentId ?? null, petId ?? null, chatId ?? null]
    );
};
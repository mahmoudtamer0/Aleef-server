import pool from "../../db";

interface CreateNotificationParams {
    title: string;
    body: string;
    userId?: string;
    doctorId?: string;
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

export const createNotificationForDoctor = async ({
    title,
    body,
    doctorId,
    type,
    appointmentId,
}: CreateNotificationParams) => {
    await pool.query(
        `INSERT INTO notifications (title, body, doctor_id, type,appointment_id)
       VALUES ($1, $2, $3, $4, $5)`,
        [title, body, doctorId, type, appointmentId ?? null]
    );
}
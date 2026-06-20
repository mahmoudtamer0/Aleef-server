import { sendPushNotification } from "../../config/sendNotification";
import pool from "../../db";

export const sendNotificationService = async (userId: string, userRole: string, title: string, body: string) => {

    if (!userId || !title || !body) throw new Error("Invalid data");

    let sessions;

    if (userRole != "DOCTOR") {
        sessions = await pool.query(
            `SELECT "fcmToken" FROM sessions WHERE user_id = $1 AND "fcmToken" IS NOT NULL`,
            [userId]
        );
    } else {
        sessions = await pool.query(
            `SELECT "fcmToken" FROM sessions WHERE doctor_id = $1 AND "fcmToken" IS NOT NULL`,
            [userId]
        );
    }


    if (sessions.rows.length === 0) return;

    await Promise.all(
        sessions.rows.map(session => sendPushNotification(session.fcmToken, title, body))
    );
}
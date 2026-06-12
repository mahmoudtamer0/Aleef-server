// src/utils/sendNotification.ts
import admin from "../config/firebase";

export const sendNotification = async (
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
) => {
    try {
        await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
            data: data || {},
            android: {
                priority: "high",
            },
            apns: {
                payload: {
                    aps: { sound: "default" },
                },
            },
        });
    } catch (error) {
        console.error("FCM Error:", error);
    }
};
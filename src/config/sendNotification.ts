// src/utils/sendNotification.ts
import admin from "../config/firebase";

export const sendPushNotification = async (
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
) => {
    try {
        const result = await admin.messaging().send({
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

        console.log("result notification", result);
    } catch (error) {
        console.error("FCM Error:", error);
    }
};
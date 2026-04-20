// services/pushNotification.ts
import admin from "../config/firebase";

export const sendPushNotification = async ({
    tokens,
    title,
    body,
    data
}: {
    tokens: string[];
    title: string;
    body: string;
    data?: any;
}) => {
    if (!tokens.length) return;

    await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
            title,
            body,
        },
        data: data || {},
        android: {
            priority: "high"
        },
        apns: {
            payload: {
                aps: {
                    sound: "default"
                }
            }
        }
    });
};
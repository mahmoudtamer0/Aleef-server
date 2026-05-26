import admin from "./firebase";
import Session from "../modules/User/session.schema";

export const sendNotification = async (userId: string, title: string, body: string) => {

    const sessions = await Session.find({
        userId,
        fcmToken: { $ne: null }
    }).select("fcmToken");

    const tokens = sessions
        .map(s => s.fcmToken)
        .filter((token): token is string => !!token);

    if (!tokens.length) return;

    const message = {
        notification: {
            title,
            body
        },
        tokens
    };

    await admin.messaging().sendEachForMulticast(message);
};
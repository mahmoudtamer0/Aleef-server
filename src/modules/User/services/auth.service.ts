import { OAuth2Client } from "google-auth-library";
import pool from "../../../db";
import ApiError from "../../../utils/ApiError";
import { checkPassword } from "../../../utils/checkPassword";
import { generateToken } from "../../../utils/generateToken";
import { generateOTP } from "../../../utils/generatOtp";
import { hashPassword } from "../../../utils/hashPassword";
import { sendEmail } from "../../../utils/sendEmail";
import crypto from "crypto";
import { clearCache } from "../../../cache";
import { forgetPasswordTemplate, loginTemplate, resendOtpTemplate, verifyEmailTemplate, verifyOtpTemplate } from "../../../emails/user.emails";
import { User } from "../../../types/user";

export const register = async ({ email, name, password, phone }: { email: string, name: string, password: string, phone: string }) => {

    const { otp, hashedOtp, expires } = generateOTP()

    const findUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])


    if (findUser.rows.length > 0 && findUser.rows[0].isEmailVerified == true) {
        throw new ApiError(400, "this email already in use");
    }

    const hashedPassword = await hashPassword(password);

    if (findUser.rows.length > 0 && findUser.rows[0].isEmailVerified == false) {
        await pool.query("UPDATE users SET name = $1, phone = $2, password = $3, \"emailVerificationCode\" = $4, \"emailVerificationExpires\" = $5 WHERE email = $6", [name.toLowerCase(), phone, hashedPassword, hashedOtp, expires, email])
    } else {
        await pool.query("INSERT INTO users (email, name, phone, password, \"emailVerificationCode\", \"emailVerificationExpires\") VALUES ($1, $2, $3, $4, $5, $6)", [email, name.toLowerCase(), phone, hashedPassword, hashedOtp, expires])
    }


    setImmediate(() => {
        sendEmail({
            email: email,
            subject: "Verify your email",
            text: "",
            message: verifyEmailTemplate(name, otp),
        }).catch(err => console.log("email error:", err));
    })



    return;
}

export const resendOtp = async ({ email }: { email: string }) => {
    const { otp, hashedOtp, expires } = generateOTP()

    const findUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])

    if (findUser.rows.length === 0) {
        throw new ApiError(404, "user not found");
    }

    if (findUser.rows[0].isEmailVerified === true) {
        throw new ApiError(400, "this email already in use");
    }

    await pool.query("UPDATE users SET \"emailVerificationCode\" = $1, \"emailVerificationExpires\" = $2 WHERE email = $3", [hashedOtp, expires, email])


    await sendEmail({
        email: email,
        subject: "Resend Verification Code",
        text: "",
        message: resendOtpTemplate(otp),
    });

    return;
}

export const verifyEmail = async ({ email, otp }: { email: string, otp: string }, device: string) => {


    const hashedOtp = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    const findUser = await pool.query(`UPDATE users SET "isEmailVerified" = $1, "emailVerificationCode" = $2,
            "emailVerificationExpires" = $3 WHERE email = $4 AND "isEmailVerified" = $5 And "emailVerificationExpires" >= $6 AND "emailVerificationCode" = $7 RETURNING id,name,email,role`,
        [true, null, null, email, false, new Date(), hashedOtp])

    if (findUser.rowCount == 0) throw new ApiError(400, "Invalid or expired verification code");

    const session = await pool.query(
        `INSERT INTO sessions (user_id, device, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '7 days') RETURNING id`,
        [findUser.rows[0].id, device]
    );

    const token = generateToken(findUser.rows[0].name, findUser.rows[0].id.toString(), findUser.rows[0].role, session.rows[0].id.toString(), findUser.rows[0].email)

    setImmediate(() => {
        sendEmail({
            email: findUser.rows[0].email,
            subject: "Account Created 🎉 - Aleef",
            text: "",
            message: verifyOtpTemplate(findUser.rows[0].name),
        }).catch(err => console.log("email error:", err));
    })


    return { user: findUser.rows[0], token }

}

export const login = async ({ email, password }: { email: string, password: string }, device: string) => {

    const findUser = await pool.query(`SELECT email, id, name, role, password, "profilePic", "isEmailVerified", status, "banExpiresAt" FROM users WHERE email = $1`, [email])

    if (findUser.rows.length === 0) {
        throw new ApiError(400, "email or password not correct");
    }

    const checkedPass = await checkPassword(password, findUser.rows[0].password)

    if (!checkedPass) {
        throw new ApiError(400, "email or password not correct");
    }

    if (findUser.rows[0].isEmailVerified == false) {
        throw new ApiError(401, "email not veryfied");
    }

    if (findUser.rows[0].status === "banned") {
        const banExpiry = findUser.rows[0].banExpiresAt;

        if (banExpiry === null || new Date(banExpiry) > new Date()) {
            if (findUser.rows[0].banExpiresAt === null) {
                throw new ApiError(403, "your account is banned permanently, please contact support");
            }
            throw new ApiError(403, "your account is banned until " + new Date(banExpiry).toLocaleString());
        }

        await pool.query(
            `UPDATE users SET status = $1, "banExpiresAt" = $2 WHERE email = $3`,
            ["active", null, email]
        );
    }

    const session = await pool.query(
        `INSERT INTO sessions (user_id, device, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '7 days') RETURNING id`,
        [findUser.rows[0].id, device]
    );

    const token = generateToken(findUser.rows[0].name, findUser.rows[0].id.toString(), findUser.rows[0].role, session.rows[0].id.toString(), findUser.rows[0].email)

    const time = new Date().toLocaleString();

    setImmediate(() => {
        sendEmail({
            email: email,
            subject: "New Login Detected",
            text: "",
            message: loginTemplate(device, time),
        }).catch(err => console.log("email error:", err))
    })


    return { findUser: findUser.rows[0], token };
}

export const google = async (idToken: string, device: string) => {

    const googleClientId = process.env["GOOGLE_CLIENT_ID"];
    const googleAndroidClientId = process.env["GOOGLE_ANDROID_CLIENT_ID"];

    if (!googleClientId) {
        throw new Error("GOOGLE_CLIENT_ID is not configured");
    }

    if (!googleAndroidClientId) {
        throw new Error("GOOGLE_Android_CLIENT_ID is not configured");
    }

    const client = new OAuth2Client(
        googleClientId);

    const ticket = await client.verifyIdToken({
        idToken,
        audience: [
            googleClientId,
            googleAndroidClientId
        ],
    });

    const payload = ticket.getPayload();

    if (!payload) {
        throw new ApiError(400, "Invalid token");
    }

    const { email, name, email_verified } = payload;

    if (!email_verified) {
        throw new ApiError(400, "Google email not verified");
    }

    let findUser = await pool.query(`SELECT email, id, name, role, "profilePic", status, "banExpiresAt" FROM users WHERE email = $1`, [email])

    if (findUser.rows.length > 0 && findUser.rows[0].status === "banned") {
        const banExpiry = findUser.rows[0].banExpiresAt;

        if (banExpiry === null || new Date(banExpiry) > new Date()) {
            if (findUser.rows[0].banExpiresAt === null) {
                throw new ApiError(403, "your account is banned permanently, please contact support");
            }
            throw new ApiError(403, "your account is banned until " + new Date(banExpiry).toLocaleString());
        }

        await pool.query(
            `UPDATE users SET status = $1, "banExpiresAt" = $2 WHERE email = $3`,
            ["active", null, email]
        );
    }

    if (findUser.rows.length === 0) {
        findUser = await pool.query(
            `INSERT INTO users (email, name, "isEmailVerified", role) 
             VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, "profilePic"`,
            [email, name, true, "USER"]
        )
    }

    const session = await pool.query(
        `INSERT INTO sessions (user_id, device, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '7 days') RETURNING id`,
        [findUser.rows[0].id, device]
    );

    const token = generateToken(findUser.rows[0].name, findUser.rows[0].id.toString(), findUser.rows[0].role, session.rows[0].id.toString(), findUser.rows[0].email)

    const user = {
        id: findUser.rows[0].id,
        name: findUser.rows[0].name,
        email: findUser.rows[0].email,
        phone: "",
        profilePic: findUser.rows[0].profilePic,
    }

    return { user, token };
}

export const changePassword = async (user: User, currentPassword: string, newPassword: string) => {
    const client = await pool.connect();
    try {

        await client.query("BEGIN");

        const userProfile = await client.query(`SELECT id, password FROM users WHERE id = $1`, [user.id]);
        if (!userProfile.rows.length) throw new ApiError(404, "user not found");

        const checkedPass = await checkPassword(currentPassword, userProfile.rows[0].password);

        if (!checkedPass) throw new ApiError(400, "current password is not correct");


        const hashedPassword = await hashPassword(newPassword);


        await client.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, user.id]);

        const userSessions = await client.query(`DELETE FROM sessions WHERE user_id = $1 AND id != $2 RETURNING id`, [user.id, user.sessionId]);


        await client.query("COMMIT");
        userSessions.rows.forEach(session => clearCache(`session:${session.id}`));

        return;

    } catch (err) {
        await client.query("ROLLBACK");
        throw new ApiError(500, "something went wrong");
    } finally {
        client.release();
    }
}

export const forgetPassword = async (email: string) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const { otp, hashedOtp } = generateOTP()

        const userProfile = await client.query(`SELECT id,name FROM users WHERE email = $1`, [email]);

        if (!userProfile.rows.length) throw new ApiError(404, "user not found");


        await client.query(
            `DELETE FROM password_reset_tokens WHERE "user" = $1`,
            [userProfile.rows[0].id]
        );

        await client.query(
            `INSERT INTO password_reset_tokens ("user", token, "expiresAt")
             VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
            [userProfile.rows[0].id, hashedOtp]
        );

        setImmediate(() => {
            sendEmail({
                email: email,
                subject: "Reset Password",
                text: "",
                message: forgetPasswordTemplate(userProfile.rows[0].name, otp),
            }).catch(err => console.error("Email failed:", err));
        });

        await client.query("COMMIT");

        return;

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const resetPassword = async (newPassword: string, otp: string) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const hashedOtp = crypto
            .createHash("sha256")
            .update(String(otp))
            .digest("hex");

        const passwordResetToken = await client.query(
            `SELECT * FROM password_reset_tokens WHERE token = $1 AND "expiresAt" > NOW()`,
            [hashedOtp]
        );

        if (!passwordResetToken.rows.length) throw new ApiError(400, "invalid token");


        const userResult = await client.query(
            `SELECT password FROM users WHERE id = $1`,
            [passwordResetToken.rows[0].user]
        );

        const isSamePassword = await checkPassword(newPassword, userResult.rows[0].password);
        if (isSamePassword) {
            throw new ApiError(400, "New password must be different from the old one");
        }


        const hashedPassword = await hashPassword(newPassword);


        await client.query(
            `UPDATE users SET password = $1 WHERE id = $2`,
            [hashedPassword, passwordResetToken.rows[0].user]
        );

        await client.query(
            `DELETE FROM password_reset_tokens WHERE user = $1 AND token = $2`,
            [passwordResetToken.rows[0].user, hashedOtp]
        );

        await client.query("COMMIT");

        return;

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const addFcmToken = async (user: any, fcmToken: any) => {

    await pool.query(
        `UPDATE sessions SET "fcmToken" = $1 WHERE id = $2`,
        [fcmToken, user.sessionId]
    );

    return;
}

export const logOut = async (user: User) => {
    try {
        await pool.query("DELETE FROM sessions WHERE id = $1", [user.sessionId]);
        clearCache(`session:${user.sessionId}`);
        return "success"
    } catch (err) {
        throw new ApiError(500, "error")
    }

}

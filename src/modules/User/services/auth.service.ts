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
import { loginTemplate, resendOtpTemplate, verifyEmailTemplate, verifyOtpTemplate } from "../../../emails/user.emails";

export const register = async ({ email, name, password, phone }: any) => {

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

export const resendOtp = async ({ email }: any) => {
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

export const verifyEmail = async ({ email, otp }: any, device: string) => {


    const hashedOtp = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    const findUser = await pool.query(`UPDATE users SET "isEmailVerified" = $1, "emailVerificationCode" = $2,
            "emailVerificationExpires" = $3 WHERE email = $4 AND "isEmailVerified" = $5 And "emailVerificationExpires" >= $6 AND "emailVerificationCode" = $7 RETURNING id,name,email`,
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

export const login = async ({ email, password }: any, device: string) => {

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

    if (findUser.rows[0].status == "banned" && findUser.rows[0].banExpiresAt) {
        if (findUser.rows[0].banExpiresAt > new Date()) {
            throw new ApiError(403, "your account is banned");
        }
        await pool.query("UPDATE users SET status = $1, \"banExpiresAt\" = $2 WHERE email = $3", ["active", null, email])
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

    if (!googleClientId) {
        throw new Error("GOOGLE_CLIENT_ID is not configured");
    }

    const client = new OAuth2Client(
        googleClientId);

    const ticket = await client.verifyIdToken({
        idToken,
        audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
        throw new ApiError(400, "Invalid token");
    }

    const { email, name, email_verified, picture } = payload;

    if (!email_verified) {
        throw new ApiError(400, "Google email not verified");
    }

    let findUser = await pool.query(`SELECT email, id, name, role, "profilePic", status, "banExpiresAt" FROM users WHERE email = $1`, [email])

    if (findUser.rows.length > 0 && findUser.rows[0].status == "banned" && findUser.rows[0].banExpiresAt) {
        if (findUser.rows[0].banExpiresAt > new Date()) {
            throw new ApiError(403, "your account is banned");
        }
        await pool.query("UPDATE users SET status = $1, \"banExpiresAt\" = $2 WHERE email = $3", ["active", null, email])
    }

    if (findUser.rows.length === 0) {
        findUser = await pool.query(`INSERT INTO users (email, name, isEmailVerified,role,"profilePic") VALUES ($1, $2, $3, $4,$5) RETURNING id,name,email,role,profilePic`, [email, name, true, "USER", picture])
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

// export const addFcmToken = async (user: any, fcmToken: any) => {

//     const session = await Session.findByIdAndUpdate(user.sessionId, { fcmToken: fcmToken });

//     return session;
// }

export const logOut = async (user: any) => {
    try {
        await pool.query("DELETE FROM sessions WHERE id = $1", [user.sessionId]);
        clearCache(`session:${user.sessionId}`);
        return "success"
    } catch (err) {
        throw new ApiError(500, "error")
    }

}
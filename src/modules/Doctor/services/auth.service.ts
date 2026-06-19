import { clearCache } from "../../../cache";
import pool from "../../../db";
import { verifyEmailTemplate, resendOtpTemplate, verifyOtpTemplate, loginTemplate } from "../../../emails/doctor.emails";
import { User } from "../../../types/user";
import ApiError from "../../../utils/ApiError";
import { checkPassword } from "../../../utils/checkPassword";
import { generateToken } from "../../../utils/generateToken";
import { generateOTP } from "../../../utils/generatOtp";
import { hashPassword } from "../../../utils/hashPassword";
import { sendEmail } from "../../../utils/sendEmail";
import crypto from "crypto";



export const doctorRegister = async ({ email, name, password, phone, specialization, license_number, city, address, appointmentFee, lat, lng }: any, reqFiles: any) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { otp, hashedOtp, expires } = generateOTP()

        const findDoctor = await client.query(`SELECT email, "isEmailVerified" FROM doctors WHERE email = $1 OR license_number = $2`, [email, license_number])

        if (findDoctor.rows.length > 0 && findDoctor.rows[0].isEmailVerified == true) {
            throw new ApiError(400, "this email already in use");
        }

        const hashedPassword = await hashPassword(password);

        if (!reqFiles.profilePic || !reqFiles.IdentityVerificationImage || !reqFiles.NationalIdFront || !reqFiles.NationalIdBack) {
            throw new ApiError(400, "profile picture is required")
        }
        let doctor;
        if (findDoctor.rows.length > 0 && findDoctor.rows[0].isEmailVerified == false) {
            doctor = await client.query(
                `UPDATE doctors SET name = $1, phone = $2, password = $3, "license_number" = $4, 
                "city" = $5, "address" = $6, "specialization" = $7, "profilePic" = $8, 
                "cloudinary_id" = $9, "emailVerificationCode" = $10, "emailVerificationExpires" = $11, 
                appointmentFee = $12, lat = $13, lng = $14, location_link = $15 
                WHERE email = $16 RETURNING id`,
                [name, phone, hashedPassword, license_number, city, address, specialization,
                    reqFiles.profilePic[0].path, reqFiles.profilePic[0].filename,
                    hashedOtp, expires, appointmentFee, lat, lng,
                    `https://www.google.com/maps?q=${lat},${lng}`,
                    email]
            )
        } else {
            doctor = await client.query(
                `INSERT INTO doctors (email, name, phone, password, "license_number", "city", "address", 
                "specialization", "profilePic", "cloudinary_id", "emailVerificationCode", 
                "emailVerificationExpires", appointmentFee, lat, lng, location_link) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
                [email, name, phone, hashedPassword, license_number, city, address, specialization,
                    reqFiles.profilePic[0].path, reqFiles.profilePic[0].filename,
                    hashedOtp, expires, appointmentFee, lat, lng,
                    `https://www.google.com/maps?q=${lat},${lng}`]
            )
        }

        await client.query(`
            INSERT INTO doctor_documents (doctor_id, identity_verification, national_id_front, national_id_back)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (doctor_id) DO UPDATE SET
                identity_verification = EXCLUDED.identity_verification,
                national_id_front = EXCLUDED.national_id_front,
                national_id_back = EXCLUDED.national_id_back
        `,
            [doctor.rows[0].id, reqFiles.IdentityVerificationImage[0].path, reqFiles.NationalIdFront[0].path, reqFiles.NationalIdBack[0].path])

        await client.query("COMMIT")

        setImmediate(() => {
            sendEmail({
                email: email,
                subject: "Verify your email",
                text: "",
                message: verifyEmailTemplate(otp),
            });
        })

        return;

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }

}

export const resendOtp = async ({ email }: { email: string }) => {
    const { otp, hashedOtp, expires } = generateOTP()

    const findDoctor = await pool.query("SELECT email,\"isEmailVerified\" FROM doctors WHERE email = $1", [email])

    if (!findDoctor.rows.length) {
        throw new ApiError(404, "user not found");
    }

    if (findDoctor.rows[0].isEmailVerified == true) {
        throw new ApiError(400, "this email already in use");
    }


    await pool.query("UPDATE doctors SET \"emailVerificationCode\" = $1, \"emailVerificationExpires\" = $2 WHERE email = $3", [hashedOtp, expires, email])

    await sendEmail({
        email: email,
        subject: "Resend Verification Code",
        text: "",
        message: resendOtpTemplate(otp),
    });

    return findDoctor.rows[0];
}


export const verifyEmail = async ({ email, otp }: { email: string, otp: string }): Promise<any> => {
    const hashedOtp = crypto
        .createHash("sha256")
        .update(String(otp))
        .digest("hex");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const doctor = await client.query(`
            UPDATE doctors 
            SET "isEmailVerified" = $1, 
                "emailVerificationCode" = $2,
                "emailVerificationExpires" = $3 ,
                status = 'pending'
            WHERE email = $4 
                AND "isEmailVerified" = $5 
                AND "emailVerificationExpires" >= NOW()
                AND "emailVerificationCode" = $6 
            RETURNING id`,
            [true, null, null, email, false, hashedOtp]
        )

        if (doctor.rowCount == 0) throw new ApiError(400, "Invalid or expired verification code");

        const defaultDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        await client.query(
            `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_available)
     VALUES ${defaultDays.map((_, i) => `($1, $${i + 2}, '09:00', '17:00', true)`).join(", ")}
     ON CONFLICT (doctor_id, day_of_week) DO NOTHING`,
            [doctor.rows[0].id, ...defaultDays]);

        await client.query("COMMIT")

        setImmediate(() => {
            sendEmail({
                email: email,
                subject: "Your Account is Under Review - Aleef",
                text: "",
                message: verifyOtpTemplate(otp),
            }).catch(err => {
                console.error("Email failed:", err);
            });
        });

        return;

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }



}


export const login = async ({ email, password }: { email: string, password: string }, device: string) => {

    const findDoctor = await pool.query(`SELECT email, id, name, role, password, "profilePic", "isEmailVerified", status, "banExpiresAt" FROM doctors WHERE email = $1`, [email])


    if (!findDoctor.rows.length) {
        throw new ApiError(400, "email or password not correct");
    }

    const checkedPass = await checkPassword(password, findDoctor.rows[0].password)

    if (!checkedPass) {
        throw new ApiError(400, "email or password not correct");
    }

    if (findDoctor.rows[0].isEmailVerified == false) {
        throw new ApiError(401, "email not veryfied");
    }

    if (findDoctor.rows[0].status == "banned" && findDoctor.rows[0].banExpiresAt) {
        if (findDoctor.rows[0].banExpiresAt > new Date()) {
            throw new ApiError(403, "your account is banned");
        }
        await pool.query("UPDATE doctors SET status = $1, \"banExpiresAt\" = $2 WHERE email = $3", ["active", null, email])
    }

    const session = await pool.query(
        `INSERT INTO sessions (doctor_id, device, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '7 days') RETURNING id`,
        [findDoctor.rows[0].id, device]
    );

    const token = generateToken(findDoctor.rows[0].name, findDoctor.rows[0].id.toString(), findDoctor.rows[0].role, session.rows[0].id.toString(), findDoctor.rows[0].email)

    const time = new Date().toLocaleString();

    setImmediate(() => {
        sendEmail({
            email: email,
            subject: "New Login Detected",
            text: "",
            message: loginTemplate(device, time)
        }).catch(err => console.log("email error:", err))
    })

    const doctor = findDoctor.rows[0]
    return { doctor, token };
}


export const addFcmToken = async (doctor: User, fcmToken: any) => {

    await pool.query(
        `UPDATE sessions SET "fcmToken" = $1 WHERE id = $2`,
        [fcmToken, doctor.sessionId]
    );

    return;
}

export const logOut = async (doctor: User) => {
    try {
        await pool.query("DELETE FROM sessions WHERE id = $1", [doctor.sessionId]);
        clearCache(`session:${doctor.sessionId}`);
        return "success"
    } catch (err) {
        throw new ApiError(500, "error")
    }

}
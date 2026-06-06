import Doctor from "./doctor.schema"
import Appointment from "../Appointments/appointments.schema"
import ApiError from "../../utils/ApiError";
import { generateOTP } from "../../utils/generatOtp";
import { sendEmail } from "../../utils/sendEmail";
import crypto from "crypto";
import { generateToken } from "../../utils/generateToken";
import { getNextDays } from "../../utils/getDoctorAvailableDays";
import { getAvailableSlots } from "../../utils/getDoctorAvailableSlots";
import DoctorReview from "./doctorReview.schema";
import { checkPassword } from "../../utils/checkPassword";
import pool from "../../db";
import { hashPassword } from "../../utils/hashPassword";
import { getCache, setCache } from "../../cache";



export const doctorRegister = async ({ email, name, password, phone, specialization, license_number, city, address, appointmentFee }: any, reqFiles: any) => {
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
            doctor = await client.query("UPDATE doctors SET name = $1, phone = $2, password = $3, \"license_number\" = $4, \"city\" = $5, \"address\" = $6, \"specialization\" = $7, \"profilePic\" = $8, \"cloudinary_id\" = $9,  \"emailVerificationCode\" = $10, \"emailVerificationExpires\" = $11 WHERE email = $12 RETURNING id",
                [name, phone, hashedPassword, license_number, city, address, specialization,
                    reqFiles.profilePic[0].path, reqFiles.profilePic[0].filename,
                    hashedOtp, expires, email])
        } else {
            doctor = await client.query("INSERT INTO doctors (email, name, phone, password, \"license_number\", \"city\", \"address\", \"specialization\", \"profilePic\", \"cloudinary_id\", \"emailVerificationCode\", \"emailVerificationExpires\") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id",
                [email, name, phone, hashedPassword, license_number, city, address, specialization,
                    reqFiles.profilePic[0].path, reqFiles.profilePic[0].filename,
                    hashedOtp, expires])
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
                message: `
                    <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
                        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">
                            <!-- Header -->
                            <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
                            <h2 style="color: #333;">Email Verification</h2>
                            <p style="color: #555; font-size: 16px;">You're almost ready! Use the code below to verify your email address.</p>
    
                            <!-- OTP Code -->
                            <div style="margin: 20px 0;">
                                <span style="font-size: 32px; font-weight: bold; color: #267D77; letter-spacing: 8px;">${otp}</span>
                            </div>
    
                            <p style="color: #777; font-size: 14px;">This verification code will expire in 1 minute.</p>
    
                            <!-- Footer -->
                            <div style="margin-top: 30px; font-size: 12px; color: #999;">
                                <p style="margin-top: 15px;" >
                                    Made with <span style= "color: #267D77;" >❤️</span> by
                                    < a href = "https://www.linkedin.com/in/mahmoudtamer0/" style = "color: #267D77; text-decoration: none;" >
                                        Mahmoud Tamer
                                        </a>
                                        </p>
                                <p>If you did not request this email, please ignore it.</p>
                                <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                            </div>
                        </div>
                    </div>
        `
            });
        })

        return;

    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        throw err;
    } finally {
        client.release();
    }

}


export const resendOtp = async ({ email }: any) => {
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
        message: `
        <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">
                
                <!-- Header -->
                <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
                <h2 style="color: #333;">Verification Code Resent</h2>
                
                <p style="color: #555; font-size: 16px;">
                    We've sent you a new verification code. Please use the code below to verify your email address.
                </p>

                <!-- OTP Code -->
                <div style="margin: 25px 0;">
                    <span style="font-size: 34px; font-weight: bold; color: #267D77; letter-spacing: 8px;">
                        ${otp}
                    </span>
                </div>

                <p style="color: #777; font-size: 14px;">
                    This code will expire in 1 minute. Make sure to use the latest code we sent.
                </p>

                <!-- Extra Note -->
                <p style="color: #999; font-size: 13px;">
                    If you didn't receive the previous code, please check your spam folder or request again.
                </p>

                <!-- Footer -->
                <div style="margin-top: 30px; font-size: 12px; color: #999;">
                    <p>If you did not request this email, please ignore it.</p>
                    <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                </div>

            </div>
        </div>
`
    });

    return findDoctor.rows[0];
}


export const verifyEmail = async ({ email, otp }: any): Promise<any> => {
    const hashedOtp = crypto
        .createHash("sha256")
        .update(String(otp))
        .digest("hex");


    const doctor = await pool.query(`
            UPDATE doctors 
            SET "isEmailVerified" = $1, 
                "emailVerificationCode" = $2,
                "emailVerificationExpires" = $3 
            WHERE email = $4 
                AND "isEmailVerified" = $5 
                AND "emailVerificationExpires" >= NOW()
                AND "emailVerificationCode" = $6 
            RETURNING id`,
        [true, null, null, email, false, hashedOtp]
    )

    if (doctor.rowCount == 0) throw new ApiError(400, "Invalid or expired verification code");

    setImmediate(() => {
        sendEmail({
            email: email,
            subject: "Your Account is Under Review - Aleef",
            text: "",
            message: `
            <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
                <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">
                    
                    <!-- Header -->
                    <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
                    <h2 style="color: #333;">Account Under Review</h2>

                    <!-- Message -->
                    <p style="color: #555; font-size: 16px;">
                        Thank you for registering as a doctor on Aleef 🐾
                    </p>

                    <p style="color: #555; font-size: 15px;">
                        Your account has been successfully created and is currently 
                        <strong style="color: #F59E0B;">under review</strong> by our administration team.
                    </p>

                    <p style="color: #555; font-size: 15px;">
                        We are verifying your information to ensure the best experience for our users.
                        This process usually takes a short time.
                    </p>

                    <!-- Status Box -->
                    <div style="margin: 25px 0; padding: 15px; background-color: #FFF7ED; border-radius: 8px;">
                        <p style="margin: 0; color: #B45309; font-weight: bold;">
                            Status: Pending Approval
                        </p>
                    </div>

                    <!-- Info -->
                    <p style="color: #777; font-size: 14px;">
                        You will receive another email once your account is approved.
                    </p>

                    <!-- Footer -->
                    <div style="margin-top: 30px; font-size: 12px; color: #999;">
                        <p style="margin-top: 15px;">
                            Made with <span style="color: #267D77;">❤️</span> by
                            <a href="https://www.linkedin.com/in/mahmoudtamer0/" style="color: #267D77; text-decoration: none;">
                            Mahmoud Tamer
                            </a>
                        </p>
                        <p>If you did not request this account, please ignore this email.</p>
                        <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                    </div>

                </div>
            </div>
        `
        }).catch(err => {
            console.error("Email failed:", err);
        });
    });

    return;
}


export const login = async ({ email, password }: any, device: string) => {

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
            message: `
        <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">
                
                <!-- Header -->
                <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
                <h2 style="color: #333;">New Login Detected</h2>
                <p style="color: #555; font-size: 16px;">
                    We noticed a new login to your account. Here are the details:
                </p>

                <!-- Login Details -->
                <div style="margin: 25px 0; text-align: left; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
                    <p style="margin: 8px 0;"><strong>Device:</strong> ${device}</p>
                    <p style="margin: 8px 0;"><strong>Time:</strong> ${time}</p>
                    <p style="margin: 8px 0;"><strong>Location:</strong> Egypt,Cairo</p>
                </div>

                <!-- Warning -->
                <p style="color: #d9534f; font-size: 14px; margin-top: 15px;">
                    If this wasn't you, please secure your account immediately.
                </p>

                <!-- Footer -->
                <div style="margin-top: 30px; font-size: 12px; color: #999;">
                    <p>If you recognize this activity, you can safely ignore this email.</p>
                    <p style="margin-top: 15px;">
                        Made with <span style="color: #267D77;">❤️</span> by 
                        <a href="https://www.linkedin.com/in/mahmoudtamer0/" style="color: #267D77; text-decoration: none;">
                            Mahmoud Tamer
                        </a>
                    </p>
                    <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                </div>
            </div>
        </div>
`
        }).catch(err => console.log("email error:", err))
    })

    const doctor = findDoctor.rows[0]
    return { doctor, token };
}

export const approveDoctorRequest = async (doctorId: any) => {

    const doctor = await pool.query(`UPDATE doctors SET status = "active" WHERE id = $1 AND status = "pending" RETURNING email`, [doctorId])

    if (doctor.rows.length == 0) {
        throw new ApiError(404, "Doctor not found");
    }

    setImmediate(() => {
        sendEmail({
            email: doctor.rows[0].email,
            subject: "Account Approved 🎉 - Aleef",
            text: "",
            message: `
    <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px;">
            
            <h2 style="color: #4CAF50;">Congratulations 🎉</h2>
            
            <p>Dear Dr. ${doctor.rows[0].name},</p>

            <p>Your account has been <strong>approved</strong> successfully.</p>

            <p>You can now log in and start using the platform.</p>

            <p style="margin-top:30px; font-size:12px; color:#888;">
                Thank you for being part of Aleef ❤️
            </p>
            <p style="margin-top: 15px;">
                Made with <span style="color: #267D77;">❤️</span> by 
                <a href="https://www.linkedin.com/in/mahmoudtamer0/" style="color: #267D77; text-decoration: none;">
                Mahmoud Tamer
                </a>
            </p>
        </div>
    </div>
  `
        }).catch(err => {
            console.error("Email failed:", err);
        });

    });


    return "request approved"

}

export const getAllDoctorsRequests = async () => {



    const docotrs = await Doctor.find({ isEmailVerified: true, status: "pending" }).lean().select("name phone city specialization status appointmentFee").sort({ createdAt: 1 })

    return docotrs

}

export const getAllDoctors = async (reqQuery: any) => {
    const { search, status, sort } = reqQuery;

    const page = Number(reqQuery.page) || 1;
    const limit = Number(reqQuery.limit) || 10;
    const offset = (page - 1) * limit;

    const cacheKey = `doctors:${page}_${limit}_${sort}_${status}_${search}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const filters: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search && search !== "") {
        filters.push(`(
            d.name ILIKE $${paramIndex} OR 
            d.email ILIKE $${paramIndex} OR 
            d.phone ILIKE $${paramIndex} OR 
            d.city ILIKE $${paramIndex} OR 
            d.specialization ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
    }

    if (status && status !== "all") {
        filters.push(`d.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    let orderClause = `ORDER BY d."createdAt" DESC`;
    if (sort === "appointments") orderClause = `ORDER BY total_appointments DESC`;
    if (sort === "completed") orderClause = `ORDER BY completed_appointments DESC`;
    if (sort === "cancelled") orderClause = `ORDER BY cancelled_appointments DESC`;
    if (sort === "rejected") orderClause = `ORDER BY rejected_appointments DESC`;
    if (sort === "rating") orderClause = `ORDER BY d.rating DESC`;

    const mainQuery = `
        SELECT
            d.name, d.email, d.phone, d.city, d.specialization,
            d.status, d."profilePic", d.address, d.rating, d."ratingsCount",
            d."appointmentFee", d."createdAt",
            COUNT(a.id) AS total_appointments,
            COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_appointments,
            COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) AS cancelled_appointments,
            COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) AS rejected_appointments,
            COUNT(*) OVER() AS total_count
        FROM doctors d
        LEFT JOIN appointments a ON d.id = a.doctor_id
        ${whereClause}
        GROUP BY d.id
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(mainQuery, params);

    const totalDoctors = result.rows[0]?.total_count ?? 0;

    const response = {
        doctors: result.rows,
        results: result.rowCount,
        totalDoctors: Number(totalDoctors),
        totalPages: Math.ceil(Number(totalDoctors) / limit),
        page
    };

    setCache(cacheKey, response, 300);
    return response;
};
export const getDoctor = async (doctorId: any) => {

    const doctor = await Doctor.findById(doctorId).lean().select("name email about phone city specialization status profilePic rating ratingsCount address appointmentFee");

    const reviews = await DoctorReview.find({ doctor: doctorId })
        .populate({
            path: "user",
            select: "name profilePic"
        });
    return { doctor, reviews }
}

export const getDoctorForAdmin = async (doctorId: any) => {

    const doctor = await Doctor.findById(doctorId).lean().select("-password -createdAt -updatedAt -role -slotDuration -emailVerificationCode -emailVerificationExpires -cloudinary_id -__v");

    const reviews = await DoctorReview.find({ doctor: doctorId })
        .populate({
            path: "user",
            select: "name profilePic"
        });
    return { doctor, reviews }
}



export const getAvailableDoctors = async () => {

    const docotrs = await Doctor.find({ isEmailVerified: true, status: { $ne: "pending" } }).lean().select("name email phone city specialization status profilePic rating ratingQuantity appointmentFee").sort({ createdAt: -1 })

    return docotrs

}

export const getDoctorSchedual = async (doctorId: any) => {
    const doctor = await Doctor.findById(doctorId)
        .lean()
        .select("-password -about -createdAt -updatedAt -role -slotDuration -emailVerificationCode -emailVerificationExpires -cloudinary_id -IdentityVerificationImage -NationalIdFront -NationalIdBack -__v");

    if (!doctor) {
        throw new ApiError(404, "Doctor not found");
    }

    const doctorDays = getNextDays(doctor);

    let firstDaySlots: string[] = [];

    if (doctorDays.length > 0) {
        firstDaySlots = await getAvailableSlots(
            doctor,
            doctorId,
            doctorDays[0].date
        );
    }

    return {
        doctor: {
            name: doctor.name,
            specialization: doctor.specialization,
            city: doctor.city,
            address: doctor.address,
            profilePic: doctor.profilePic,
            rating: doctor.rating,
            ratingsCount: doctor.ratingsCount,
            appointmentFee: doctor.appointmentFee,
        },
        doctorDays,
        firstDaySlots,
    };
};


export const getDoctorSlots = async (doctorId: any, date: any) => {

    const doctor = await Doctor.findById(doctorId).lean();

    if (!doctor) {
        throw new ApiError(404, "Doctor not found");
    }

    const slots = await getAvailableSlots(
        doctor,
        doctorId,
        date as string
    );

    return {
        date,
        slots,
    };
};

export const addReviewToDoctor = async (user: any, doctorId: any, { comment, rate }: any) => {

    const doctor = await Doctor.findById(doctorId).select("ratingsCount");

    if (!doctor) {
        throw new ApiError(404, "Doctor not found");
    }

    const checkAppointment = await Appointment.findOne({
        doctor: doctorId,
        owner: user.id,
        status: "completed"
    })

    if (!checkAppointment) {
        throw new ApiError(404, "no appointment found");
    }

    const review = await DoctorReview.create({
        doctor: doctorId,
        user: user.id,
        comment,
        rate
    })

    doctor.ratingsCount += 1;
    await doctor.save()
    return review;
};
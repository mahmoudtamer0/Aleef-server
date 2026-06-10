import ApiError from "../../utils/ApiError";
import { generateOTP } from "../../utils/generatOtp";
import { sendEmail } from "../../utils/sendEmail";
import crypto from "crypto";
import { generateToken } from "../../utils/generateToken";
import { getNextDays } from "../../utils/getDoctorAvailableDays";
import { getAvailableSlots } from "../../utils/getDoctorAvailableSlots";
import { checkPassword } from "../../utils/checkPassword";
import pool from "../../db";
import { hashPassword } from "../../utils/hashPassword";
import { clearCache, getCache, setCache } from "../../cache";
import cloudinary from "../../utils/cloudinary";
import { loginTemplate, resendOtpTemplate, verifyEmailTemplate, verifyOtpTemplate } from "../../emails/doctor.emails";



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
        message: resendOtpTemplate(otp),
    });

    return findDoctor.rows[0];
}


export const verifyEmail = async ({ email, otp }: any): Promise<any> => {
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
            message: loginTemplate(device, time)
        }).catch(err => console.log("email error:", err))
    })

    const doctor = findDoctor.rows[0]
    return { doctor, token };
}

export const approveDoctorRequest = async (doctorId: any) => {

    const doctor = await pool.query(`UPDATE doctors SET status = 'active' WHERE id = $1 AND status = 'pending' RETURNING email`, [doctorId])

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
            d.id, d.name, d.email, d.phone, d.city, d.specialization,
            d.status, d."profilePic", d.address, d.rating, d."ratingsCount",
            d."appointmentFee", d."createdAt",
            COUNT(a.id) AS total_appointments,
            COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_appointments,
            COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) AS cancelled_appointments,
            COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) AS rejected_appointments,
            COUNT(*) OVER() AS total_count
        FROM doctors d
        LEFT JOIN appointments a ON d.id = a.doctor
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

export const getAvailableDoctors = async (reqQuery: any) => {

    const { search, status, sort } = reqQuery;

    const page = Number(reqQuery.page) || 1;
    const limit = Number(reqQuery.limit) || 10;
    const offset = (page - 1) * limit;

    const cacheKey = `doctorsAvailable:${page}_${limit}_${sort}_${status}_${search}`;
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

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")} ` : "";

    const mainQuery = `
        SELECT
            d.id, d.name, d.email, d.phone, d.city, d.specialization,
            d.status, d."profilePic", d.address, d.rating, d."ratingsCount",
            d."appointmentFee", d."createdAt",
            COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_appointments,
            COUNT(*) OVER() AS total_count
        FROM doctors d
        LEFT JOIN appointments a ON d.id = a.doctor
        ${whereClause} AND d.status = 'active'
        GROUP BY d.id
        ORDER BY completed_appointments DESC
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

    setCache(cacheKey, response, 500);

    return response;
}


export const getDoctor = async (doctorId: any) => {

    const [doctorResult, reviewsResult] = await Promise.all([
        pool.query(`
            SELECT id, name, email,about, phone, city, specialization, status, 
                "profilePic", address, rating, "ratingsCount", 
                "appointmentFee", "createdAt"
            FROM doctors 
            WHERE id = $1
        `, [doctorId]),
        pool.query(`
            SELECT r.id, r.rate, r.comment, r."createdAt",
                u.name AS user_name, u."profilePic" AS user_pic
            FROM doctor_reviews r
            JOIN users u ON r."user" = u.id
            WHERE r.doctor = $1
            ORDER BY r."createdAt" DESC
            LIMIT 3
        `, [doctorId])
    ]);


    if (!doctorResult.rows.length) throw new ApiError(404, "Doctor not found");


    return {
        doctor: doctorResult.rows[0],
        reviews: reviewsResult.rows
    }
}

export const getMeDoctor = async (doctor: any) => {

    const cacheKey = `me_doctor:${doctor.id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const doctorProfile = await pool.query(`
        SELECT id, name, email,about, phone, city, specialization, status, 
            "profilePic", address, 
            "appointmentFee", "createdAt"
        FROM doctors 
        WHERE id = $1
    `, [doctor.id]);


    if (!doctorProfile.rows.length) throw new ApiError(404, "Doctor not found");

    setCache(cacheKey, doctorProfile.rows[0], 500);


    return doctorProfile.rows[0];
}

export const getDoctorToAdmin = async (doctorId: any) => {
    console.log("getDoctorToAdmin")

    const doctorResult = await pool.query(`
        SELECT d.id, d.name, d.email, d.phone, d.city, d.specialization, d.status,
            d."profilePic", d.address, d.rating, d."ratingsCount",
            d."appointmentFee", d."createdAt",
            jsonb_build_object(
                'id', doc.id,
                'identity_verification', doc.identity_verification,
                'national_id_front', doc.national_id_front,
                'national_id_back', doc.national_id_back
            ) AS documents
        FROM doctors d
        LEFT JOIN doctor_documents doc ON d.id = doc.doctor_id
        WHERE d.id = $1
    `, [doctorId]);


    if (!doctorResult.rows.length) throw new ApiError(404, "Doctor not found");

    clearCache("doctorsAvailable:")
    clearCache("doctors:")

    return doctorResult.rows[0]
}


export const getDoctorSchedual = async (doctorId: any): Promise<any> => {

    const cacheKey = `doctor_schedual:${doctorId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const doctorResult = await pool.query(
        `SELECT id, name, specialization, city, address, "profilePic", 
                rating, "ratingsCount", "appointmentFee", "slotduration"
         FROM doctors WHERE id = $1`,
        [doctorId]
    );

    if (!doctorResult.rows.length) throw new ApiError(404, "Doctor not found");
    const doctor = doctorResult.rows[0];

    const { result: doctorDays, scheduleMap } = await getNextDays(doctorId);

    let firstDaySlots: string[] = [];
    if (doctorDays.length > 0) {
        firstDaySlots = await getAvailableSlots(doctorId, doctorDays[0].date, scheduleMap, doctor.slotduration);
    }

    const response = {
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
    }

    setCache(cacheKey, response, 800);

    return response;
};


export const getDoctorSlots = async (doctorId: any, date: any): Promise<any> => {

    const cacheKey = `doctor_slots_${date}:${doctorId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const doctorResult = await pool.query(
        `SELECT id, "slotduration" FROM doctors WHERE id = $1`,
        [doctorId]
    );

    if (!doctorResult.rows.length) throw new ApiError(404, "Doctor not found");

    const workingHours = await pool.query(
        `SELECT day_of_week, start_time, end_time, is_available 
         FROM doctor_schedules 
         WHERE doctor_id = $1`,
        [doctorId]
    );

    const scheduleMap: Record<string, any> = {};
    for (const row of workingHours.rows) {
        scheduleMap[row.day_of_week.toLowerCase()] = row;
    }

    const slots = await getAvailableSlots(
        doctorId,
        date,
        scheduleMap,
        doctorResult.rows[0].slotduration
    );

    const response = { date, slots };

    setCache(cacheKey, response, 500);

    return response;
};

export const editDoctor = async (doctor: any, body: any, reqFile: any) => {

    const { name, phone, specialization, city, address, about, appointmentFee, slotduration } = body;

    const fields: any[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name) { fields.push(`name = $${paramIndex}`); params.push(name); paramIndex++; }
    if (phone) { fields.push(`phone = $${paramIndex}`); params.push(phone); paramIndex++; }
    if (city) { fields.push(`city = $${paramIndex}`); params.push(city); paramIndex++; }
    if (address) { fields.push(`address = $${paramIndex}`); params.push(address); paramIndex++; }
    if (specialization) { fields.push(`specialization = $${paramIndex}`); params.push(specialization); paramIndex++; }
    if (appointmentFee) { fields.push(`"appointmentFee" = $${paramIndex}`); params.push(appointmentFee); paramIndex++; }
    if (about) { fields.push(`about = $${paramIndex}`); params.push(about); paramIndex++; }
    if (slotduration) { fields.push(`slotduration = $${paramIndex}`); params.push(slotduration); paramIndex++; }

    if (reqFile) {
        fields.push(`"profilePic" = $${paramIndex}`); params.push(reqFile.path); paramIndex++;
        fields.push(`cloudinary_id = $${paramIndex}`); params.push(reqFile.filename); paramIndex++;
    }

    if (fields.length === 0) throw new ApiError(400, "No fields to update");

    fields.push(`"updatedAt" = NOW()`);
    params.push(doctor.id);

    const oldProfileResult = await pool.query(
        `SELECT cloudinary_id FROM doctors WHERE id = $1`,
        [doctor.id]
    );

    const result = await pool.query(`
        UPDATE doctors 
        SET ${fields.join(", ")} 
        WHERE id = $${paramIndex}
        RETURNING id,name,email,phone,"profilePic"
    `, params);

    if (result.rowCount === 0) throw new ApiError(404, "Doctor not found");

    clearCache("me_doctor:")



    if (reqFile && oldProfileResult.rows[0]?.cloudinary_id && oldProfileResult.rows[0].cloudinary_id !== "default") {
        setImmediate(async () => {
            await cloudinary.uploader.destroy(oldProfileResult.rows[0].cloudinary_id);
        });
    }

    return result.rows[0];

}

export const getDoctorScheduleForDoctor = async (doctor: any) => {
    const cacheKey = `doctor_schedule:${doctor.id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
        `SELECT id, day_of_week, start_time, end_time, is_available
         FROM doctor_schedules
         WHERE doctor_id = $1
         ORDER BY CASE day_of_week
             WHEN 'sunday' THEN 1
             WHEN 'monday' THEN 2
             WHEN 'tuesday' THEN 3
             WHEN 'wednesday' THEN 4
             WHEN 'thursday' THEN 5
             WHEN 'friday' THEN 6
             WHEN 'saturday' THEN 7
         END`,
        [doctor.id]
    );

    setCache(cacheKey, result.rows, 300);
    return result.rows;
};


export const editDoctorSchedule = async (doctor: any, schedule: { day_of_week: string, start_time: string, end_time: string, is_available: boolean }[]) => {

    const validDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    console.log("schedule", schedule)

    for (const day of schedule) {
        if (!validDays.includes(day.day_of_week.toLowerCase())) {
            throw new ApiError(400, `Invalid day: ${day.day_of_week}`);
        }
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        for (const day of schedule) {
            await client.query(
                `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_available)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET
                    start_time = $3,
                    end_time = $4,
                    is_available = $5`,
                [doctor.id, day.day_of_week.toLowerCase(), day.start_time, day.end_time, day.is_available]
            );
        }

        await client.query("COMMIT");

        clearCache(`doctor_schedule:${doctor.id}`);

        return await getDoctorScheduleForDoctor(doctor);

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }


};




// export const addReviewToDoctor = async (user: any, doctorId: any, { comment, rate }: any) => {

//     // const doctor = await Doctor.findById(doctorId).select("ratingsCount");

//     // if (!doctor) {
//     //     throw new ApiError(404, "Doctor not found");
//     // }

//     // const checkAppointment = await Appointment.findOne({
//     //     doctor: doctorId,
//     //     owner: user.id,
//     //     status: "completed"
//     // })

//     // if (!checkAppointment) {
//     //     throw new ApiError(404, "no appointment found");
//     // }

//     // const review = await DoctorReview.create({
//     //     doctor: doctorId,
//     //     user: user.id,
//     //     comment,
//     //     rate
//     // })

//     // doctor.ratingsCount += 1;
//     // await doctor.save()
//     return "";
// };
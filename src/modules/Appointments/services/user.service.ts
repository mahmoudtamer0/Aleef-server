import { clearCache, getCache, setCache } from "../../../cache";
import pool from "../../../db";
import { bookedAppointmentTemplate } from "../../../emails/appoinment.emails";
import { User } from "../../../types/user";
import ApiError from "../../../utils/ApiError";
import { sendEmail } from "../../../utils/sendEmail";
import { sendNotificationService } from "../../../utils/sendNotificationService";


export const bookAppointment = async (user: User, { pet, doctor, date, time, reason, notes }: any) => {

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const [userResult, doctorResult, petResult] = await Promise.all([
            client.query(
                `SELECT u.id, u.email, u.name,
                        COUNT(a.id) FILTER (WHERE a.status = ANY(ARRAY['pending', 'accepted'])) AS active_appointments,
                        COUNT(a.id) FILTER (
                            WHERE a.status = 'cancelled-by-owner'
                            AND a."updatedAt" >= NOW() - INTERVAL '15 days'
                        ) AS recent_cancellations
                 FROM users u
                 LEFT JOIN appointments a ON a.owner = u.id
                 WHERE u.id = $1
                 GROUP BY u.id`,
                [user.id]
            ),
            client.query(
                `SELECT d.id, d.name, d.city, d.address, "appointmentFee",
                COUNT(a.id) FILTER (WHERE a.status = ANY(ARRAY['pending', 'accepted']) AND TIME = $2 AND DATE::date = $3::date) AS active_appointments,
                d.status
                FROM doctors d
                LEFT JOIN appointments a ON a.doctor = d.id
                WHERE d.id = $1 AND d.status = 'active'
                GROUP BY d.id`,
                [doctor, time, date]
            ),
            client.query(`
                SELECT name FROM pets WHERE id = $1
                `, [pet])
        ]);



        if (!userResult.rows.length) throw new ApiError(404, "user not found");
        if (Number(userResult.rows[0].active_appointments) > 0) {
            throw new ApiError(400, "you have an active appointment, cancel your active appointment to be eligible to book another one");
        }

        if (Number(userResult.rows[0].recent_cancellations) > 2) {
            throw new ApiError(400, "you have too many cancelled appointments,wait a few days before booking another one");
        }


        if (!doctorResult.rows.length || doctorResult.rows[0].status !== "active") {
            throw new ApiError(400, "sorry this doctor is not available for appointments at the moment");
        }

        if (Number(doctorResult.rows[0].active_appointments) > 0) {
            throw new ApiError(400, "sorry this time is not available for this doctor, please select another time slot");
        }


        const appointmentResult = await client.query(
            `INSERT INTO appointments(owner, pet, doctor, date, time, reason, notes,"appoinmentFee")
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING * `,
            [
                user.id, pet, doctor, date, time, reason,
                notes && notes.trim().length > 0 ? notes : null, doctorResult.rows[0].appointmentFee
            ]
        );

        await client.query("COMMIT");

        clearCache(`activeAppointment:${user.id}`);
        clearCache(`appointmentsRequests:${doctor}`);

        setImmediate(() => {
            sendNotificationService(
                doctor,
                "DOCTOR",
                "New Appointment Request 🐾",
                `${user.name} has requested an appointment for ${petResult.rows[0].name}, Please review the request.`
            );

            sendEmail({
                email: userResult.rows[0].email,
                subject: "Appointment Booked Successfully 🐾",
                text: "Your appointment has been booked successfully",
                message: bookedAppointmentTemplate(userResult.rows[0].name, doctorResult.rows[0].name, doctorResult.rows[0].city, doctorResult.rows[0].address, doctorResult.rows[0].appointmentFee, date, time, reason),
            }).catch(err => {
                console.error("Email failed:", err);
            });
        });

        return appointmentResult.rows[0];



    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }

}


export const getActiveAppointment = async (user: User) => {

    const cacheKey = `activeAppointment:${user.id}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return cached;
    }

    const appointment = await pool.query(
        `SELECT a.id, a.date, a.time, a.reason, a.status, a.notes, a."appoinmentFee",
        a."createdAt", a."updatedAt",
        jsonb_build_object('id', d.id, 'name', d.name, 'email', d.email, 'profilePic', d."profilePic") AS doctor,
        jsonb_build_object('id', p.id, 'name', p.name) AS pet
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor = d.id
        LEFT JOIN pets p ON a.pet = p.id
        WHERE a.owner = $1
        AND a.status IN ('pending', 'accepted')
        ORDER BY a."updatedAt" DESC
        LIMIT 1`,
        [user.id]
    );

    const response = appointment.rowCount != 0 ? appointment.rows[0] : "empty";

    setCache(cacheKey, response, 800);

    return response;

}

export const getAppointmentDetailsForUser = async (appointmentId: any) => {

    const cacheKey = `appointment_details_user:${appointmentId}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return cached;
    }


    const appointment = await pool.query(
        `SELECT a.id,a.owner, a.date, a.time, a.reason, a.status, a.notes,
        a."createdAt", a."updatedAt",a."appoinmentFee",
        jsonb_build_object('id', d.id, 'name', d.name, 'email', d.email,'city', d.city, 'address', d.address, 'phone', d.phone, 'specialization', d.specialization, 'rating', d.rating, 'ratingsCount', d."ratingsCount", 'profilePic', d."profilePic") AS doctor,
        jsonb_build_object('id', p.id, 'name', p.name , 'type', p.type, 'gender', p.gender, 'profilePic', p."profilePic") AS pet
        FROM appointments a
        JOIN doctors d ON d.id = a.doctor
        JOIN pets p ON p.id = a.pet
        WHERE a.id = $1`,
        [appointmentId]
    );

    if (appointment.rows.length === 0) throw new ApiError(404, "appointment not found");

    let chat = null;
    if (appointment.rows[0].status === "accepted") {
        const chatResult = await pool.query(
            `SELECT c.id FROM chats c
             JOIN chat_members cm1 ON c.id = cm1."chatId" AND cm1.member_id = $1
             JOIN chat_members cm2 ON c.id = cm2."chatId" AND cm2.member_id = $2
            WHERE c.chat_type = 'personal' LIMIT 1`,
            [appointment.rows[0].owner, appointment.rows[0].doctor.id]
        );
        chat = chatResult.rows[0] || null;
    }
    const response = { appointment: appointment.rows[0], chat };

    setCache(cacheKey, response, 100);


    return response;

}

export const getPrevAppointments = async (user: any) => {
    const cacheKey = `prevAppointments:${user.id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
        `SELECT a.id, a.date, a.time, a.reason, a.status,
            jsonb_build_object('id', d.id, 'name', d.name, 'profilePic', d."profilePic", 'specialization', d.specialization) AS doctor,
            jsonb_build_object('id', p.id, 'name', p.name) AS pet
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor = d.id
        LEFT JOIN pets p ON a.pet = p.id
        WHERE a.owner = $1 AND a.status IN ('cancelled', 'completed')
        ORDER BY a."updatedAt" DESC`,
        [user.id]
    );

    setCache(cacheKey, result.rows, 300);
    return result.rows;
};

export const cancelAppointmentByUser = async (user: User, appointmentId: string, reason: string) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const appointmentResult = await client.query(
            `UPDATE appointments
             SET status = 'cancelled-by-owner', "updatedAt" = NOW(),"cancelledReason" = $3
             WHERE id = $1
               AND owner = $2
               AND status IN ('pending', 'accepted')
             RETURNING *`,
            [appointmentId, user.id, reason]
        );

        if (!appointmentResult.rows.length) {
            throw new ApiError(404, "appointment not found");
        }


        await client.query("COMMIT");

        clearCache(`activeAppointment:${user.id}`);
        clearCache(`prevAppointments:${user.id}`);
        clearCache(`appointment_details_user:${appointmentId}`);
        clearCache(`appointmentsRequests:${appointmentResult.rows[0].doctor}`);
        clearCache(`active_appointments_doctor:${appointmentResult.rows[0].doctor}_${appointmentResult.rows[0].date}`);
        clearCache(`appointment_details_doctor:${appointmentId}`);

        setImmediate(() => {
            sendNotificationService(
                appointmentResult.rows[0].doctor,
                "DOCTOR",
                "Appointment Cancelled 🐾",
                `${user.name} has cancelled their appointment.`
            );
        });

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const checkPendingReview = async (user: User) => {
    const cacheKey = `pending_review:${user.id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
        `SELECT a.id as appointmentId,
            jsonb_build_object('id', d.id, 'name', d.name, 'profilePic', d."profilePic", 'specialization', d.specialization) AS doctor
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor = d.id
        WHERE a.owner = $1 AND a.status = 'completed'
        AND a."isReviewed" = false
        ORDER BY a."updatedAt" DESC LIMIT 1`,
        [user.id]
    );

    const response = result.rows.length > 0 ? result.rows[0] : "empty";
    setCache(cacheKey, response, 300);
    return response;
}

export const addReview = async (user: User, appointmentId: string, rate: number, comment: string) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const appointmentResult = await client.query(
            `UPDATE appointments
             SET "isReviewed" = true, "updatedAt" = NOW()
             WHERE id = $1
               AND owner = $2
               AND status = 'completed'
               AND "isReviewed" = false
             RETURNING id,doctor`,
            [appointmentId, user.id]
        );

        if (!appointmentResult.rows.length) {
            throw new ApiError(404, "appointment not found");
        }

        await Promise.all([
            client.query(
                `UPDATE doctors
                 SET "rating" = ("rating" * "ratingsCount" + $2) / ("ratingsCount" + 1),
                     "ratingsCount" = "ratingsCount" + 1,
                     "updatedAt" = NOW()
                 WHERE id = $1`,
                [appointmentResult.rows[0].doctor, rate]
            ),
            client.query(
                `INSERT INTO doctor_reviews(doctor, "user", rate, comment, "createdAt", "updatedAt")
                VALUES($1, $2, $3, $4, NOW(), NOW())`,
                [appointmentResult.rows[0].doctor, user.id, rate, comment && comment.length > 0 ? comment : null]
            )
        ])

        await client.query("COMMIT");

        clearCache(`activeAppointment:${user.id}`);
        clearCache(`prevAppointments:${user.id}`);
        clearCache(`appointment_details_user:${appointmentId}`);
        clearCache(`appointment_details_doctor:${appointmentId}`);
        clearCache(`pending_review:${user.id}`);
        clearCache(`doctor_details:${appointmentResult.rows[0].doctor}`);

        setImmediate(() => {
            sendNotificationService(
                appointmentResult.rows[0].doctor,
                "DOCTOR",
                "Appointment Reviewed 🐾",
                `${user.name} has reviewed your appointment.`
            );
        });

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export const skipAppointmentReview = async (user: User, appointmentId: string) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const appointmentResult = await client.query(
            `UPDATE appointments
             SET "isReviewed" = true, "updatedAt" = NOW()
             WHERE id = $1
               AND owner = $2
               AND status = 'completed'
               AND "isReviewed" = false
             RETURNING id,doctor`,
            [appointmentId, user.id]
        );

        if (!appointmentResult.rows.length) {
            throw new ApiError(404, "appointment not found");
        }

        await client.query("COMMIT");

        clearCache(`pending_review:${user.id}`);
        clearCache(`prevAppointments:${user.id}`);
        clearCache(`appointment_details_user:${appointmentId}`);
        clearCache(`appointment_details_doctor:${appointmentId}`);

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}
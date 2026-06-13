import { getCache, setCache, clearCache } from "../../../cache";
import pool from "../../../db";
import { acceptedAppointmentTemplate, endAppointmentTemplate, rejectedAppointmentTemplate } from "../../../emails/appoinment.emails";
import { getIO } from "../../../sockets/socket";
import ApiError from "../../../utils/ApiError";
import { getAge } from "../../../utils/getPetAge";
import { sendEmail } from "../../../utils/sendEmail";
import { sendNotificationService } from "../../../utils/sendNotificationService";

export const getAppointmentsRequestsForDoctor = async (doctor: any, params: any) => {

    const page = Number(params.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const cacheKey = `appointmentsRequests:${doctor.id}_${page}_${limit}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return cached;
    }

    const result = await pool.query(
        `SELECT 
            a.id, a.date, a.time, a.reason, a.status, a.notes, a."createdAt",
            jsonb_build_object('id', p.id, 'name', p.name, 'type', p.type, 'gender', p.gender, 'profilePic', p."profilePic") AS pet,
            jsonb_build_object('id', u.id, 'name', u.name) AS owner,
            COUNT(*) OVER() AS total_count
        FROM appointments a
        LEFT JOIN pets p ON a.pet = p.id
        LEFT JOIN users u ON a.owner = u.id
        WHERE a.doctor = $1 AND a.status = 'pending'
        ORDER BY a."createdAt" DESC
        LIMIT $2 OFFSET $3`,
        [doctor.id, limit, offset]
    );

    const response = {
        results: result.rowCount,
        page,
        totalRequests: Number(result.rows[0]?.total_count ?? 0),
        totalPages: Math.ceil(Number(result.rows[0]?.total_count ?? 0) / limit),
        appointments: result.rows,
    };

    setCache(cacheKey, response, 500);

    return response;


}

export const getActiveAppoinmentsForDoctor = async (doctor: any, date: any) => {
    if (!date) date = new Date().toISOString().split('T')[0];

    const formattedDate = date.split('-').reverse().join('-');

    const cacheKey = `active_appointments_doctor:${doctor.id}_${date}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
        `SELECT a.id,TO_CHAR(a.date, 'YYYY-MM-DD') AS date, a.time, a.reason, a.status, a."createdAt",
        jsonb_build_object('id', p.id, 'name', p.name, 'type', p.type, 'gender', p.gender, 'profilePic', p."profilePic") AS pet,
        jsonb_build_object('id', u.id, 'name', u.name) AS owner,
        COUNT(*) OVER() AS total_count
        FROM appointments a
         JOIN pets p ON a.pet = p.id
         JOIN users u ON a.owner = u.id
        WHERE a.doctor = $1 AND a.status = 'accepted' AND a.date = $2::date
        ORDER BY a.time ASC
        `,
        [doctor.id, formattedDate]
    );

    const appointments = result.rows.map(row => ({ ...row, date: row.date.split('-').reverse().join('-') })
    );

    setCache(cacheKey, appointments, 300);

    return appointments;
}

export const getAppointmentDetailsForDoctor = async (doctor: any, appointmentId: any) => {

    console.log("getAppointmentDetailsForDoctor")

    const cacheKey = `appointment_details_doctor:${appointmentId}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return cached;
    }


    const appointment = await pool.query(
        `SELECT a.id, a.date, a.time, a.reason, a.status, a.notes,
        a."createdAt", a."updatedAt",a."appoinmentFee",
        jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email,'phone', u.phone, 'profilePic', u."profilePic") AS owner,
        jsonb_build_object('id', p.id, 'name', p.name , 'type', p.type, 'gender', p.gender, 'profilePic', p."profilePic" , 'birthDate', p."birthDate", 'weight', p.weight) AS pet
        FROM appointments a
        JOIN users u ON u.id = a.owner
        JOIN pets p ON p.id = a.pet
        WHERE a.id = $1 AND a.doctor = $2`,
        [appointmentId, doctor.id]
    );


    if (appointment.rows.length === 0) throw new ApiError(404, "appointment not found");

    let chat = null;


    // if (appointment.status === "accepted") {
    //     chat = await Chat.findOne({
    //         "members.memberId": {
    //             $all: [appointment.doctor._id, appointment.owner]
    //         },
    //         chatType: "personal"
    //     }).lean().select("_id")
    // }


    const pet = appointment.rows[0].pet;
    pet.age = getAge(pet.birthDate);

    const response = { appointment: appointment.rows[0], chat };

    setCache(cacheKey, response, 500);

    return response;

}

export const approveAppointment = async (doctor: any, appointmentId: any) => {
    const io = getIO();

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const appointment = await client.query(
            `UPDATE appointments SET status = 'accepted' WHERE id = $1 AND doctor = $2 AND status = 'pending' RETURNING *`,
            [appointmentId, doctor.id]
        );

        if (appointment.rowCount === 0) throw new Error("Appointment not found");

        const findAnotherAppointmentForThisDoc = await client.query(`
            SELECT id FROM appointments
            WHERE doctor = $1 AND time = $2 AND date = $3 AND status = 'accepted' AND id != $4 LIMIT 1`,
            [doctor.id, appointment.rows[0].time, appointment.rows[0].date, appointmentId]);

        if (findAnotherAppointmentForThisDoc.rowCount! > 0) {
            throw new ApiError(
                400,
                "sorry this time is not available for this doctor, please ask the patient to select another time slot"
            );
        }

        let [userProfile, chat] = await Promise.all([
            client.query(
                `SELECT id, email, name FROM users WHERE id = $1`,
                [appointment.rows[0].owner]
            ),
            client.query(
                `SELECT c.id FROM chats c
                 JOIN chat_members cm1 ON c.id = cm1."chatId" AND cm1.member_id = $1
                 JOIN chat_members cm2 ON c.id = cm2."chatId" AND cm2.member_id = $2
                 WHERE c.chat_type = 'personal'
                 LIMIT 1`,
                [appointment.rows[0].owner, doctor.id]
            )
        ]);

        if (!userProfile.rows.length) throw new ApiError(404, "user not found");

        if (chat.rowCount === 0) {

            chat = await client.query(
                `INSERT INTO chats (chat_type) VALUES ('personal') RETURNING id`
            );
            await client.query(
                `INSERT INTO chat_members ("chatId", member_id, member_model) VALUES ($1, $2, 'User'), ($1, $3, 'Doctor')`,
                [chat.rows[0].id, appointment.rows[0].owner, doctor.id]
            );
        } else {
            await client.query(`UPDATE chats SET status = 'active' WHERE id = $1`, [chat.rows[0].id]);
        }

        const message = await client.query(
            `INSERT INTO messages ("chatId", sender, sender_model, chat_type, text)
            VALUES ($1, $2, $3, 'personal', $4)
            RETURNING id,text`,
            [chat.rows[0].id, doctor.id, "Doctor", "Hello " + userProfile.rows[0].name + ", I'm available for you now. if you have any questions, please send a message to me."]
        );

        await client.query(
            `INSERT INTO unread_messages ("chatId", user_id, "lastMessage", "unreadCount")
            VALUES ($1, $2, $3, 1)
            ON CONFLICT ("chatId", user_id) DO UPDATE SET
                "unreadCount" = unread_messages."unreadCount" + 1,
                "lastMessage" = $3
            RETURNING "unreadCount"`,
            [chat.rows[0].id, appointment.rows[0].owner, message.rows[0].text]
        );

        await client.query(`UPDATE chats SET "lastMessage" = $1 WHERE id = $2`, [message.rows[0].id, chat.rows[0].id]);


        await client.query("COMMIT");

        clearCache(`chats:${appointment.rows[0].owner}`);
        clearCache(`chat_messages_${appointment.rows[0].owner}_${chat.rows[0].id}`);
        clearCache(`all_chats:`);
        clearCache(`chats:${doctor.id}`);
        clearCache(`chat_messages_${doctor.id}_${chat.rows[0].id}`);
        clearCache(`activeAppointment:${appointment.rows[0].owner}`);
        clearCache(`appointmentsRequests:${doctor.id}`);
        clearCache(`appointment_details_user:${appointment.rows[0].id}`);
        clearCache(`appointment_details_doctor:${appointment.rows[0].id}`);
        clearCache(`doctor_schedual:${doctor.id}`);
        clearCache(`doctor_slots_${appointment.rows[0].date}:${doctor.id}`);
        clearCache(`appointments:`);


        setImmediate(async () => {

            let isOnline = false;

            try {
                const sockets = await io.in(`user:${userProfile.rows[0].id.toString()}`).fetchSockets();
                isOnline = sockets.length > 0;
            } catch (err) {
                isOnline = false;
            }

            if (isOnline) {
                io.to(`user:${userProfile.rows[0].id.toString()} `).emit("notification", {
                    type: "APPOINTMENT_ACCEPTED",
                    title: "Appointment Accepted ✅",
                    body: `Doctor ${doctor.name} has accepted your appoinment`,
                    data: {
                        appointmentId: appointment.rows[0].id,
                        date: appointment.rows[0].date,
                    }
                })
            } else {
                sendNotificationService(
                    userProfile.rows[0].id,
                    "USER",
                    "Appointment Confirmed ✅",
                    `Your appointment with Dr. ${doctor.name} has been confirmed. Don't Be Late!`
                );
            }

            // await Notification.create({
            //     userId: userProfile._id,
            //     title: "Appointment accepted",
            //     body: `Doctor ${doctor.name} has accepted your appoinment`,
            //     type: "APPOINTMENT",
            //     data: {
            //         appointmentId: appointment._id,
            //         date: appointment.date,
            //     }
            // })

            sendEmail({
                email: userProfile.rows[0].email,
                subject: "Appointment Accepted ✅",
                text: `Hello ${userProfile.rows[0].name}, your appointment has been accepted on ${appointment.rows[0].date} at ${appointment.rows[0].time}.`,
                message: acceptedAppointmentTemplate(userProfile.rows[0].name, appointment.rows[0].date, appointment.rows[0].time, appointment.rows[0].reason),
            }).catch(err => {
                console.error("Email failed:", err);
            });
        })


    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export const rejectAppointment = async (
    doctor: any,
    appointmentId: any,
    rejectionReason: string
) => {

    const io = getIO();

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const appointment = await client.query(
            `UPDATE appointments
             SET status = 'rejected',
                 "rejectionReason" = $3,
                 "expiresAt" = NOW() + INTERVAL '3 days'
             WHERE id = $1
               AND doctor = $2
               AND status = 'pending'
             RETURNING *`,
            [appointmentId, doctor.id, rejectionReason]
        );

        if (appointment.rowCount === 0) {
            throw new ApiError(404, "Appointment not found or not pending");
        }

        const userProfile = await client.query(
            `SELECT id,email,name
             FROM users
             WHERE id = $1`,
            [appointment.rows[0].owner]
        );

        if (!userProfile.rows.length) {
            throw new ApiError(404, "user not found");
        }

        await client.query("COMMIT");

        clearCache(`activeAppointment:${appointment.rows[0].owner}`);
        clearCache(`appointmentsRequests:${doctor.id}`);
        clearCache(`appointment_details_user:${appointment.rows[0].id}`);
        clearCache(`appointment_details_doctor:${appointment.rows[0].id}`);
        clearCache(`appointments:`);

        setImmediate(async () => {

            let isOnline = false;

            try {
                const sockets = await io
                    .in(`user:${userProfile.rows[0].id.toString()} `)
                    .fetchSockets();

                isOnline = sockets.length > 0;

            } catch {
                isOnline = false;
            }

            if (isOnline) {

                io.to(`user:${userProfile.rows[0].id.toString()} `).emit(
                    "notification",
                    {
                        type: "APPOINTMENT_REJECTED",
                        title: "Appointment Rejected ❗",
                        body: rejectionReason,
                        data: {
                            appointmentId: appointment.rows[0].id,
                            date: appointment.rows[0].date,
                        }
                    }
                );
            }

            sendEmail({
                email: userProfile.rows[0].email,
                subject: "Appointment Update ❗",
                text: `Hello ${userProfile.rows[0].name}, your appointment request on ${appointment.rows[0].date} at ${appointment.rows[0].time} could not be accepted.`,
                message: rejectedAppointmentTemplate(userProfile.rows[0].name, appointment.rows[0].date, appointment.rows[0].time, appointment.rows[0].reason, appointment.rows[0].rejectionReason),
            }).catch(err => {
                console.error("Email failed:", err);
            });

        });

        return appointment.rows[0];

    } catch (err) {

        await client.query("ROLLBACK");
        throw err;

    } finally {

        client.release();

    }
};

export const endAppointment = async (
    doctor: any,
    appointmentId: any,
    medicalRecord: any,
    vaccination: any,
    upCommingVaccination: any,
    files: any,
) => {
    const io = getIO();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const appointmentResult = await client.query(
            `SELECT a.id, a.date, a.time, a.status,
                jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email) AS owner,
                jsonb_build_object('id', p.id, 'name', p.name) AS pet
             FROM appointments a
             JOIN users u ON a.owner = u.id
             JOIN pets p ON a.pet = p.id
             WHERE a.id = $1 AND a.doctor = $2 AND a.status = 'accepted'`,
            [appointmentId, doctor.id]
        );

        if (!appointmentResult.rows.length) throw new ApiError(404, "Appointment not found or not accepted");

        const appointment = appointmentResult.rows[0];

        if (!medicalRecord?.title || !medicalRecord?.condition || !medicalRecord?.description) {
            throw new ApiError(400, "Medical record is required");
        }

        const attachments: string[] = files?.length > 0 ? files.map((f: any) => f.path) : [];

        const medicalRecordResult = await client.query(
            `INSERT INTO medical_records (pet, doctor, title, condition, description, attachments, date)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             RETURNING *`,
            [appointment.pet.id, doctor.id, medicalRecord.title, medicalRecord.condition, medicalRecord.description, attachments]
        );

        let createdVaccination = null;

        if (vaccination?.vaccineName) {
            const vaccinExist = await client.query(
                `SELECT id FROM vaccinations WHERE pet = $1 AND "vaccineName" = $2`,
                [appointment.pet.id, vaccination.vaccineName]
            );

            if (vaccinExist.rows.length) {
                const updated = await client.query(
                    `UPDATE vaccinations SET type = 'vaccined', "vaccinatedAt" = NOW(), "nextDueDate" = NULL, "updatedAt" = NOW()
                     WHERE id = $1 RETURNING *`,
                    [vaccinExist.rows[0].id]
                );
                createdVaccination = updated.rows[0];
            } else {
                const created = await client.query(
                    `INSERT INTO vaccinations (pet, doctor, type, "vaccineName", dose, notes, "vaccinatedAt")
                     VALUES ($1, $2, 'vaccined', $3, $4, $5, NOW())
                     RETURNING *`,
                    [appointment.pet.id, doctor.id, vaccination.vaccineName, vaccination?.dose || null, vaccination?.notes || null]
                );
                createdVaccination = created.rows[0];
            }
        }

        let createdUpCommingVaccination = null;

        if (upCommingVaccination?.vaccineName) {
            const created = await client.query(
                `INSERT INTO vaccinations (pet, doctor, type, "vaccineName", "nextDueDate")
                 VALUES ($1, $2, 'upcomming', $3, $4)
                 RETURNING *`,
                [appointment.pet.id, doctor.id, upCommingVaccination.vaccineName, upCommingVaccination?.nextDueDate.split('-').reverse().join('-') || null]
            );
            createdUpCommingVaccination = created.rows[0];
        }

        await client.query(
            `UPDATE appointments SET status = 'completed', "updatedAt" = NOW() WHERE id = $1`,
            [appointmentId]
        );

        await client.query("COMMIT");

        clearCache(`appointment_details_user:${appointmentId}`);
        clearCache(`appointment_details_doctor:${appointmentId}`);
        clearCache(`activeAppointment:${appointment.owner.id}`);
        clearCache(`prevAppointments:${appointment.owner.id}`);
        clearCache(`pet_profile:${appointment.pet.id}`);
        clearCache(`appointments:`);
        clearCache(`prevAppointmentsDoctor:${doctor.id}`);
        clearCache(`active_appointments_doctor:${doctor.id}`);

        setImmediate(async () => {

            let isOnline = false;

            try {
                const sockets = await io.in(`user:${appointmentResult.rows[0].owner.id.toString()}`).fetchSockets();
                isOnline = sockets.length > 0;
            } catch (err) {
                isOnline = false;
            }

            if (isOnline) {
                io.to(`user:${appointmentResult.rows[0].owner.id.toString()}`).emit("notification", {
                    type: "APPOINTMENT_COMPLETED",
                    title: "Appointment Completed ✅",
                    body: `Doctor ${doctor.name} has completed your appoinment`,
                    data: {
                        appointmentId: appointmentResult.rows[0].id,
                        date: appointmentResult.rows[0].date,
                    }
                })
            } else {
                sendNotificationService(
                    appointmentResult.rows[0].owner.id,
                    "USER",
                    "Appointment Completed ✅",
                    `Your appointment with Dr. ${doctor.name} has been completed. Tell Us Your Feelings!`
                );
            }

            sendEmail({
                email: appointment.owner.email,
                subject: "Appointment Completed Successfully 🐾",
                text: `Hello ${appointment.owner.name}, your appointment for ${appointment.pet.name} has been completed successfully.`,
                message: endAppointmentTemplate(appointment, createdVaccination, createdUpCommingVaccination),
            }).catch(err => console.error("Email failed:", err));
        });

        return {
            medicalRecord: medicalRecordResult.rows[0],
            vaccination: createdVaccination,
            appointment
        };

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const prevAppointmentsForDoctor = async (doctor: any) => {

    const cacheKey = `prevAppointmentsDoctor:${doctor.id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
        `SELECT a.id, a.date, a.time, a.reason, a.status,
        jsonb_build_object('id', u.id, 'name', u.name) AS owner,
        jsonb_build_object('id', u.id, 'rate',d.rating,'ratingsCount',d."ratingsCount") AS doctor,
        jsonb_build_object('id', p.id, 'name', p.name, 'type', p.type, 'gender', p.gender, 'profilePic', p."profilePic") AS pet,
        COUNT(*) FILTER (WHERE a.status = 'completed') OVER() AS "completedCount",
        COUNT(*) FILTER (WHERE a.status = 'cancelled') OVER() AS "completedCount",
        COUNT(*) OVER() AS "totalCount"
        FROM appointments a
        JOIN users u ON u.id = a.owner
        JOIN doctors d ON d.id = a.doctor
        JOIN pets p ON p.id = a.pet
        WHERE a.doctor = $1 AND a.status IN ('cancelled', 'completed')
        ORDER BY a."updatedAt" DESC LIMIT 8`,
        [doctor.id]
    );

    const appoinmentsCounts = { totalAppoinments: Number(result.rows[0]?.totalCount ?? 0), completedAppoinments: Number(result.rows[0]?.completedCount ?? 0) };

    const appoinments = result.rows.map(({ completedCount, totalCount, doctor, ...rest }) => rest);

    const doctorRating = {
        rating: result.rows[0].doctor.rate,
        ratingCount: result.rows[0].doctor.ratingsCount
    }

    const response = {
        appointments: appoinments,
        appoinmentsCounts,
        doctorRating
    };

    setCache(cacheKey, response, 500);

    return response;
}
import { clearCache } from "../../../../cache";
import pool from "../../../../db";
import { acceptedAppointmentTemplate, rejectedAppointmentTemplate, endAppointmentTemplate } from "../../../../emails/appoinment.emails";
import { getIO } from "../../../../sockets/socket";
import { User } from "../../../../types/user";
import ApiError from "../../../../utils/ApiError";
import { sendEmail } from "../../../../utils/sendEmail";
import { sendNotificationService } from "../../../../utils/sendNotificationService";


export const approveAppointment = async (doctor: User, appointmentId: string) => {
    const io = getIO();

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const appointment = await client.query(
            `UPDATE appointments SET status = 'accepted', "updatedAt" = NOW() WHERE id = $1 AND doctor = $2 AND status = 'pending' RETURNING *`,
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

            console.log("isOnline", isOnline);

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
    doctor: User,
    appointmentId: string,
    rejectionReason: string
) => {

    const io = getIO();

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        console.log("doctor", doctor)

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
            } else {
                sendNotificationService(
                    userProfile.rows[0].id,
                    "USER",
                    "Appointment Rejected ❗",
                    `Your appointment with Dr. ${doctor.name} has been rejected. Book a new appointment!`
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



export const cancelAppointmentByDoctor = async (doctor: User, appointmentId: string, reason: string) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const appointmentResult = await client.query(
            `UPDATE appointments
             SET status = 'cancelled-by-doctor', "updatedAt" = NOW(), "cancelledReason" = $3
             WHERE id = $1
               AND doctor = $2
               AND status IN ('pending', 'accepted')
             RETURNING *`,
            [appointmentId, doctor.id, reason]
        );

        if (!appointmentResult.rows.length) {
            throw new ApiError(404, "appointment not found");
        }

        await client.query("COMMIT");

        clearCache(`activeAppointment:${appointmentResult.rows[0].owner}`);
        clearCache(`prevAppointments:${appointmentResult.rows[0].owner}`);
        clearCache(`appointment_details_user:${appointmentId}`);
        clearCache(`appointmentsRequests:${doctor.id}`);
        clearCache(`active_appointments_doctor:${doctor.id}_${appointmentResult.rows[0].date}`);
        clearCache(`appointment_details_doctor:${appointmentId}`);

        setImmediate(() => {
            sendNotificationService(
                appointmentResult.rows[0].owner,
                "USER",
                "Appointment Cancelled 🐾",
                `Dr. ${doctor.name} has cancelled your appointment.`
            );
        });

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const endAppointment = async (
    doctor: User,
    appointmentId: string,
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
        clearCache(`pending_review:${appointment.owner.id}`);

        setImmediate(async () => {

            let isOnline = false;

            try {
                const sockets = await io.in(`user:${appointmentResult.rows[0].owner.id.toString()}`).fetchSockets();
                isOnline = sockets.length > 0;
            } catch (err) {
                isOnline = false;
            }


            if (isOnline) {
                console.log("isOnline", isOnline);
                console.log("to user", appointmentResult.rows[0].owner.id.toString());
                io.to(`user:${appointmentResult.rows[0].owner.id.toString()}`).emit("notification", {
                    type: "APPOINTMENT_COMPLETED",
                    title: "Appointment Completed ✅",
                    body: `Doctor ${doctor.name} has completed your appoinment`,
                    data: {
                        type: "appointment",//order,chat_message,
                        appointmentId: appointmentResult.rows[0].id,//order.id,chat.id,
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
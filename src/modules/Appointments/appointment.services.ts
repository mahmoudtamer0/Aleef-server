import ApiError from "../../utils/ApiError";
import { sendEmail } from "../../utils/sendEmail";
import { getIO } from "../../sockets/socket";
import pool from "../../db";
import { clearCache, getCache, setCache } from "../../cache";
import { getAge } from "../../utils/getPetAge";




export const bookAppointment = async (user: any, { pet, doctor, date, time, reason, notes }: any) => {

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const [userResult, doctorResult] = await Promise.all([
            client.query(
                `SELECT u.id, u.email, u.name,
                        COUNT(a.id) FILTER (WHERE a.status = ANY(ARRAY['pending', 'accepted'])) AS active_appointments
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
            )
        ]);



        if (!userResult.rows.length) throw new ApiError(404, "user not found");
        if (Number(userResult.rows[0].active_appointments) > 0) {
            throw new ApiError(400, "you have an active appointment, cancel your active appointment to be eligible to book another one");
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
            sendEmail({
                email: userResult.rows[0].email,
                subject: "Appointment Booked Successfully 🐾",
                text: "",
                message: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">

            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                <h1 style="color: #267D77; text-align: center;">Aleef</h1>
                <h2 style="text-align: center; color: #333;">Appointment Request Received</h2>

                <p style="color: #555; font-size: 16px;">
                    Hello ${userResult.rows[0].name}, your appointment request has been successfully submitted ✅
                </p>

                <hr style="margin: 20px 0;" />

                <h3 style="color: #267D77;">Doctor Details</h3>
                <p><strong>Doctor:</strong> ${doctorResult.rows[0].name}</p>
                <p><strong>City:</strong> ${doctorResult.rows[0].city}</p>
                <p><strong>Address:</strong> ${doctorResult.rows[0].address}</p>
                <p><strong>Fee:</strong> ${doctorResult.rows[0].appointmentFee} EGP</p>

                <hr style="margin: 20px 0;" />

                <h3 style="color: #267D77;">Appointment Details</h3>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Time:</strong> ${time}</p>
                <p><strong>Reason:</strong> ${reason}</p>

                <div style="background:#fff3cd; padding:15px; border-radius:8px; margin-top:20px;">
                    <p style="margin:0; color:#856404; font-size:14px;">
                        ⚠️ Your appointment is currently <strong>pending confirmation</strong> from the doctor.  
                        You will receive another email once it is accepted.
                    </p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #777; font-size: 14px;">
                        Please arrive on time once your appointment is accepted 🐶🐱
                    </p>
                </div>

                <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                    <p>If you did not request this appointment, please contact support.</p>

                    <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                </div>

            </div>

        </div>
        `
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

export const getAllAppoinments = async (reqQuery: any) => {
    const { page = "1", limit = "10", search = "", status } = reqQuery;

    const currentPage = Number(page);
    const perPage = Number(limit);
    const offset = (currentPage - 1) * perPage;

    const cacheKey = `appointments:${page}_${limit}_${status}_${search}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return cached;
    }

    const filters: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search && search !== "") {
        filters.push(`(
            a.reason ILIKE $${paramIndex} OR
            u.name ILIKE $${paramIndex} OR
            d.name ILIKE $${paramIndex} OR
            p.name ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
    }

    if (status) {
        filters.push(`a.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const mainQuery = `
    SELECT
        a.id, a.date, a.time, a.reason, a.status, a.notes, a."rejectionReason",
        a."createdAt", a."updatedAt",
        jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email, 'profilePic', u."profilePic") AS owner,
        jsonb_build_object('id', d.id, 'name', d.name, 'email', d.email, 'profilePic', d."profilePic") AS doctor,
        jsonb_build_object('id', p.id, 'name', p.name) AS pet,
        COUNT(*) OVER() AS total_count
    FROM appointments a
    LEFT JOIN users u ON a.owner = u.id
    LEFT JOIN doctors d ON a.doctor = d.id
    LEFT JOIN pets p ON a.pet = p.id
    ${whereClause}
    ORDER BY a."updatedAt" DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
`;

    params.push(perPage, offset);

    const result = await pool.query(mainQuery, params);

    const totalAppointments = Number(result.rows[0]?.total_count ?? 0);

    const response = {
        totalAppointments,
        results: result.rowCount,
        page: currentPage,
        totalPages: Math.ceil(totalAppointments / perPage),
        appointments: result.rows,
        currentPage
    };

    setCache(cacheKey, response, 500);


    return response;

}

export const getActiveAppointment = async (user: any) => {

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

    setCache(cacheKey, response, 500);


    return response;

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
                const sockets = await io.in(`user:${userProfile.rows[0].id.toString()} `).fetchSockets();
                isOnline = sockets.length > 0;
            } catch (err) {
                isOnline = false;
            }

            if (isOnline) {
                io.to(`user:${userProfile.rows[0].id.toString()} `).emit("notification", {
                    type: "APPOINTMENT_REJECTED",
                    title: "Appointment Rejected ❗",
                    body: `Doctor ${doctor.name} has accepted your appoinment`,
                    data: {
                        appointmentId: appointment.rows[0].id,
                        date: appointment.rows[0].date,
                    }
                })
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
                message: `
                <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            
                        <h1 style="color: #267D77; text-align: center; margin-bottom: 10px;">
                            Aleef
                        </h1>
            
                        <h2 style="text-align: center; color: #333;">
                            Your Appointment Has Been Accepted! ✅
                        </h2>
            
                        <p style="color: #555; font-size: 16px;">
                            Hello <strong>${userProfile.rows[0].name}</strong>,
                            your appointment has been accepted by the doctor.
                        </p>
            
                        <hr style="margin: 20px 0;" />
            
                        <h3 style="color: #267D77;">
                            Appointment Details
                        </h3>
            
                        <p><strong>Date:</strong> ${appointment.rows[0].date}</p>
                        <p><strong>Time:</strong> ${appointment.rows[0].time}</p>
                        <p><strong>Reason:</strong> ${appointment.rows[0].reason}</p>
            
                        <div style="text-align: center; margin-top: 30px;">
                            <p style="color: #777; font-size: 14px;">
                                Please arrive on time for your appointment 🐶🐱
                            </p>
                        </div>
            
                        <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                            <p>Your chat with the doctor is now open.</p>
                            <p>If you have any questions, please contact support.</p>
                            <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                        </div>
            
                    </div>
                </div>
                `
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

    // const appointment = await Appointment.findOneAndUpdate(
    //     {
    //         _id: appointmentId,
    //         doctor: doctor.id,
    //         status: "pending"
    //     },
    //     {
    //         status: "accepted"
    //     },
    //     {
    //         new: true
    //     }
    // ).lean();

    // if (!appointment) {
    //     throw new ApiError(404, "appointment not found");
    // }

    // const findAnotherAppointmentForThisDoc = await Appointment.findOne({
    //     doctor: doctor.id,
    //     time: appointment.time,
    //     date: appointment.date,
    //     status: "accepted",
    //     _id: { $ne: appointment._id }
    // })
    //     .lean()
    //     .select("_id");

    // if (findAnotherAppointmentForThisDoc) {

    //     await Appointment.updateOne(
    //         { _id: appointment._id },
    //         { status: "pending" }
    //     );

    //     throw new ApiError(
    //         400,
    //         "sorry this time is not available for this doctor, please ask the patient to select another time slot"
    //     );
    // }



    // const [userProfile, chat] = await Promise.all([

    //     User.findById(appointment.owner)
    //         .lean()
    //         .select("email name"),

    //     Chat.findOneAndUpdate(
    //         {
    //             chatType: "personal",
    //             $and: [
    //                 {
    //                     members: {
    //                         $elemMatch: {
    //                             memberId: doctor.id,
    //                             memberModel: "Doctor"
    //                         }
    //                     }
    //                 },
    //                 {
    //                     members: {
    //                         $elemMatch: {
    //                             memberId: appointment.owner,
    //                             memberModel: "User"
    //                         }
    //                     }
    //                 }
    //             ]
    //         },
    //         {
    //             $setOnInsert: {
    //                 members: [
    //                     {
    //                         memberId: doctor.id,
    //                         memberModel: "Doctor"
    //                     },
    //                     {
    //                         memberId: appointment.owner,
    //                         memberModel: "User"
    //                     }
    //                 ],
    //                 chatType: "personal",
    //             },

    //             $set: {
    //                 status: "active"
    //             }
    //         },
    //         {
    //             upsert: true,
    //             new: true
    //         }
    //     )

    // ]);

    // const message = await Message.create({
    //     chatId: chat._id,
    //     sender: doctor.id,
    //     senderModel: "Doctor",
    //     text: `Your appointment on ${appointment.date} at ${appointment.time} has been accepted by the doctor.`
    // });

    // await Promise.all([

    //     UnreadMessage.updateOne(
    //         {
    //             chatId: chat._id,
    //             userId: appointment.owner,
    //         },
    //         {
    //             $inc: {
    //                 unreadCount: 1
    //             },

    //             $set: {
    //                 lastMessage: message.text
    //             }
    //         },
    //         {
    //             upsert: true
    //         }
    //     ),

    //     Chat.updateOne(
    //         {
    //             _id: chat._id
    //         },
    //         {
    //             lastMessage: message._id
    //         }
    //     )


    // ])


    // if (userProfile) {
    //     setImmediate(async () => {

    //         let isOnline = false;

    //         try {
    //             const sockets = await io.in(`user:${userProfile._id.toString()} `).fetchSockets();
    //             isOnline = sockets.length > 0;
    //         } catch (err) {
    //             isOnline = false;
    //         }

    //         if (isOnline) {
    //             io.to(`user:${userProfile._id.toString()} `).emit("notification", {
    //                 type: "APPOINTMENT_REJECTED",
    //                 title: "Appointment Rejected ❗",
    //                 body: `Doctor ${doctor.name} has accepted your appoinment`,
    //                 data: {
    //                     appointmentId: appointment._id,
    //                     date: appointment.date,
    //                 }
    //             })
    //         }

    //         await Notification.create({
    //             userId: userProfile._id,
    //             title: "Appointment accepted",
    //             body: `Doctor ${doctor.name} has accepted your appoinment`,
    //             type: "APPOINTMENT",
    //             data: {
    //                 appointmentId: appointment._id,
    //                 date: appointment.date,
    //             }
    //         })


    //         sendEmail({
    //             email: userProfile.email,
    //             subject: "Appointment accepted ✅",
    //             text: `Hello ${userProfile.name}, your appointment is accepted on ${appointment.date} at ${appointment.time}.`,
    //             message: `
    //     < div style = "font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;" >
    //         <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" >

    //             <h1 style="color: #267D77; text-align: center; margin-bottom: 10px;" > Aleef </h1>

    //                 < h2 style = "text-align: center; color: #333;" >
    //                     Your Appointment is accepted! ✅
    // </h2>

    //     < p style = "color: #555; font-size: 16px;" >
    //         Hello < strong > ${userProfile.name} </strong>, your appointment has been accepted by the doctor.
    //             </p>

    //             < hr style = "margin: 20px 0;" />

    //                 <h3 style="color: #267D77;" > Appointment Details </h3>

    //                     < p > <strong>Date: </strong> ${appointment.date}</p >
    //                         <p><strong>Time: </strong> ${appointment.time}</p >
    //                             <p><strong>Reason: </strong> ${appointment.reason}</p >

    //                                 <div style="text-align: center; margin-top: 30px;" >
    //                                     <p style="color: #777; font-size: 14px;" >
    //                                         Please arrive on time for your appointment 🐶🐱
    // </p>
    //     </div>

    //     < div style = "margin-top: 30px; font-size: 12px; color: #999; text-align: center;" >
    //         <p>Your chat with the doctor is now open.</p>
    //             < p > If you have any questions, please contact support.</p>
    //                 <p> & copy; ${new Date().getFullYear()} Aleef.All rights reserved.</p>
    //                     </div>

    //                     </div>
    //                     </div>
    //                         `
    //         }).catch(err => {
    //             console.error("Email failed:", err);
    //         });
    //     });


    //     return appointment;

    // }


    // return appointment;
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
                message: `
                <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">

                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px;">

                        <h1 style="color: #267D77; text-align:center;">
                            Aleef
                        </h1>

                        <h2 style="text-align:center;">
                            Appointment Rejected ❗
                        </h2>

                        <p>
                            Hello <strong>${userProfile.rows[0].name}</strong>
                        </p>

                        <p>
                            Unfortunately, the doctor could not accept your appointment request.
                        </p>

                        <hr />

                        <p><strong>Date:</strong> ${appointment.rows[0].date}</p>
                        <p><strong>Time:</strong> ${appointment.rows[0].time}</p>
                        <p><strong>Reason:</strong> ${appointment.rows[0].reason}</p>

                        ${rejectionReason
                        ? `
                            <div style="margin-top:15px;padding:12px;background:#fff4f4;border-left:4px solid #ff4d4f;">
                                <strong>Doctor's Note:</strong>
                                ${rejectionReason}
                            </div>
                            `
                        : ""
                    }

                        <p style="margin-top:20px;">
                            Please choose another available appointment slot.
                        </p>

                    </div>

                </div>
                `
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


export const endAppointment = async (
    doctor: any,
    appointmentId: any,
    medicalRecord: any,
    vaccination: any,
    upCommingVaccination: any,
    files: any,
) => {
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
                [appointment.pet.id, doctor.id, upCommingVaccination.vaccineName, upCommingVaccination?.nextDueDate || null]
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

        setImmediate(() => {
            sendEmail({
                email: appointment.owner.email,
                subject: "Appointment Completed Successfully 🐾",
                text: `Hello ${appointment.owner.name}, your appointment for ${appointment.pet.name} has been completed successfully.`,
                message: `
                <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                        <h1 style="color: #267D77; text-align: center; margin-bottom: 10px;">Aleef</h1>
                        <h2 style="text-align: center; color: #333;">Appointment Completed Successfully 🐾</h2>

                        <p style="color: #555; font-size: 16px;">Hello <strong>${appointment.owner.name}</strong>,</p>
                        <p style="color: #555; font-size: 16px;">Your appointment for <strong>${appointment.pet.name}</strong> has been completed successfully.</p>
                        <p style="color: #555; font-size: 16px;">We hope your pet feels better soon 🐶🐱</p>

                        <hr style="margin: 20px 0;" />

                        <h3 style="color: #267D77;">Medical Record Added ✅</h3>
                        <p style="color:#555;">Your pet's medical record has been added to your account and can be viewed anytime.</p>

                        ${createdVaccination ? `
                        <div style="margin-top:20px; padding:15px; background:#f6ffed; border-left:4px solid #52c41a; border-radius:6px;">
                            <p style="margin:0; color:#135200;"><strong>Vaccination Added:</strong> ${createdVaccination.vaccineName}</p>
                        </div>` : ""}

                        ${createdUpCommingVaccination ? `
                        <div style="margin-top:20px; padding:15px; background:#fffbe6; border-left:4px solid #faad14; border-radius:6px;">
                            <p style="margin:0; color:#874d00;"><strong>Upcoming Vaccination Scheduled:</strong> ${createdUpCommingVaccination.vaccineName}</p>
                            <p style="margin-top:8px; color:#ad6800; font-size:14px;">Due Date: ${createdUpCommingVaccination?.nextDueDate ? new Date(createdUpCommingVaccination.nextDueDate).toDateString() : "Not specified"}</p>
                            <p style="margin-top:10px; color:#ad6800; font-size:13px;">Please make sure to visit the clinic on time to keep your pet healthy 🐾</p>
                        </div>` : ""}

                        <div style="margin-top:25px;">
                            <h3 style="color:#267D77;">We'd Love Your Feedback ❤️</h3>
                            <p style="color:#555;">Please take a moment to rate your experience with the doctor.</p>
                        </div>

                        <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                            <p>Thank you for using Aleef 🐾</p>
                            <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                        </div>

                    </div>
                </div>`
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


export const changeAppointmentStatus = async (appointmentId: any, status: any) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const appointment = await client.query(
            `UPDATE appointments SET status = $1, "updatedAt" = NOW() 
             WHERE id = $2 RETURNING *`,
            [status, appointmentId]
        );

        if (appointment.rowCount === 0) throw new ApiError(404, "Appointment not found");

        if (status === "accepted") {
            let chatResult = await client.query(
                `SELECT c.id FROM chats c
                 JOIN chat_members cm1 ON c.id = cm1."chatId" AND cm1.member_id = $1
                 JOIN chat_members cm2 ON c.id = cm2."chatId" AND cm2.member_id = $2
                 WHERE c.chat_type = 'personal' LIMIT 1`,
                [appointment.rows[0].owner, appointment.rows[0].doctor]
            );

            let chatId: string;

            if (!chatResult.rows.length) {
                const newChat = await client.query(
                    `INSERT INTO chats (chat_type) VALUES ('personal') RETURNING id`
                );
                chatId = newChat.rows[0].id;
                await client.query(
                    `INSERT INTO chat_members ("chatId", member_id, member_model) 
                     VALUES ($1, $2, 'User'), ($1, $3, 'Doctor')`,
                    [chatId, appointment.rows[0].owner, appointment.rows[0].doctor]
                );
            } else {
                chatId = chatResult.rows[0].id;
                await client.query(
                    `UPDATE chats SET status = 'active' WHERE id = $1`,
                    [chatId]
                );
            }

            const message = await client.query(
                `INSERT INTO messages ("chatId", sender, sender_model, chat_type, text)
                 VALUES ($1, $2, 'Doctor', 'personal', $3)
                 RETURNING id, text`,
                [chatId, appointment.rows[0].doctor,
                    `Your appointment on ${appointment.rows[0].date} at ${appointment.rows[0].time} has been accepted by the doctor.`]
            );

            await client.query(
                `INSERT INTO unread_messages ("chatId", user_id, "lastMessage", "unreadCount")
                 VALUES ($1, $2, $3, 1)
                 ON CONFLICT ("chatId", user_id) DO UPDATE SET
                    "unreadCount" = unread_messages."unreadCount" + 1,
                    "lastMessage" = $3`,
                [chatId, appointment.rows[0].owner, message.rows[0].text]
            );

            await client.query(
                `UPDATE chats SET "lastMessage" = $1, "updatedAt" = NOW() WHERE id = $2`,
                [message.rows[0].id, chatId]
            );

            clearCache(`chats:${appointment.rows[0].owner}`);
            clearCache(`chats:${appointment.rows[0].doctor}`);
            clearCache(`chat_messages_${appointment.rows[0].owner}_${chatId}`);
            clearCache(`all_chats:`);
        }

        await client.query("COMMIT");

        clearCache(`activeAppointment:${appointment.rows[0].owner}`);
        clearCache(`appointmentsRequests:${appointment.rows[0].doctor}`);
        clearCache(`appointment_details_user:${appointmentId}`);
        clearCache(`appointment_details_doctor:${appointmentId}`);
        clearCache(`appointments:`);
        clearCache(`prevAppointments:${appointment.rows[0].owner}`);

        return;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};



export const getAppointmentDetailsForAdmin = async (appointmentId: any) => {
    const cacheKey = `appointment_details_admin:${appointmentId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
        `SELECT a.id, a.date, a.time, a.reason, a.status, a.notes, a."rejectionReason",
            a."createdAt", a."updatedAt", a."appoinmentFee",
            jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email, 'profilePic', u."profilePic") AS owner,
            jsonb_build_object('id', d.id, 'name', d.name, 'specialization', d.specialization, 'profilePic', d."profilePic") AS doctor,
            jsonb_build_object('id', p.id, 'name', p.name, 'type', p.type, 'gender', p.gender, 'profilePic', p."profilePic") AS pet
        FROM appointments a
        JOIN users u ON u.id = a.owner
        JOIN doctors d ON d.id = a.doctor
        JOIN pets p ON p.id = a.pet
        WHERE a.id = $1`,
        [appointmentId]
    );

    if (!result.rows.length) throw new ApiError(404, "Appointment not found");

    setCache(cacheKey, result.rows[0], 300);
    return result.rows[0];
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
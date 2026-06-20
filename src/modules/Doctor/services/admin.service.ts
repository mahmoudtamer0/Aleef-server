import { getCache, setCache, clearCache } from "../../../cache";
import pool from "../../../db";
import { getIO } from "../../../sockets/socket";
import ApiError from "../../../utils/ApiError";
import { createNotificationForDoctor } from "../../../utils/notifications/createNotificationRow";
import { sendNotificationService } from "../../../utils/notifications/sendNotificationService";
import { sendEmail } from "../../../utils/sendEmail";

export const approveDoctorRequest = async (doctorId: string) => {

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

export const getAllDoctors = async (reqQuery: { search?: string, status?: string, sort?: string, page?: string, limit?: string }) => {
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



export const getDoctorToAdmin = async (doctorId: string) => {

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

export const chargeDoctor = async (doctorId: string, amount: number, reason: string) => {
    const io = getIO();
    const client = await pool.connect();
    try {
        await client.query(`BEGIN`);
        const doctor = await client.query(`SELECT id FROM doctors WHERE id = $1 AND status = 'active'`, [doctorId]);

        if (!doctor.rows.length) throw new ApiError(404, "Doctor not found");

        let doctorWallet = await client.query(`UPDATE doctor_wallet SET balance = balance + $1 WHERE doctor = $2 RETURNING id,balance`, [amount, doctorId]);

        if (!doctorWallet.rows.length) {
            doctorWallet = await client.query(`INSERT INTO doctor_wallet (doctor, balance) VALUES ($1, $2) RETURNING id,balance`, [doctorId, amount]);
        }

        await client.query(`INSERT INTO wallet_transactions ("walletId", type, "balanceAfter", amount, reason) VALUES ($1, $2, $3, $4, $5)`,
            [doctorWallet.rows[0].id, amount > 0 ? "debit" : "credit", doctorWallet.rows[0].balance, Math.abs(amount), reason]);

        await client.query(`COMMIT`)

        setImmediate(async () => {

            let isOnline = false;

            try {
                const sockets = await io.in(`user:${doctorId.toString()}`).fetchSockets();
                isOnline = sockets.length > 0;
            } catch (err) {
                isOnline = false;
            }


            if (isOnline) {
                io.to(`user:${doctorId.toString()}`).emit("notification", {
                    type: "WALLET_UPDATE",
                    title: amount > 0 ? "Doctor Balance Increased 💰" : "Doctor Balance Decreased 💰",
                    body: amount > 0 ? `You have charged by $${amount}` : `Your doctor balance has decreased by $${amount}`,
                    data: {
                        type: "wallet",
                        walletId: doctorWallet.rows[0].id,
                        balance: doctorWallet.rows[0].balance
                    }
                })
            }

            sendNotificationService(
                doctorId,
                "DOCTOR",
                amount > 0 ? "Balance Increased 💰" : "Balance Decreased 💰",
                `You have charged by $${amount}`
            );

            await createNotificationForDoctor({
                title: amount > 0 ? "Balance Increased 💰" : "Balance Decreased 💰",
                body: `You have charged by $${amount}`,
                doctorId: doctorId,
                type: "appointment",
            });
        });
        return;
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        throw err;
    } finally {
        client.release();
    }

}
import { getCache, setCache, clearCache } from "../../../cache";
import pool from "../../../db";
import ApiError from "../../../utils/ApiError";
import { approveAppointment, cancelAppointmentByDoctor, endAppointment, rejectAppointment } from "./doctor/actions";
import { cancelAppointmentByUser } from "./user.service";

export const getAllAppoinments = async (reqQuery: { page?: string, limit?: string, search?: string, status?: string }) => {
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

export const changeAppointmentStatus = async (appointmentId: string, status: string) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const appointment = await client.query(
            `SELECT a.id,
            jsonb_build_object('id', d.id, 'name', d.name, 'email', d.email) AS doctor,
            jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email) AS owner
            FROM appointments a
            JOIN doctors d ON d.id = a.doctor
            JOIN users u ON u.id = a.owner
            WHERE a.id = $1`,
            [appointmentId]
        );


        if (appointment.rowCount === 0) throw new ApiError(404, "Appointment not found");

        if (status === "accepted") {
            await approveAppointment(appointment.rows[0].doctor, appointmentId)
        } else if (status === "completed") {
            const medicalRecord = {
                title: "all is good",
                condition: "good",
                description: "the pet is healthy and happy"
            }
            await endAppointment(appointment.rows[0].doctor, appointmentId, medicalRecord, null, null, null, 0)
        } else if (status === "rejected") {
            await rejectAppointment(appointment.rows[0].doctor, appointmentId, "Your appointment has been rejected for no reason")
        } else if (status === "cancelled-by-owner") {
            await cancelAppointmentByUser(appointment.rows[0].owner, appointmentId, "pet owner has cancelled the appointment")
        } else if (status === "cancelled-by-doctor") {
            await cancelAppointmentByDoctor(appointment.rows[0].doctor, appointmentId, "doctor has cancelled the appointment")
        }
        else {
            await client.query(`UPDATE appointments SET status = $1 WHERE id = $2`, [status, appointmentId])
        }

        await client.query("COMMIT")

        clearCache(`activeAppointment:${appointment.rows[0].owner}`);
        clearCache(`appointmentsRequests:${appointment.rows[0].doctor}`);
        clearCache(`appointment_details_user:${appointmentId}`);
        clearCache(`appointment_details_doctor:${appointmentId}`);
        clearCache(`appointments:`);
        clearCache(`prevAppointments:${appointment.rows[0].owner}`);
        clearCache(`prevAppointments:${appointment.rows[0].doctor}`);
        clearCache(`appointment_details_doctor:${appointmentId}`);

        return;
    } catch (err) {
        await client.query("ROLLBACK");
        console.log(err);
        throw err;
    } finally {
        client.release();
    }
};

export const getAppointmentDetailsForAdmin = async (appointmentId: string) => {
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
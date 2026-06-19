import { getCache, setCache } from "../../../../cache";
import pool from "../../../../db";
import { User } from "../../../../types/user";
import ApiError from "../../../../utils/ApiError";
import { getAge } from "../../../../utils/getPetAge";

export const getAppointmentsRequestsForDoctor = async (doctor: User, params: any) => {

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

export const getActiveAppoinmentsForDoctor = async (doctor: User, date: any) => {
    if (!date) {
        date = new Date().toISOString().split('T')[0];
    } else {
        date = date.split('-').reverse().join('-');
    }


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
        [doctor.id, date]
    );

    const appointments = result.rows.map(row => ({ ...row, date: row.date.split('-').reverse().join('-') })
    );

    setCache(cacheKey, appointments, 300);

    return appointments;
}

export const getAppointmentDetailsForDoctor = async (doctor: User, appointmentId: string) => {


    const cacheKey = `appointment_details_doctor:${appointmentId}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return cached;
    }


    const appointment = await pool.query(
        `SELECT a.id, a.date, a.time, a.reason, a.status, a.notes,
        a."createdAt", a."updatedAt",a."appointmentFee",
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

export const prevAppointmentsForDoctor = async (doctor: User) => {

    const cacheKey = `prevAppointmentsDoctor:${doctor.id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    let [result, doctor_wallet] = await Promise.all([
        pool.query(
            `SELECT a.id, a.date, a.time, a.reason, a.status,
            jsonb_build_object('id', u.id, 'name', u.name) AS owner,
            jsonb_build_object('id', u.id, 'rate',d.rating,'ratingsCount',d."ratingsCount") AS doctor,
            jsonb_build_object('id', p.id, 'name', p.name, 'type', p.type, 'gender', p.gender, 'profilePic', p."profilePic") AS pet,
            COUNT(*) FILTER (WHERE a.status = 'completed') OVER() AS "completedCount",
            COUNT(*) FILTER (WHERE a.status = 'cancelled-by-doctor') OVER() AS "cancelledCount",
            COUNT(*) OVER() AS "totalCount"
            FROM appointments a
            JOIN users u ON u.id = a.owner
            JOIN doctors d ON d.id = a.doctor
            JOIN pets p ON p.id = a.pet
            WHERE a.doctor = $1 AND a.status IN ('cancelled', 'completed')
            ORDER BY a."updatedAt" DESC LIMIT 8`,
            [doctor.id]
        ),
        pool.query(`SELECT balance,id FROM doctor_wallet WHERE doctor = $1`, [doctor.id]),
    ]);


    if (doctor_wallet.rowCount === 0) {
        doctor_wallet = await pool.query(`INSERT INTO doctor_wallet (doctor, balance) VALUES ($1, $2) RETURNING id,balance`, [doctor.id, 0]);
    }


    if (!result.rows.length) {
        const response = {
            appointments: [],
            appoinmentsCounts: { totalAppoinments: 0, completedAppoinments: 0, cancelledAppoinments: 0 },
            doctorRating: { rating: null, ratingCount: 0 },
            wallet: doctor_wallet.rows[0],
        };

        setCache(cacheKey, response, 500);
        return response;
    }


    const appoinmentsCounts = {
        totalAppoinments: Number(result.rows[0]?.totalCount ?? 0),
        completedAppoinments: Number(result.rows[0]?.completedCount ?? 0),
        cancelledAppoinments: Number(result.rows[0]?.cancelledCount ?? 0)
    };

    const appoinments = result.rows.map(({ completedCount, totalCount, doctor, ...rest }) => rest);

    const doctorRating = {
        rating: result.rows[0].doctor.rate,
        ratingCount: result.rows[0].doctor.ratingsCount
    }

    const response = {
        appointments: appoinments,
        appoinmentsCounts,
        doctorRating,
        wallet: doctor_wallet.rows[0],
    };

    setCache(cacheKey, response, 500);

    return response;
}


export const getWalletTransactions = async (doctor: User) => {


    const result = await pool.query(
        `SELECT 
            ws.id,
            ws.type,
            ws.amount,
            ws."balanceAfter",
            ws.reason,
            ws."createdAt",
            ws."appointmentId",
            jsonb_build_object('id', u.id, 'name', u.name) AS owner,
            jsonb_build_object('id', p.id, 'name', p.name) AS pet
        FROM wallet_transactions ws
        JOIN doctor_wallet dw ON dw.id = ws."walletId"
        JOIN appointments a ON a.id = ws."appointmentId"
        JOIN users u ON u.id = a.owner
        JOIN pets p ON p.id = a.pet
        WHERE dw."doctor" = $1
        ORDER BY ws."createdAt" DESC LIMIT 10`,
        [doctor.id]
    );




    return result.rows;
}
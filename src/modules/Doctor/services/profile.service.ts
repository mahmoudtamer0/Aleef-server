import { getCache, setCache, clearCache } from "../../../cache";
import pool from "../../../db";
import { User } from "../../../types/user";
import ApiError from "../../../utils/ApiError";
import cloudinary from "../../../utils/cloudinary";
import { getNextDays } from "../../../utils/getDoctorAvailableDays";
import { getAvailableSlots } from "../../../utils/getDoctorAvailableSlots";

export const getDoctorSchedual = async (doctorId: string): Promise<any> => {

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


export const getDoctorSlots = async (doctorId: string, date: string): Promise<any> => {

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

export const editDoctor = async (doctor: User, body: { name: string, phone: string, specialization: string, city: string, address: string, about: string, appointmentFee: string, slotduration: string }, reqFile: any) => {

    const { name, phone, specialization, city, address, about, appointmentFee, slotduration } = body;

    const fields: any[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name) { fields.push(`name = $${paramIndex}`); params.push(name); paramIndex++; }
    if (phone) { fields.push(`phone = $${paramIndex}`); params.push(phone); paramIndex++; }
    if (city) { fields.push(`city = $${paramIndex}`); params.push(city); paramIndex++; }
    if (address) { fields.push(`address = $${paramIndex}`); params.push(address); paramIndex++; }
    if (specialization) { fields.push(`specialization = $${paramIndex}`); params.push(specialization); paramIndex++; }
    if (appointmentFee) { fields.push(`"appointmentFee" = $${paramIndex}`); params.push(Number(appointmentFee)); paramIndex++; }
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

export const getDoctorScheduleForDoctor = async (doctor: User) => {
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


export const editDoctorSchedule = async (doctor: User, schedule: { day_of_week: string, start_time: string, end_time: string, is_available: boolean }[]) => {

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const newSchedule: any[] = [];

        for (const day of schedule) {
            const dayResult = await client.query(
                `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_available)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET
                    start_time = $3,
                    end_time = $4,
                    is_available = $5 RETURNING id,day_of_week,start_time,end_time,is_available`,
                [doctor.id, day.day_of_week.toLowerCase(), day.start_time, day.end_time, day.is_available]
            );

            newSchedule.push(dayResult.rows[0]);
        }

        await client.query("COMMIT");

        clearCache(`doctor_schedule:${doctor.id}`);

        return newSchedule;

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }


};

export const getAvailableDoctors = async (reqQuery: { search?: string, status?: string, sort?: string, page?: string, limit?: string }) => {

    const { search, status, sort } = reqQuery;

    const page = Number(reqQuery.page) || 1;
    const limit = Number(reqQuery.limit) > 5 ? 5 : Number(reqQuery.limit);
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
            d.id, d.name, d.city, d.specialization,
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


export const getDoctor = async (doctorId: string) => {

    const cacheKey = `doctor_details:${doctorId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const [doctorResult, reviewsResult] = await Promise.all([
        pool.query(`
            SELECT id, name, email,about, city, specialization, status, 
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

    const response = {
        doctor: doctorResult.rows[0],
        reviews: reviewsResult.rows
    }

    setCache(cacheKey, response, 300);


    return response;
}

export const getMeDoctor = async (doctor: User) => {

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

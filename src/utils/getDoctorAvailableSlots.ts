import pool from "../db";
import { generateSlots } from "./generateSlots";

export const getAvailableSlots = async (doctorId: string, date: string, scheduleMap: Record<string, any>, slotDuration: number = 30) => {
    const targetDate = new Date(date + "T00:00:00");
    const dayName = targetDate
        .toLocaleString("en-US", { weekday: "long" })
        .toLowerCase();

    const schedule = scheduleMap[dayName];
    if (!schedule?.is_available) return [];

    const allSlots = generateSlots(
        schedule.start_time.slice(0, 5),
        schedule.end_time.slice(0, 5),
        slotDuration
    );
    const bookedAppointments = await pool.query(
        `SELECT time FROM appointments 
        WHERE doctor = $1 
        AND status = 'accepted'
        AND date >= $2::date 
        AND date < ($2::date + INTERVAL '1 day')`,
        [doctorId, date]
    );

    const bookedTimes = bookedAppointments.rows.map((a: any) => a.time);
    let availableSlots = allSlots.filter((slot) => !bookedTimes.includes(slot));

    const now = new Date();
    const toLocalDateStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (toLocalDateStr(targetDate) === toLocalDateStr(now)) {
        availableSlots = availableSlots.filter((slot) => {
            const parts = slot.split(":");
            const slotH = Number(parts[0]);
            const slotM = Number(parts[1]);
            return slotH > now.getHours() || (slotH === now.getHours() && slotM > now.getMinutes());
        });
    }

    return availableSlots.sort();
};
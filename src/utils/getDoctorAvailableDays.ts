import pool from "../db";
import { formatDate } from "./date";


export const getNextDays = async (doctorId: string, daysCount = 7) => {
    const result: any[] = [];

    const workingHours = await pool.query(
        `SELECT day_of_week, start_time, end_time, is_available 
         FROM doctor_schedules
         WHERE doctor_id = $1`,
        [doctorId]
    );

    if (!workingHours.rows.length) return { result: [], scheduleMap: {} };

    const scheduleMap: Record<string, any> = {};
    for (const row of workingHours.rows) {
        scheduleMap[row.day_of_week.toLowerCase()] = row;
    }

    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < daysCount; i++) {
        const currentDate = new Date(Date.UTC(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate() + i
        ));

        const dayName = currentDate
            .toLocaleString("en-US", { weekday: "long" })
            .toLowerCase();

        const schedule = scheduleMap[dayName];

        if (schedule?.is_available) {
            if (i === 0) {
                const now = new Date();
                const [endH, endM] = schedule.end_time.split(":").map(Number);
                const workdayOver =
                    now.getHours() > endH ||
                    (now.getHours() === endH && now.getMinutes() >= endM);
                if (workdayOver) continue;
            }
            result.push({
                date: formatDate(currentDate),
                dayName,
                display: currentDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                }).replace(",", "")
            });
        }
    }

    return { result, scheduleMap };
};

import { formatDate } from "./date";

export const getNextDays = (doctor: any, daysCount = 7) => {
    const result: any[] = [];

    if (!doctor?.workingHours) return result;

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

        const schedule = doctor.workingHours?.[dayName];

        if (schedule?.isAvailable) {
            if (i === 0) {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();

                const [endH, endM] = schedule.end.split(":").map(Number);

                const workdayOver =
                    currentHour > endH ||
                    (currentHour === endH && currentMinute >= endM);

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

    return result;
};
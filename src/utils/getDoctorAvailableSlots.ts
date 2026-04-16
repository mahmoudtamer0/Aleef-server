import Appointment from "../modules/Appointments/appointments.schema";
import { generateSlots } from "./generateSlots";

export const getAvailableSlots = async (doctor: any, doctorId: string, date: string) => {
    if (!doctor?.workingHours) return [];

    // 🔥 FIX IMPORTANT (timezone safe)
    const targetDate = new Date(date + "T00:00:00");


    const dayName = targetDate
        .toLocaleString("en-US", { weekday: "long" })
        .toLowerCase();


    const schedule = doctor.workingHours?.[dayName];


    if (!schedule || !schedule.isAvailable) return [];

    const allSlots = generateSlots(
        schedule.start,
        schedule.end,
        doctor.slotDuration ?? 30
    );



    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
        doctor: doctorId,
        status: "confirmed",
        date: {
            $gte: startOfDay,
            $lte: endOfDay,
        },
    })
        .select("time")
        .lean();

    const bookedTimes = bookedAppointments
        .map((a: any) => a.time)
        .filter(Boolean);


    let availableSlots = allSlots.filter(
        (slot) => !bookedTimes.includes(slot)
    );

    // 🔥 remove past time if today
    const now = new Date();

    const isToday =
        targetDate.toISOString().split("T")[0] ===
        now.toISOString().split("T")[0];

    if (isToday) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        availableSlots = availableSlots.filter((slot) => {
            const [slotH, slotM]: any = slot.split(":").map(Number);
            return (
                slotH > currentHour ||
                (slotH === currentHour && slotM > currentMinute)
            );
        });
    }

    return availableSlots.sort();
};
// import { sendNotification } from "../utils/notifications";
import cron from 'node-cron';
import pool from "../db";
import { sendNotificationService } from '../utils/notifications/sendNotificationService';
import { sendEmail } from '../utils/sendEmail';
import { vaccinationReminderTemplate } from '../emails/vaccinationReminder.email';
// import { sendEmail } from "../utils/email";


export const vaccinationReminder = () => {

    cron.schedule('* * * * *', async () => {
        try {
            console.log("vaccination reminder");
            const upcomingVaccinationReminders = await pool.query(
                `SELECT 
                    v.id as vaccination_id,
                    v."vaccineName",
                    v."nextDueDate",
                    p.id as pet_id,
                    p.name as pet_name,
                    o.id as owner_id,
                    o.name as owner_name,
                    o.email as owner_email
                 FROM vaccinations v
                 JOIN pets p ON v.pet = p.id
                 JOIN users o ON o.id = p.owner
                 WHERE v.type = 'upcomming' 
                   AND v."reminderSent" = false
                   AND v."nextDueDate" BETWEEN NOW() AND NOW() + INTERVAL '3 days'`,
            );

            for (const vaccin of upcomingVaccinationReminders.rows) {

                Promise.allSettled([
                    sendNotificationService(vaccin.owner_id,
                        "USER", "Vaccination Reminder 🐾",
                        `${vaccin.pet_name} Has a vaccination due on ${new Date(vaccin.nextDueDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}. Please remember to take it.`),
                    sendEmail({
                        email: vaccin.owner_email,
                        subject: "Vaccination Reminder 🐾",
                        text: `Hello ${vaccin.owner_name}, your ${vaccin.pet_name} has a vaccination due on ${new Date(vaccin.nextDueDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}. Please remember to take it.`,
                        message: vaccinationReminderTemplate(vaccin.owner_name, vaccin.pet_name, vaccin.vaccineName, new Date(vaccin.nextDueDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })),
                    })
                ])

                await pool.query(
                    `UPDATE vaccinations SET "reminderSent" = true,"remindedAt" = NOW() WHERE id = $1`,
                    [vaccin.vaccination_id]
                );

            }
        } catch (err) { console.error(err) }
    })
}
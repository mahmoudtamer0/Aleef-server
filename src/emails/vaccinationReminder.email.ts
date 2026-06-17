export const vaccinationReminderTemplate = (
    userName: string,
    petName: string,
    vaccineName: string,
    nextDueDate: string
) => {
    return `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

        <h1 style="color: #267D77; text-align: center; margin-bottom: 10px;">
            Aleef
        </h1>

        <h2 style="text-align: center; color: #333;">
            Vaccination Reminder 💉
        </h2>

        <p style="color: #555; font-size: 16px;">
            Hello <strong>${userName}</strong>,
            this is a reminder that your pet's vaccination is coming up soon.
        </p>

        <hr style="margin: 20px 0;" />

        <h3 style="color: #267D77;">
            Vaccination Details
        </h3>

        <p><strong>Pet Name:</strong> ${petName}</p>
        <p><strong>Vaccine:</strong> ${vaccineName}</p>
        <p><strong>Due Date:</strong> ${nextDueDate}</p>

        <div style="text-align: center; margin-top: 30px;">
            <p style="color: #777; font-size: 14px;">
                Please make sure to schedule a visit with your vet on time 🐶🐱
            </p>
        </div>

        <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
            <p>Keep your pet healthy and happy!</p>
            <p>If you have any questions, please contact support.</p>
            <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
        </div>

    </div>
</div>
    `
}
export const bookedAppointmentTemplate = (
    userName: string,
    doctorName: string,
    city: string,
    address: string,
    appointmentFee: number,
    date: string,
    time: string,
    reason: string,

) => {
    return `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">

        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

            <h1 style="color: #267D77; text-align: center;">Aleef</h1>
            <h2 style="text-align: center; color: #333;">Appointment Request Received</h2>

            <p style="color: #555; font-size: 16px;">
                Hello ${userName}, your appointment request has been successfully submitted ✅
            </p>

            <hr style="margin: 20px 0;" />

            <h3 style="color: #267D77;">Doctor Details</h3>
            <p><strong>Doctor:</strong> ${doctorName}</p>
            <p><strong>City:</strong> ${city}</p>
            <p><strong>Address:</strong> ${address}</p>
            <p><strong>Fee:</strong> ${appointmentFee} EGP</p>

            <hr style="margin: 20px 0;" />

            <h3 style="color: #267D77;">Appointment Details</h3>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Reason:</strong> ${reason}</p>

            <div style="background:#fff3cd; padding:15px; border-radius:8px; margin-top:20px;">
                <p style="margin:0; color:#856404; font-size:14px;">
                    ⚠️ Your appointment is currently <strong>pending confirmation</strong> from the doctor.  
                    You will receive another email once it is accepted.
                </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <p style="color: #777; font-size: 14px;">
                    Please arrive on time once your appointment is accepted 🐶🐱
                </p>
            </div>

            <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                <p>If you did not request this appointment, please contact support.</p>

                <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
            </div>

        </div>

    </div>
    `
}

export const acceptedAppointmentTemplate = (
    userName: string,
    date: string,
    time: string,
    reason: string,
    locationLink: string,
) => {
    return `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

            <h1 style="color: #267D77; text-align: center;">
                Aleef
            </h1>

            <h2 style="text-align: center; color: #333;">
                Your Appointment Has Been Accepted! ✅
            </h2>

            <p style="color: #555; font-size: 16px;">
                Hello <strong>${userName}</strong>,
                your appointment has been accepted by the doctor.
            </p>

            <hr style="margin: 20px 0;" />

            <h3 style="color: #267D77;">
                Appointment Details
            </h3>

            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Reason:</strong> ${reason}</p>

            <p>
                <strong>Clinic Location:</strong>
            </p>

            <div style="text-align: center; margin: 20px 0;">
                <a
                    href="${locationLink}"
                    target="_blank"
                    style="
                        background-color: #267D77;
                        color: white;
                        padding: 12px 20px;
                        text-decoration: none;
                        border-radius: 6px;
                        display: inline-block;
                        font-weight: bold;
                    "
                >
                    📍 Open Location
                </a>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <p style="color: #777; font-size: 14px;">
                    Please arrive on time for your appointment 🐶🐱
                </p>
            </div>

            <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                <p>Your chat with the doctor is now open.</p>
                <p>If you have any questions, please contact support.</p>
                <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
            </div>

        </div>
    </div>
    `;
};


export const rejectedAppointmentTemplate = (
    userName: string,
    date: string,
    time: string,
    reason: string,
    rejectionReason: string,
) => {
    return `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">

        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px;">

            <h1 style="color: #267D77; text-align:center;">
                Aleef
            </h1>

            <h2 style="text-align:center;">
                Appointment Rejected ❗
            </h2>

            <p>
                Hello <strong>${userName}</strong>,
            </p>

            <p>
                Unfortunately, the doctor could not accept your appointment request.
            </p>

            <hr />

            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Reason:</strong> ${reason}</p>

            ${rejectionReason
            ? `
                <div style="margin-top:15px;padding:12px;background:#fff4f4;border-left:4px solid #ff4d4f;">
                    <strong>Doctor's Note:</strong>
                    ${rejectionReason}
                </div>
                `
            : ""
        }

            <p style="margin-top:20px;">
                Please choose another available appointment slot.
            </p>

        </div>

    </div>
    `
}

export const endAppointmentTemplate = (
    appointment: any,
    createdVaccination: any,
    createdUpCommingVaccination: any,
) => {
    return `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

            <h1 style="color: #267D77; text-align: center; margin-bottom: 10px;">Aleef</h1>
            <h2 style="text-align: center; color: #333;">Appointment Completed Successfully 🐾</h2>

            <p style="color: #555; font-size: 16px;">Hello <strong>${appointment.owner.name}</strong>,</p>
            <p style="color: #555; font-size: 16px;">Your appointment for <strong>${appointment.pet.name}</strong> has been completed successfully.</p>
            <p style="color: #555; font-size: 16px;">We hope your pet feels better soon 🐶🐱</p>

            <hr style="margin: 20px 0;" />

            <h3 style="color: #267D77;">Medical Record Added ✅</h3>
            <p style="color:#555;">Your pet's medical record has been added to your account and can be viewed anytime.</p>

            ${createdVaccination ? `
            <div style="margin-top:20px; padding:15px; background:#f6ffed; border-left:4px solid #52c41a; border-radius:6px;">
                <p style="margin:0; color:#135200;"><strong>Vaccination Added:</strong> ${createdVaccination.vaccineName}</p>
            </div>` : ""}

            ${createdUpCommingVaccination ? `
            <div style="margin-top:20px; padding:15px; background:#fffbe6; border-left:4px solid #faad14; border-radius:6px;">
                <p style="margin:0; color:#874d00;"><strong>Upcoming Vaccination Scheduled:</strong> ${createdUpCommingVaccination.vaccineName}</p>
                <p style="margin-top:8px; color:#ad6800; font-size:14px;">Due Date: ${createdUpCommingVaccination?.nextDueDate ? new Date(createdUpCommingVaccination.nextDueDate).toDateString() : "Not specified"}</p>
                <p style="margin-top:10px; color:#ad6800; font-size:13px;">Please make sure to visit the clinic on time to keep your pet healthy 🐾</p>
            </div>` : ""}

            <div style="margin-top:25px;">
                <h3 style="color:#267D77;">We'd Love Your Feedback ❤️</h3>
                <p style="color:#555;">Please take a moment to rate your experience with the doctor.</p>
            </div>

            <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                <p>Thank you for using Aleef 🐾</p>
                <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
            </div>

        </div>
    </div>`
}
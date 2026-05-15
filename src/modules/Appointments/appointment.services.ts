import Appointment from "./appointments.schema"
import MedicalRecord from "../Pet/medicalRecord.schema"
import Vaccination from "../Pet/vaccination.schema"
import ApiError from "../../utils/ApiError";
import Doctor from "../Doctor/doctor.schema";
import { sendEmail } from "../../utils/sendEmail";
import User from "../User/user.schema";
import Chat from "../Chat/chat.schema";
import Message from "../Chat/message.shema";
import UnreadMessage from "../Chat/unreadMessages";
import { getIO } from "../../sockets/socket";
import Notification from "../User/notification.schema";




export const bookAppointment = async (user: any, { pet, doctor, date, time, reason, notes }: any) => {

    const userProfile = await User.findById(user.id).lean().select("email name")

    if (!userProfile) {
        throw new ApiError(404, "user not found");
    }

    const checkIfAnyAppointmentsForThisUser = await Appointment.findOne({ owner: user.id, status: { $in: ["pending", "confirmed"] } }).lean().select("_id");

    const doctorProfile = await Doctor.findById(doctor).lean().select("name city address appointmentFee status");

    if (!doctorProfile || doctorProfile.status !== "active") {
        throw new ApiError(400, "sorry this doctor is not available for appointments at the moment");
    }

    if (checkIfAnyAppointmentsForThisUser) {
        throw new ApiError(400, "you have an active appointment, cancel your active appointment to be eligible to book another one");
    }


    const checkIfAnyAppointmentsForThisDoc = await Appointment.findOne({ doctor: doctor, time: time, date: date, status: "confirmed" }).lean().select("_id")

    if (checkIfAnyAppointmentsForThisDoc) {
        throw new ApiError(400, "sorry this time is not available for this doctor, please select another time slot");
    }


    const appointment = await Appointment.create({
        owner: user.id,
        pet: pet,
        doctor: doctor,
        date, time, reason,
    })

    if (notes && notes.trim() !== "" && notes.length > 0 && notes !== null) {
        appointment.notes = notes;
        await appointment.save();
    }



    setImmediate(() => {
        sendEmail({
            email: userProfile.email,
            subject: "Appointment Booked Successfully 🐾",
            text: "",
            message: `
<div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">

    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

        <h1 style="color: #267D77; text-align: center;">Aleef</h1>
        <h2 style="text-align: center; color: #333;">Appointment Request Received</h2>

        <p style="color: #555; font-size: 16px;">
            Hello ${userProfile.name}, your appointment request has been successfully submitted ✅
        </p>

        <hr style="margin: 20px 0;" />

        <h3 style="color: #267D77;">Doctor Details</h3>
        <p><strong>Doctor:</strong> ${doctorProfile.name}</p>
        <p><strong>City:</strong> ${doctorProfile.city}</p>
        <p><strong>Address:</strong> ${doctorProfile.address}</p>
        <p><strong>Fee:</strong> ${doctorProfile.appointmentFee} EGP</p>

        <hr style="margin: 20px 0;" />

        <h3 style="color: #267D77;">Appointment Details</h3>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Reason:</strong> ${reason}</p>

        <div style="background:#fff3cd; padding:15px; border-radius:8px; margin-top:20px;">
            <p style="margin:0; color:#856404; font-size:14px;">
                ⚠️ Your appointment is currently <strong>pending confirmation</strong> from the doctor.  
                You will receive another email once it is confirmed.
            </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
            <p style="color: #777; font-size: 14px;">
                Please arrive on time once your appointment is confirmed 🐶🐱
            </p>
        </div>

        <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
            <p>If you did not request this appointment, please contact support.</p>

            <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
        </div>

    </div>

</div>
`
        }).catch(err => {
            console.error("Email failed:", err);
        });
    });

    return appointment;

}

export const getActiveAppointment = async (user: any) => {

    const appointment = await Appointment.findOne({ owner: user.id }).lean().populate({
        path: "pet",
        select: "name type gender profilePic"
    }).populate({
        path: "doctor",
        select: "name profilePic specialization"
    });

    return appointment;

}


export const getAppointmentDetails = async (appointmentId: any) => {

    const appointment = await Appointment.findOne({ _id: appointmentId }).lean().populate({
        path: "pet",
        select: "name type gender profilePic"
    }).populate({
        path: "doctor",
        select: "name profilePic specialization rating ratingsCount city address"
    });

    return appointment;

}

export const approveAppointment = async (doctor: any, appointmentId: any) => {
    const io = getIO();

    const appointment = await Appointment.findOne({ _id: appointmentId, doctor: doctor.id, status: "pending" });

    if (!appointment) {
        throw new ApiError(404, "appointment not found");
    }

    const findAnotherAppointmentForThisDoc = await Appointment.findOne({ doctor: doctor.id, time: appointment.time, date: appointment.date, status: "confirmed" }).lean().select("_id");
    if (findAnotherAppointmentForThisDoc) {
        throw new ApiError(400, "sorry this time is not available for this doctor, please ask the patient to select another time slot");
    }

    appointment.status = "confirmed";
    await appointment.save();

    const userProfile = await User.findById(appointment.owner).lean().select("email name")


    let chat = await Chat.findOne({
        "members.memberId": { $all: [doctor.id, appointment.owner] },
        chatType: "personal"
    })

    if (!chat) {
        chat = await Chat.create({
            members: [
                { memberId: doctor.id, memberModel: "Doctor" },
                { memberId: appointment.owner, memberModel: "User" }
            ],
            chatType: "personal",
        });
    } else {
        chat.status = "active";
        await chat.save();
    }

    const message = await Message.create({
        chatId: chat && chat._id,
        sender: doctor.id,
        senderModel: "Doctor",
        text: `Hello ${userProfile?.name}, I am ${doctor.name} for your help regarding your appointment for ${appointment.reason} on ${appointment.date} at ${appointment.time}, how can I help you ? `
    })

    await UnreadMessage.create({
        chatId: chat._id,
        userId: appointment.owner,
        lastMessage: message.text,
        unreadCount: 1,
    })

    chat.lastMessage = message._id;
    await chat.save();


    if (userProfile) {
        setImmediate(async () => {

            let isOnline = false;

            try {
                const sockets = await io.in(`user:${userProfile._id.toString()}`).fetchSockets();
                isOnline = sockets.length > 0;
            } catch (err) {
                isOnline = false;
            }

            if (isOnline) {
                io.to(`user:${userProfile._id.toString()}`).emit("notification", {
                    type: "APPOINTMENT_REJECTED",
                    title: "Appointment Rejected ❗",
                    body: `Doctor ${doctor.name} has accepted your appoinment`,
                    data: {
                        appointmentId: appointment._id,
                        date: appointment.date,
                    }
                })
            }

            await Notification.create({
                userId: userProfile._id,
                title: "Appointment Confirmed",
                body: `Doctor ${doctor.name} has accepted your appoinment`,
                type: "APPOINTMENT",
                data: {
                    appointmentId: appointment._id,
                    date: appointment.date,
                }
            })


            sendEmail({
                email: userProfile.email,
                subject: "Appointment Confirmed ✅",
                text: `Hello ${userProfile.name}, your appointment is confirmed on ${appointment.date} at ${appointment.time}.`,
                message: `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

            <h1 style="color: #267D77; text-align: center; margin-bottom: 10px;">Aleef</h1>

            <h2 style="text-align: center; color: #333;">
                Your Appointment is Confirmed! ✅
            </h2>

            <p style="color: #555; font-size: 16px;">
                Hello <strong>${userProfile.name}</strong>, your appointment has been confirmed by the doctor.
            </p>

            <hr style="margin: 20px 0;" />

            <h3 style="color: #267D77;">Appointment Details</h3>

            <p><strong>Date:</strong> ${appointment.date}</p>
            <p><strong>Time:</strong> ${appointment.time}</p>
            <p><strong>Reason:</strong> ${appointment.reason}</p>

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
    `
            }).catch(err => {
                console.error("Email failed:", err);
            });
        });


        return appointment;

    }


    return appointment;
}

export const rejectAppointment = async (doctor: any, appointmentId: any, rejectionReason: string) => {

    const io = getIO();
    const appointment = await Appointment.findOne({ _id: appointmentId, doctor: doctor.id, status: "pending" });
    if (!appointment) {
        throw new ApiError(404, "Appointment not found or not pending");
    }
    appointment.status = "rejected";
    appointment.expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    appointment.rejectionReason = rejectionReason;
    await appointment.save();

    const userProfile = await User.findById(appointment.owner).lean().select("email name")
    if (userProfile) {

        setImmediate(async () => {

            let isOnline = false;

            try {
                const sockets = await io.in(`user:${userProfile._id.toString()}`).fetchSockets();
                isOnline = sockets.length > 0;
            } catch (err) {
                isOnline = false;
            }

            if (isOnline) {
                io.to(`user:${userProfile._id.toString()}`).emit("notification", {
                    type: "APPOINTMENT_REJECTED",
                    title: "Appointment Rejected ❗",
                    body: rejectionReason,
                    data: {
                        appointmentId: appointment._id,
                        date: appointment.date,
                    }
                })
            }

            await Notification.create({
                userId: userProfile._id,
                title: "Appointment Rejected ❗",
                body: rejectionReason,
                type: "APPOINTMENT",
                data: {
                    appointmentId: appointment._id,
                    date: appointment.date,
                }
            })

            sendEmail({
                email: userProfile.email,
                subject: "Appointment Update ❗",
                text: `Hello ${userProfile.name}, your appointment request on ${appointment.date} at ${appointment.time} could not be confirmed. Reason: ${appointment.rejectionReason || "Doctor is not available at this time"}.`,
                message: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
                <h1 style="color: #267D77; text-align: center; margin-bottom: 10px;">Aleef</h1>
    
                <h2 style="text-align: center; color: #333;">
                    Appointment Not Confirmed ❗
                </h2>
    
                <p style="color: #555; font-size: 16px;">
                    Hello <strong>${userProfile.name}</strong>,
                </p>
    
                <p style="color: #555; font-size: 16px;">
                    We’re sorry, but your appointment request could not be confirmed by the doctor.
                </p>
    
                <hr style="margin: 20px 0;" />
    
                <h3 style="color: #267D77;">Request Details</h3>
    
                <p><strong>Date:</strong> ${appointment.date}</p>
                <p><strong>Time:</strong> ${appointment.time}</p>
                <p><strong>Reason:</strong> ${appointment.reason}</p>
    
                ${appointment.rejectionReason
                        ? `
                        <div style="margin-top:15px; padding:12px; background:#fff4f4; border-left:4px solid #ff4d4f; border-radius:6px;">
                            <p style="margin:0; color:#a8071a; font-size:14px;">
                                <strong>Doctor's Note:</strong> ${appointment.rejectionReason}
                            </p>
                        </div>
                        `
                        : ""
                    }
    
                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #777; font-size: 14px;">
                        Please try selecting another available time slot 🗓️
                    </p>
                </div>
    
                <div style="text-align: center; margin-top: 20px;">
                    <a href="YOUR_BOOKING_PAGE_LINK" style="
                        display:inline-block;
                        padding:10px 20px;
                        background:#267D77;
                        color:#fff;
                        text-decoration:none;
                        border-radius:6px;
                    ">
                        Book Another Appointment
                    </a>
                </div>
    
                <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                    <p>If you have any questions, feel free to contact support.</p>
                    <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                </div>
    
            </div>
        </div>
        `
            }).catch(err => {
                console.error("Email failed:", err);
            });
        })
    }
    return appointment;
}


export const getPrevAppoinments = async (user: any) => {

    const appointments = await Appointment.find({ owner: user.id, status: { $in: ["cancelled", "completed"] } }).lean().populate({
        path: "doctor pet", select: "name profilePic specialization"
    }).lean();

    return appointments;
}

// services/appointment.service.ts

export const endAppointment = async (
    doctor: any,
    appointmentId: any,
    medicalRecord: any,
    vaccination: any,
    upCommingVaccination: any,
    files: any,
) => {

    console.log(appointmentId, doctor.id)

    const appointment = await Appointment.findOne({
        _id: appointmentId,
        doctor: doctor.id,
        status: "confirmed"
    })
        .populate("owner", "name email")
        .populate("pet", "name");

    if (!appointment) {
        throw new ApiError(404, "Appointment not found or not confirmed");
    }

    // medical record required
    if (
        !medicalRecord?.title ||
        !medicalRecord?.condition ||
        !medicalRecord?.description
    ) {
        throw new ApiError(400, "Medical record is required");
    }

    // attachments
    let attachments: string[] = [];

    if (files && files.length > 0) {
        attachments = files.map((file: any) => file.path);
    }

    // create medical record
    const createdMedicalRecord = await MedicalRecord.create({
        pet: appointment.pet._id,
        doctor: doctor.id,
        title: medicalRecord.title,
        condition: medicalRecord.condition,
        description: medicalRecord.description,
        attachments,
        date: new Date(),
    });

    // optional vaccination
    let createdVaccination = null;

    if (vaccination?.vaccineName) {

        const vaccinExist = await Vaccination.findOne({ pet: appointment.pet._id, vaccineName: vaccination?.vaccineName });

        if (vaccinExist) {
            vaccinExist.type = "vaccined"
            vaccinExist.vaccinatedAt = new Date();
            vaccinExist.nextDueDate = null;
            createdVaccination = vaccinExist;
            await vaccinExist.save()
        } else {

            createdVaccination = await Vaccination.create({
                pet: appointment.pet._id,
                type: "vaccined",
                doctor: doctor.id,
                vaccineName: vaccination.vaccineName,
                dose: vaccination?.dose,
                notes: vaccination?.notes,
                vaccinatedAt: new Date(),
                nextDueDate: null,
            });
        }


    }

    let createdUpCommingVaccination = null;


    if (upCommingVaccination?.vaccineName) {
        createdUpCommingVaccination = await Vaccination.create({
            pet: appointment.pet._id,
            doctor: doctor.id,
            type: "upcomming",
            vaccineName: upCommingVaccination.vaccineName,
            vaccinatedAt: null,
            nextDueDate: upCommingVaccination?.nextDueDate,
        });

    }

    // finish appointment
    appointment.status = "completed";

    await appointment.save();

    // send email in background
    setImmediate(() => {

        sendEmail({
            email: (appointment.owner as any).email,

            subject: "Appointment Completed Successfully 🐾",

            text: `Hello ${(appointment.owner as any).name}, your appointment for ${(appointment.pet as any).name} has been completed successfully. We'd love to hear your feedback and rating about your experience with the doctor.`,

            message: `
            <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                    <h1 style="color: #267D77; text-align: center; margin-bottom: 10px;">
                        Aleef
                    </h1>

                    <h2 style="text-align: center; color: #333;">
                        Appointment Completed Successfully 🐾
                    </h2>

                    <p style="color: #555; font-size: 16px;">
                        Hello <strong>${(appointment.owner as any).name}</strong>,
                    </p>

                    <p style="color: #555; font-size: 16px;">
                        Your appointment for 
                        <strong>${(appointment.pet as any).name}</strong> 
                        has been completed successfully.
                    </p>

                    <p style="color: #555; font-size: 16px;">
                        We hope your pet feels better soon 🐶🐱
                    </p>

                    <hr style="margin: 20px 0;" />

                    <h3 style="color: #267D77;">
                        Medical Record Added ✅
                    </h3>

                    <p style="color:#555;">
                        Your pet’s medical record has been added to your account and can be viewed anytime.
                    </p>

                    ${createdVaccination
                    ? `
                        <div style="margin-top:20px; padding:15px; background:#f6ffed; border-left:4px solid #52c41a; border-radius:6px;">
                            <p style="margin:0; color:#135200;">
                                <strong>Vaccination Added:</strong> ${createdVaccination.vaccineName}
                            </p>
                        </div>
                        `
                    : ""
                }
                ${createdUpCommingVaccination
                    ? `
    <div style="margin-top:20px; padding:15px; background:#fffbe6; border-left:4px solid #faad14; border-radius:6px;">

        <p style="margin:0; color:#874d00;">
            <strong>Upcoming Vaccination Scheduled:</strong> 
            ${createdUpCommingVaccination.vaccineName}
        </p>

        <p style="margin-top:8px; color:#ad6800; font-size:14px;">
            Due Date: 
           ${createdUpCommingVaccination?.nextDueDate
                        ? new Date(createdUpCommingVaccination.nextDueDate).toDateString()
                        : "Not specified"
                    }
        </p>

        <p style="margin-top:10px; color:#ad6800; font-size:13px;">
            Please make sure to visit the clinic on time to keep your pet healthy 🐾
        </p>

    </div>
    `
                    : ""
                }

                    <div style="margin-top:25px;">
                        <h3 style="color:#267D77;">
                            We'd Love Your Feedback ❤️
                        </h3>

                        <p style="color:#555;">
                            Please take a moment to rate your experience with the doctor and share your feedback.
                        </p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="YOUR_FEEDBACK_PAGE_LINK" style="
                            display:inline-block;
                            padding:10px 20px;
                            background:#267D77;
                            color:#fff;
                            text-decoration:none;
                            border-radius:6px;
                        ">
                            Rate Your Experience
                        </a>
                    </div>

                    <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                        <p>Thank you for using Aleef 🐾</p>
                        <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                    </div>

                </div>
            </div>
            `
        }).catch(err => {
            console.error("Email failed:", err);
        });

    });

    return {
        medicalRecord: createdMedicalRecord,
        vaccination: createdVaccination,
        appointment
    };
}
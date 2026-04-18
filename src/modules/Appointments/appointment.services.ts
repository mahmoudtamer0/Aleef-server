import Appointment from "./appointments.schema"
import ApiError from "../../utils/ApiError";
import Doctor from "../Doctor/doctor.schema";
import { sendEmail } from "../../utils/sendEmail";
import User from "../User/user.schema";
import Chat from "../Chat/chat.schema";
import Message from "../Chat/message.shema";
import UnreadMessage from "../Chat/unreadMessages";





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
    const appointment = await Appointment.findOne({ _id: appointmentId, doctor: doctor.id, status: "pending" });

    if (!appointment) {
        throw new ApiError(404, "appointment not found");
    }
    appointment.status = "confirmed";
    await appointment.save();

    const userProfile = await User.findById(appointment.owner).lean().select("email name")

    const chat = await Chat.create({
        members: [
            { memberId: doctor.id, memberModel: "Doctor" },
            { memberId: appointment.owner, memberModel: "User" }
        ],
        chatType: "personal",
    });

    const message = await Message.create({
        chatId: chat && chat._id,
        sender: doctor.id,
        senderModel: "Doctor",
        text: `Hello ${userProfile?.name}, Iam ${doctor.name} for your help regarding your appointment for ${appointment.reason} on ${appointment.date} at ${appointment.time}, how can I help you ? `
    })

    const unreadMessage = await UnreadMessage.create({
        chatId: chat._id,
        userId: appointment.owner,
        lastMessage: message.text,
        unreadCount: 1,
    })

    chat.lastMessage = message._id;
    await chat.save();


    if (userProfile) {
        setImmediate(() => {
            sendEmail({
                email: userProfile.email,
                subject: "Appointment Confirmed ✅",
                text: "",
                message: `
            < div style = "font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;" >
                <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" >
                    <h1 style="color: #267D77; text-align: center;" > Aleef </h1>
                        < h2 style = "text-align: center; color: #333;" > Your Appointment is Confirmed! </h2>
                            < p style = "color: #555; font-size: 16px;" >
                                Hello ${userProfile.name}, your appointment has been confirmed by the doctor ✅
    </p>

        < hr style = "margin: 20px 0;" />
            <h3 style="color: #267D77;" > Appointment Details </h3>
                < p > <strong>Date: </strong> ${appointment.date}</p >
                    <p><strong>Time: </strong> ${appointment.time}</p >
                        <p><strong>Reason: </strong> ${appointment.reason}</p >
                            <div style="text-align: center; margin-top: 30px;" >
                                <p style="color: #777; font-size: 14px;" >
                                    Please arrive on time for your appointment 🐶🐱
    </p>
        </div>
        < div style = "margin-top: 30px; font-size: 12px; color: #999; text-align: center;" >
            <p>your chat with the doctor is now open.</p>
                < p > If you have any questions, please contact support.</p>
                    <p> & copy; ${new Date().getFullYear()} Aleef.All rights reserved.</p>
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

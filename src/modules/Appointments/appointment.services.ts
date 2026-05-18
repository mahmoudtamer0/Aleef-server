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

export const getAllAppoinments = async (reqQuery: any) => {
    const {
        page = "1",
        limit = "10",
        search = "",
        status
    } = reqQuery;

    const currentPage = Number(page);
    const perPage = Number(limit);

    const pipeline: any[] = [

        // owner
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },

        // doctor
        {
            $lookup: {
                from: "doctors",
                localField: "doctor",
                foreignField: "_id",
                as: "doctor"
            }
        },

        // pet
        {
            $lookup: {
                from: "pets",
                localField: "pet",
                foreignField: "_id",
                as: "pet"
            }
        },

        {
            $unwind: {
                path: "$owner",
                preserveNullAndEmptyArrays: true
            }
        },

        {
            $unwind: {
                path: "$doctor",
                preserveNullAndEmptyArrays: true
            }
        },

        {
            $unwind: {
                path: "$pet",
                preserveNullAndEmptyArrays: true
            }
        }
    ];

    // SEARCH
    if (search) {
        pipeline.push({
            $match: {
                $or: [

                    // appointment reason
                    {
                        reason: {
                            $regex: search,
                            $options: "i"
                        }
                    },

                    // owner name
                    {
                        "user.name": {
                            $regex: search,
                            $options: "i"
                        }
                    },

                    // doctor name
                    {
                        "doctor.name": {
                            $regex: search,
                            $options: "i"
                        }
                    },

                    // pet name
                    {
                        "pet.name": {
                            $regex: search,
                            $options: "i"
                        }
                    }
                ]
            }
        });
    }

    // STATUS FILTER
    if (status) {
        pipeline.push({
            $match: {
                status
            }
        });
    }

    // SORT
    pipeline.push({
        $sort: {
            appointmentDate: -1
        }
    });

    pipeline.push({
        $skip: (currentPage - 1) * perPage
    });

    pipeline.push({
        $limit: perPage
    });

    const appointments = await Appointment.aggregate(pipeline);

    const countPipeline = pipeline.filter(
        (stage) =>
            !("$skip" in stage) &&
            !("$limit" in stage) &&
            !("$sort" in stage)
    );

    countPipeline.push({
        $count: "total"
    });

    const totalResult = await Appointment.aggregate(countPipeline);

    const totalAppointments = totalResult[0]?.total || 0;


    return {
        totalAppointments,
        results: appointments.length,
        page: currentPage,
        totalPages: Math.ceil(totalAppointments / perPage),
        appointments,
        currentPage
    }

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

export const getAppointmentsRequestsForDoctor = async (doctor: any, params: any) => {

    const { page } = params;
    const limit = 5;

    const skip = (page - 1) * limit;

    const appoinments = await Appointment.find({ doctor: doctor.id, status: "pending" })
        .limit(limit)
        .skip(skip)
        .populate("pet", "name type gender profilePic").populate("owner", "name").lean()
        .sort({ createdAt: -1 });

    return appoinments
}


export const getAppointmentDetailsForUser = async (appointmentId: any) => {

    const appointment = await Appointment.findOne({ _id: appointmentId }).lean().populate({
        path: "pet",
        select: "name type gender profilePic"
    }).populate({
        path: "doctor",
        select: "name profilePic specialization rating ratingsCount city address"
    }).lean();

    if (!appointment) throw new ApiError(404, "appointment not found");

    let chat = null;

    if (appointment.status === "confirmed") {
        chat = await Chat.findOne({
            "members.memberId": {
                $all: [appointment.doctor._id, appointment.owner]
            },
            chatType: "personal"
        }).lean().select("_id")
    }


    return { appointment, chat };

}

export const getAppointmentDetailsForDoctor = async (doctor: any, appointmentId: any) => {

    const appointment = await Appointment.findOne({ _id: appointmentId, doctor: doctor.id })
        .populate("pet", "name type profilePic birthdate gender weight")
        .populate("owner", "name")
        .select("-createdAt -updatedAt -rejectionReason -expiresAt")
        .lean()

    if (!appointment) throw new ApiError(404, "appointment not found");

    let chat = null;

    if (appointment.status === "confirmed") {
        chat = await Chat.findOne({
            "members.memberId": {
                $all: [appointment.doctor._id, appointment.owner]
            },
            chatType: "personal"
        }).lean().select("_id")
    }


    return { appointment, chat };

}


export const approveAppointment = async (doctor: any, appointmentId: any) => {
    const io = getIO();

    const appointment = await Appointment.findOneAndUpdate(
        {
            _id: appointmentId,
            doctor: doctor.id,
            status: "pending"
        },
        {
            status: "confirmed"
        },
        {
            new: true
        }
    ).lean();

    if (!appointment) {
        throw new ApiError(404, "appointment not found");
    }

    const findAnotherAppointmentForThisDoc = await Appointment.findOne({
        doctor: doctor.id,
        time: appointment.time,
        date: appointment.date,
        status: "confirmed",
        _id: { $ne: appointment._id }
    })
        .lean()
        .select("_id");

    if (findAnotherAppointmentForThisDoc) {

        await Appointment.updateOne(
            { _id: appointment._id },
            { status: "pending" }
        );

        throw new ApiError(
            400,
            "sorry this time is not available for this doctor, please ask the patient to select another time slot"
        );
    }



    const [userProfile, chat] = await Promise.all([

        User.findById(appointment.owner)
            .lean()
            .select("email name"),

        Chat.findOneAndUpdate(
            {
                "members.memberId": {
                    $all: [doctor.id, appointment.owner]
                },
                chatType: "personal"
            },
            {
                $setOnInsert: {
                    members: [
                        {
                            memberId: doctor.id,
                            memberModel: "Doctor"
                        },
                        {
                            memberId: appointment.owner,
                            memberModel: "User"
                        }
                    ],
                    chatType: "personal",
                },

                $set: {
                    status: "active"
                }
            },
            {
                upsert: true,
                new: true
            }
        )

    ]);

    const message = await Message.create({
        chatId: chat._id,
        sender: doctor.id,
        senderModel: "Doctor",
        text: `Your appointment on ${appointment.date} at ${appointment.time} has been confirmed by the doctor.`
    });

    await Promise.all([

        UnreadMessage.updateOne(
            {
                chatId: chat._id,
                userId: appointment.owner,
            },
            {
                $inc: {
                    unreadCount: 1
                },

                $set: {
                    lastMessage: message.text
                }
            },
            {
                upsert: true
            }
        ),

        Chat.updateOne(
            {
                _id: chat._id
            },
            {
                lastMessage: message._id
            }
        )


    ])


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


export const endAppointment = async (
    doctor: any,
    appointmentId: any,
    medicalRecord: any,
    vaccination: any,
    upCommingVaccination: any,
    files: any,
) => {


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

    if (
        !medicalRecord?.title ||
        !medicalRecord?.condition ||
        !medicalRecord?.description
    ) {
        throw new ApiError(400, "Medical record is required");
    }

    let attachments: string[] = [];

    if (files && files.length > 0) {
        attachments = files.map((file: any) => file.path);
    }

    const createdMedicalRecord = await MedicalRecord.create({
        pet: appointment.pet._id,
        doctor: doctor.id,
        title: medicalRecord.title,
        condition: medicalRecord.condition,
        description: medicalRecord.description,
        attachments,
        date: new Date(),
    });

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

    appointment.status = "completed";

    await appointment.save();

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


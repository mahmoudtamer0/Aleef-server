import Appointment from "./appointments.schema"
import ApiError from "../../utils/ApiError";







export const bookAppointment = async (user: any, { pet, doctor, date, time, reason, notes }: any) => {


    const checkIfAnyAppointmentsForThisUser = await Appointment.findOne({ owner: user.id, status: { $in: ["pending", "confirmed"] } }).lean().select("_id");

    if (checkIfAnyAppointmentsForThisUser) {
        throw new ApiError(400, "you an active appointmet, cancel your active appointment to be elligble to book appointment");
    }


    const checkIfAnyAppointmentsForThisDoc = await Appointment.findOne({ doctor: doctor, time: time, date: date, status: "confirmed" }).lean().select("_id")

    if (checkIfAnyAppointmentsForThisDoc) {
        throw new ApiError(400, "sorry this time is not available for this doctor, please select another time slot");
    }


    const appointment = await Appointment.create({
        owner: user.id,
        pet: pet,
        doctor: doctor,
        date, time, reason, ...(notes && { notes }),
    })

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

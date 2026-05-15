import catchAsync from "../../utils/catchAsync";
import * as appointmentServices from "./appointment.services"



export const bookAppointment = catchAsync(async (req, res, next) => {

    const user = req.user;

    const appointment = await appointmentServices.bookAppointment(user, req.body);

    return res.status(201).json({
        status: "success",
        appointment,
    })

})



export const getActiveAppointment = catchAsync(async (req, res, next) => {

    const user = req.user;

    const appointment = await appointmentServices.getActiveAppointment(user);

    return res.status(200).json({
        status: "success",
        appointment,
    })

})


export const getAppointmentDetails = catchAsync(async (req, res, next) => {

    const { appointmentId } = req.params;

    const appointment = await appointmentServices.getAppointmentDetails(appointmentId);

    return res.status(200).json({
        status: "success",
        appointment,
    })

})

export const approveAppointment = catchAsync(async (req, res, next) => {

    const doctor = req.user;
    const { appointmentId } = req.params;

    const appointment = await appointmentServices.approveAppointment(doctor, appointmentId);

    return res.status(201).json({
        status: "success",
        appointment,
    })
})

export const rejectAppointment = catchAsync(async (req, res, next) => {

    const doctor = req.user;
    const { appointmentId } = req.params;
    const { rejectionReason } = req.body;

    const appointment = await appointmentServices.rejectAppointment(doctor, appointmentId, rejectionReason);

    return res.status(201).json({
        status: "success",
        appointment,
    })
})


export const getPrevAppoinments = catchAsync(async (req, res, next) => {

    const user = req.user;

    const appointments = await appointmentServices.getPrevAppoinments(user);

    return res.status(200).json({
        status: "success",
        appointments,
    })

})


export const endAppoinment = catchAsync(async (req, res, next) => {

    const doctor = req.user;
    const files = req.files
    const { appointmentId } = req.params;
    const { medicalRecord, vaccination, upCommingVaccination } = req.body;

    const appointment = await appointmentServices.endAppointment(doctor, appointmentId, medicalRecord, vaccination, upCommingVaccination, files);

    return res.status(201).json({
        status: "success",
        appointment,
    })
})
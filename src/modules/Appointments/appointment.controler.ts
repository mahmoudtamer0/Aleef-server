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


export const getPrevAppoinments = catchAsync(async (req, res, next) => {

    const user = req.user;

    const appointments = await appointmentServices.getPrevAppoinments(user);

    return res.status(200).json({
        status: "success",
        appointments,
    })

})
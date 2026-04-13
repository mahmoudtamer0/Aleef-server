import catchAsync from "../../utils/catchAsync";
import * as appointmentServices from "./appointment.services"



export const bookAppointment = catchAsync(async (req, res, next) => {

    const user = req.user;
    const reqFile = req.file;

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
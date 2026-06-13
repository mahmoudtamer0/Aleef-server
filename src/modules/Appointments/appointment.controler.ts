import catchAsync from "../../utils/catchAsync";
import * as userServices from "./services/user.service"
import * as doctorServices from "./services/doctor.service"
import * as adminServices from "./services/admin.service"



export const bookAppointment = catchAsync(async (req, res, next) => {

    const user = req.user;

    const appointment = await userServices.bookAppointment(user, req.body);

    return res.status(201).json({
        status: "success",
        appointment,
    })

})

export const getAllAppoinments = catchAsync(async (req, res, next) => {

    const appointments = await adminServices.getAllAppoinments(req.query);

    return res.status(200).json({
        status: "success",
        appointments: appointments.appointments,
        results: appointments.results,
        page: appointments.page,
        totalPages: appointments.totalPages,
        totalAppointments: appointments.totalAppointments
    })
})


export const getActiveAppointment = catchAsync(async (req, res, next) => {

    const user = req.user;

    const appointment = await userServices.getActiveAppointment(user);

    return res.status(200).json({
        status: "success",
        appointment: appointment === "empty" ? null : appointment
    });

})


export const getAppointmentsRequestsForDoctor = catchAsync(async (req, res, next) => {

    const user = req.user;

    const appointments = await doctorServices.getAppointmentsRequestsForDoctor(user, req.params);

    return res.status(200).json({
        status: "success",
        appointments: appointments.appointments,
        results: appointments.results,
        page: appointments.page,
        totalPages: appointments.totalPages,
        totalRequests: appointments.totalRequests,

    })

})


export const getAppointmentDetails = catchAsync(async (req, res, next) => {

    const { appointmentId } = req.params;

    const user = req.user;
    let appointment = null;

    if (user?.role == "USER" || user?.role == "ADMIN") {
        appointment = await userServices.getAppointmentDetailsForUser(appointmentId);
    } else {
        appointment = await doctorServices.getAppointmentDetailsForDoctor(user, appointmentId);
    }


    return res.status(200).json({
        status: "success",
        appointment: {
            ...appointment.appointment,
            chatId: appointment.chat?.id
        }
    })

})

export const approveAppointment = catchAsync(async (req, res, next) => {

    const doctor = req.user;
    const { appointmentId } = req.params;

    const appointment = await doctorServices.approveAppointment(doctor, appointmentId);

    return res.status(201).json({
        status: "success",
        appointment,
    })
})

export const rejectAppointment = catchAsync(async (req, res, next) => {

    // const doctor = req.user;
    // const { appointmentId } = req.params;
    // const { rejectionReason } = req.body;

    // const appointment = await appointmentServices.rejectAppointment(doctor, appointmentId, rejectionReason);

    // return res.status(201).json({
    //     status: "success",
    //     appointment,
    // })
})


export const getPrevAppoinments = catchAsync(async (req, res, next) => {

    const user = req.user;

    const appointments = await userServices.getPrevAppointments(user);

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

    await doctorServices.endAppointment(doctor, appointmentId, medicalRecord, vaccination, upCommingVaccination, files);

    return res.status(201).json({
        status: "success",
    })
})

export const changeAppoinmentStatus = catchAsync(async (req, res, next) => {

    const { appointmentId } = req.params;
    const { status } = req.body;
    await adminServices.changeAppointmentStatus(appointmentId, status);

    return res.status(200).json({
        status: "success",
    })
})

export const getAppoinmentDetailsForAdmin = catchAsync(async (req, res, next) => {
    const { appointmentId } = req.params;

    const appointment = await adminServices.getAppointmentDetailsForAdmin(appointmentId);
    return res.status(200).json({
        status: "success",
        appointment,
    })
})


export const prevAppointmentsForDoctor = catchAsync(async (req, res, next) => {
    const doctor = req.user;
    const appointments = await doctorServices.prevAppointmentsForDoctor(doctor);

    return res.status(200).json({
        status: "success",
        appointments: appointments.appointments,
        appoinmentsCounts: appointments.appoinmentsCounts,
        doctorRating: appointments.doctorRating
    })
})

export const activeAppoinmentsForDoctor = catchAsync(async (req, res, next) => {
    const doctor = req.user;
    const { date } = req.query;
    const appointments = await doctorServices.getActiveAppoinmentsForDoctor(doctor, date);

    return res.status(200).json({
        status: "success",
        appointments: appointments
    })

})
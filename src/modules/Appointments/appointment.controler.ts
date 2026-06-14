import catchAsync from "../../utils/catchAsync";
import * as userServices from "./services/user.service"
import * as doctorServices from "./services/doctor.service"
import * as adminServices from "./services/admin.service"
import { User } from "../../types/user";



export const bookAppointment = catchAsync(async (req, res, next) => {

    const user = req.user as User;

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

    const user = req.user as User;

    const appointment = await userServices.getActiveAppointment(user);

    return res.status(200).json({
        status: "success",
        appointment: appointment === "empty" ? null : appointment
    });

})


export const getAppointmentsRequestsForDoctor = catchAsync(async (req, res, next) => {

    const user = req.user as User;

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

    const { appointmentId } = req.params as { appointmentId: string };

    const user = req.user as User;
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

    const doctor = req.user as User;
    const { appointmentId } = req.params as { appointmentId: string };

    const appointment = await doctorServices.approveAppointment(doctor, appointmentId);

    return res.status(201).json({
        status: "success",
        appointment,
    })
})

export const rejectAppointment = catchAsync(async (req, res, next) => {

    const doctor = req.user as User;
    const { appointmentId } = req.params as { appointmentId: string };
    const { rejectionReason } = req.body as { rejectionReason: string };

    const appointment = await doctorServices.rejectAppointment(doctor, appointmentId, rejectionReason);

    return res.status(201).json({
        status: "success",
        appointment,
    })
})


export const getPrevAppoinments = catchAsync(async (req, res, next) => {

    const user = req.user;

    const appointments = await userServices.getPrevAppointments(user);

    return res.status(200).json({
        status: "success",
        appointments,
    })

})

export const cancelAppointmentByUser = catchAsync(async (req, res, next) => {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const user = req.user as User;
    await userServices.cancelAppointmentByUser(user, appointmentId as string, reason as string);
    return res.status(200).json({
        status: "success",
    })
})


export const endAppoinment = catchAsync(async (req, res, next) => {

    const doctor = req.user as User;
    const files = req.files
    const { appointmentId } = req.params as { appointmentId: string };
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
    const doctor = req.user as User;
    const appointments = await doctorServices.prevAppointmentsForDoctor(doctor);

    return res.status(200).json({
        status: "success",
        appointments: appointments.appointments,
        appoinmentsCounts: appointments.appoinmentsCounts,
        doctorRating: appointments.doctorRating
    })
})

export const activeAppoinmentsForDoctor = catchAsync(async (req, res, next) => {
    const doctor = req.user as User;
    const { date } = req.query;
    const appointments = await doctorServices.getActiveAppoinmentsForDoctor(doctor, date);

    return res.status(200).json({
        status: "success",
        appointments: appointments
    })

})

export const checkPendingReview = catchAsync(async (req, res, next) => {
    const user = req.user as User;
    const pendingReview = await userServices.checkPendingReview(user);
    return res.status(200).json({
        status: "success",
        pendingReview: pendingReview === "empty" ? null : pendingReview
    })

})

export const addReview = catchAsync(async (req, res, next) => {
    const { appointmentId } = req.params as { appointmentId: string };
    const { rate, comment } = req.body;
    const user = req.user as User;
    await userServices.addReview(user, appointmentId, rate, comment);
    return res.status(200).json({
        status: "success",
    })
})

export const skipAppointmentReview = catchAsync(async (req, res, next) => {
    const { appointmentId } = req.params as { appointmentId: string };
    const user = req.user as User;
    await userServices.skipAppointmentReview(user, appointmentId);
    return res.status(200).json({
        status: "success",
    })
})
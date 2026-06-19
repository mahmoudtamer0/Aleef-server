import catchAsync from "../../utils/catchAsync";
import * as authService from "./services/auth.service"
import * as adminService from "./services/admin.service"
import * as profileService from "./services/profile.service"
import { User } from "../../types/user";



export const doctorRegister = catchAsync(async (req, res, next) => {

    await authService.doctorRegister(req.body, req.files);

    return res.status(201).json({
        status: "success",
        message: "doctor registered. Please verify your email.",
    })

})

export const verifyEmail = catchAsync(async (req, res, next) => {

    await authService.verifyEmail(req.body)

    return res.status(200).json({
        status: "success",
        message: "Your account is under review"
    })
})

export const resendOtp = catchAsync(async (req, res, next) => {

    await authService.resendOtp(req.body)

    return res.status(200).json({
        status: "success",
        message: "otp sent to your email",
    })
})


export const login = catchAsync(async (req, res, next) => {
    const device = req.headers["user-agent"] || ""

    const doctor = await authService.login(req.body, device);

    return res.status(200).json({
        status: "success",
        message: "User logined. Please verify your email.",
        token: doctor.token,
        doctor: {
            id: doctor.doctor.id,
            name: doctor.doctor.name,
            email: doctor.doctor.email,
            phone: doctor.doctor.phone,
            profilePic: doctor.doctor.profilePic,
        }
    })

})

export const logOut = catchAsync(async (req, res, next) => {

    const user = req.user as User
    const status = await authService.logOut(user)

    return res.status(200).json({
        status: "success",
        message: status,
    })
})

export const changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const user = req.user as User;

    await authService.changePassword(user, currentPassword, newPassword);

    return res.status(200).json({
        status: "success",
        message: "Password changed successfully"
    })
})

export const forgetPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    await authService.forgetPassword(email);
    return res.status(200).json({
        status: "success",
        message: "Password reset email sent"
    })
})

export const resetPassword = catchAsync(async (req, res, next) => {
    const { newPassword, otp } = req.body;
    await authService.resetPassword(newPassword, otp);

    return res.status(200).json({
        status: "success",
        message: "Password reset successfully"
    })
})

export const getAllDoctorsRequests = catchAsync(async (req, res, next) => {

    const { search, page, limit } = req.query as { search: string; page: string; limit: string };

    const status = "pending";

    const doctors = await adminService.getAllDoctors({ search, page, limit, status })

    return res.status(200).json({
        status: "success",
        doctors: doctors,
    })

})

export const getDoctor = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params as { doctorId: string };
    const user = req.user;

    let doctor;

    if (user?.role == "ADMIN") {
        doctor = await profileService.getDoctor(doctorId)
    } else {
        doctor = await profileService.getDoctor(doctorId)
    }

    return res.status(200).json({
        status: "success",
        doctorProfile: doctor,
    })

})

export const getMeDoctor = catchAsync(async (req, res, next) => {
    const doctor = req.user as User
    const getMeDoctor = await profileService.getMeDoctor(doctor)

    return res.status(200).json({
        status: "success",
        doctor: getMeDoctor,
    })
})

export const editDoctor = catchAsync(async (req, res, next) => {
    const doctor = req.user as User
    const updatedDoctor = await profileService.editDoctor(doctor, req.body, req.file)

    return res.status(200).json({
        status: "success",
        doctor: updatedDoctor,
    })
})

export const getDoctorToAdmin = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params as { doctorId: string };
    const doctor = await adminService.getDoctorToAdmin(doctorId)

    return res.status(200).json({
        status: "success",
        doctorProfile: doctor,
    })
})

export const approveDoctorRequest = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params as { doctorId: string };

    const doctorApprove = await adminService.approveDoctorRequest(doctorId)

    return res.status(200).json({
        status: "success",
        message: doctorApprove,
    })

})

export const getAllDoctors = catchAsync(async (req, res, next) => {

    const doctors = await adminService.getAllDoctors(req.query as { search: string, status: string, sort?: string, page: string, limit: string })

    return res.status(200).json({
        status: "success",
        doctors: doctors.doctors,
        totalDoctors: doctors.totalDoctors,
        page: doctors.page,
        totalPages: doctors.totalPages,
        results: doctors.results
    })

})

export const getAvailableDoctors = catchAsync(async (req, res, next) => {

    const doctors = await profileService.getAvailableDoctors(req.query as { search: string, status: string, sort: string, page: string, limit: string, user_lat?: string, user_lng?: string })

    return res.status(200).json({
        status: "success",
        doctors: doctors.doctors,
        totalDoctors: doctors.totalDoctors,
        page: doctors.page,
        totalPages: doctors.totalPages,
        results: doctors.results
    })
})

export const getDoctorSchedual = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params as { doctorId: string };
    const doctors = await profileService.getDoctorSchedual(doctorId)

    return res.status(200).json({
        status: "success",
        doctor: doctors.doctor,
        schedual: doctors.doctorDays,
        firstDaySlots: doctors.firstDaySlots,
    })

})



export const getDoctorSlots = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params as { doctorId: string };
    const { date } = req.query as { date: string };
    const doctors = await profileService.getDoctorSlots(doctorId, date)

    return res.status(200).json({
        status: "success",
        slots: doctors,
    })

})

export const getDoctorScheduleForDoctor = catchAsync(async (req, res, next) => {
    const doctor = req.user as User

    const schedule = await profileService.getDoctorScheduleForDoctor(doctor)
    return res.status(200).json({
        status: "success",
        schedule: schedule,
    })
})

export const editDoctorSchedule = catchAsync(async (req, res, next) => {
    const doctor = req.user as User
    const { schedule } = req.body
    const updatedSchedule = await profileService.editDoctorSchedule(doctor, schedule)
    return res.status(200).json({
        status: "success",
        schedule: updatedSchedule,
    })
})

export const addFcmToken = catchAsync(async (req, res, next) => {

    const { fcmToken } = req.body;
    const doctor = req.user as User;

    await authService.addFcmToken(doctor, fcmToken);

    return res.status(200).json({
        status: "success",
        message: "added successfully"
    });

})
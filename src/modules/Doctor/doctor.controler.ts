import catchAsync from "../../utils/catchAsync";
import * as authService from "./services/auth.service"
import * as adminService from "./services/admin.service"
import * as profileService from "./services/profile.service"



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
    const user = req.user
    const status = await authService.logOut(user)

    return res.status(200).json({
        status: "success",
        message: status,
    })
})

export const getAllDoctorsRequests = catchAsync(async (req, res, next) => {

    const { search, page, limit } = req.query;

    const status = "pending";

    const doctors = await adminService.getAllDoctors({ search, page, limit, status })

    return res.status(200).json({
        status: "success",
        doctors: doctors,
    })

})

export const getDoctor = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params
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
    const doctorId = req.user
    const doctor = await profileService.getMeDoctor(doctorId)

    return res.status(200).json({
        status: "success",
        doctor: doctor,
    })
})

export const editDoctor = catchAsync(async (req, res, next) => {
    const doctor = req.user
    const updatedDoctor = await profileService.editDoctor(doctor, req.body, req.files)

    return res.status(200).json({
        status: "success",
        doctor: updatedDoctor,
    })
})

export const getDoctorToAdmin = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params
    const doctor = await adminService.getDoctorToAdmin(doctorId)

    return res.status(200).json({
        status: "success",
        doctorProfile: doctor,
    })
})

export const approveDoctorRequest = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params

    const doctorApprove = await adminService.approveDoctorRequest(doctorId)

    return res.status(200).json({
        status: "success",
        message: doctorApprove,
    })

})

export const getAllDoctors = catchAsync(async (req, res, next) => {

    const doctors = await adminService.getAllDoctors(req.query)

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

    const doctors = await profileService.getAvailableDoctors(req.query)

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
    const { doctorId } = req.params
    const doctors = await profileService.getDoctorSchedual(doctorId)

    return res.status(200).json({
        status: "success",
        doctor: doctors.doctor,
        schedual: doctors.doctorDays,
        firstDaySlots: doctors.firstDaySlots,
    })

})



export const getDoctorSlots = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params
    const { date } = req.query
    const doctors = await profileService.getDoctorSlots(doctorId, date)

    return res.status(200).json({
        status: "success",
        slots: doctors,
    })

})

export const getDoctorScheduleForDoctor = catchAsync(async (req, res, next) => {
    const doctor = req.user

    const schedule = await profileService.getDoctorScheduleForDoctor(doctor)
    return res.status(200).json({
        status: "success",
        schedule: schedule,
    })
})

export const editDoctorSchedule = catchAsync(async (req, res, next) => {
    const doctor = req.user
    const { schedule } = req.body
    const updatedSchedule = await profileService.editDoctorSchedule(doctor, schedule)
    return res.status(200).json({
        status: "success",
        schedule: updatedSchedule,
    })
})




// export const addReviewToDoctor = catchAsync(async (req, res, next) => {
//     const { doctorId } = req.params
//     const user = req.user
//     const review = await doctorService.addReviewToDoctor(user, doctorId, req.body)

//     return res.status(200).json({
//         status: "success",
//         review
//     })

// })
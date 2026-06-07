import catchAsync from "../../utils/catchAsync";
import * as doctorService from "./doctor.services"



export const doctorRegister = catchAsync(async (req, res, next) => {

    await doctorService.doctorRegister(req.body, req.files);

    return res.status(201).json({
        status: "success",
        message: "doctor registered. Please verify your email.",
    })

})

export const verifyEmail = catchAsync(async (req, res, next) => {

    await doctorService.verifyEmail(req.body)

    return res.status(200).json({
        status: "success",
        message: "Your account is under review"
    })
})

export const resendOtp = catchAsync(async (req, res, next) => {

    await doctorService.resendOtp(req.body)

    return res.status(200).json({
        status: "success",
        message: "otp sent to your email",
    })
})


export const login = catchAsync(async (req, res, next) => {
    const device = req.headers["user-agent"] || ""

    const doctor = await doctorService.login(req.body, device);

    return res.status(200).json({
        status: "success",
        message: "User logined. Please verify your email.",
        token: doctor.token,
        doctor: {
            id: doctor.doctor._id,
            name: doctor.doctor.name,
            email: doctor.doctor.email,
            phone: doctor.doctor.phone,
            profilePic: doctor.doctor.profilePic,
        }
    })

})

export const getAllDoctorsRequests = catchAsync(async (req, res, next) => {

    const doctors = await doctorService.getAllDoctorsRequests(req.query)

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
        doctor = await doctorService.getDoctor(doctorId)
    } else {
        doctor = await doctorService.getDoctor(doctorId)
    }

    return res.status(200).json({
        status: "success",
        doctorProfile: doctor,
    })

})

export const approveDoctorRequest = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params

    const doctorApprove = await doctorService.approveDoctorRequest(doctorId)

    return res.status(200).json({
        status: "success",
        message: doctorApprove,
    })

})

export const getAllDoctors = catchAsync(async (req, res, next) => {

    const doctors = await doctorService.getAllDoctors(req.query)

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

    const doctors = await doctorService.getAvailableDoctors(req.query)

    return res.status(200).json({
        status: "success",
        doctors: doctors,
    })
})

export const getDoctorSchedual = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params
    const doctors = await doctorService.getDoctorSchedual(doctorId)

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
    const doctors = await doctorService.getDoctorSlots(doctorId, date)

    return res.status(200).json({
        status: "success",
        slots: doctors,
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
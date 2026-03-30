import catchAsync from "../../utils/catchAsync";
import * as doctorService from "./doctor.services"



export const doctorRegister = catchAsync(async (req, res, next) => {

    const doctor = await doctorService.doctorRegister(req.body, req.file);

    return res.status(200).json({
        status: "success",
        message: "doctor registered. Please verify your email.",
    })

})

export const verifyEmail = catchAsync(async (req, res, next) => {
    const device = req.headers["user-agent"] || ""
    const verfied = await doctorService.verifyEmail(req.body, device)

    return res.status(200).json({
        status: "success",
        message: "Your account is under review"
    })
})

export const resendOtp = catchAsync(async (req, res, next) => {

    const verify = await doctorService.resendOtp(req.body)

    return res.status(200).json({
        status: "success",
        message: "otp sent to your email",
    })
})

export const getAllDoctorsRequests = catchAsync(async (req, res, next) => {

    const doctors = await doctorService.getAllDoctorsRequests()

    return res.status(200).json({
        status: "success",
        doctors: doctors,
    })

})

export const getDoctor = catchAsync(async (req, res, next) => {
    const { doctorId } = req.params
    const doctor = await doctorService.getDoctor(doctorId)

    return res.status(200).json({
        status: "success",
        doctor: doctor,
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

    const doctors = await doctorService.getAllDoctors()

    return res.status(200).json({
        status: "success",
        doctors: doctors,
    })

})
import express from "express";
import { doctorRegister, verifyEmail, resendOtp, getAllDoctorsRequests, getAllDoctors, approveDoctorRequest, getDoctor, getDoctorSchedual, getDoctorSlots, login, getAvailableDoctors, getDoctorToAdmin, getMeDoctor, editDoctor, getDoctorScheduleForDoctor, editDoctorSchedule, logOut, addFcmToken, changePassword, forgetPassword, resetPassword, chargeDoctor } from "./doctor.controler";
import { upload } from "../../middlewares/doctorProfilepic"
import validate from "../../middlewares/userValidate";
import { registerSchema, verifyOtpSchema, resendOtpSchema, editDoctorProfileSchema, editScheduleSchema, changePasswordSchema, forgetPasswordSchema, resetPasswordSchema } from "./doctor.validation";
import { verifyToken } from "../../middlewares/verifyToken";
import { allowTo } from "../../middlewares/allowTo";
import { loginSchema } from "../User/users.validation";

const router = express.Router()

router.route("/register")
    .post(upload.fields([
        { name: "profilePic", maxCount: 1 },
        { name: "IdentityVerificationImage", maxCount: 1 },
        { name: "NationalIdFront", maxCount: 1 },
        { name: "NationalIdBack", maxCount: 1 },
    ]), validate(registerSchema), doctorRegister)

router.route("/verify-email")
    .post(validate(verifyOtpSchema), verifyEmail)


router.route("/login")
    .post(validate(loginSchema), login)

router.route("/resend-otp")
    .patch(validate(resendOtpSchema), resendOtp)

router.route("/change-password")
    .patch(verifyToken, validate(changePasswordSchema), changePassword)

router.route("/forget-password")
    .patch(validate(forgetPasswordSchema), forgetPassword)

router.route("/reset-password")
    .patch(validate(resetPasswordSchema), resetPassword)

router.route("/logout")
    .post(verifyToken, logOut)

router.route("/add-fcmToken")
    .post(verifyToken, addFcmToken)

router.route("/get-doctors-requests")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getAllDoctorsRequests)

router.route("/get-all-doctors")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getAllDoctors)

router.route("/get-available-doctors")
    .get(getAvailableDoctors)

router.route("/me/schedule")
    .get(verifyToken, getDoctorScheduleForDoctor)
    .patch(verifyToken, validate(editScheduleSchema), editDoctorSchedule)

router.route("/me")
    .get(verifyToken, getMeDoctor)
    .patch(verifyToken, upload.single("profilePic"), validate(editDoctorProfileSchema), editDoctor)

router.route("/charge-doctor/:doctorId")
    .post(verifyToken, allowTo("ADMIN"), chargeDoctor)

router.route("/approve-request/:doctorId")
    .post(verifyToken, allowTo("ADMIN"), approveDoctorRequest)

router.route("/:doctorId/schedual")
    .get(verifyToken, getDoctorSchedual)

router.route("/:doctorId/slots")
    .get(verifyToken, getDoctorSlots)



router.route("/details-for-admin/:doctorId")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getDoctorToAdmin)

router.route("/:doctorId")
    .get(verifyToken, getDoctor)

export default router
import express from "express";
import { doctorRegister, verifyEmail, resendOtp, getAllDoctorsRequests, getAllDoctors, approveDoctorRequest, getDoctor, getDoctorSchedual, getDoctorSlots, addReviewToDoctor, login } from "./doctor.controler";
import { upload } from "../../middlewares/doctorProfilepic"
import validate from "../../middlewares/userValidate";
import { registerSchema, verifyOtpSchema, resendOtpSchema, addReviewSchema } from "./doctor.validation";
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
    .post(validate(resendOtpSchema), resendOtp)

router.route("/get-doctors-requests")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getAllDoctorsRequests)

router.route("/get-all-doctors")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getAllDoctors)

router.route("/get-available-doctors")
    .get(verifyToken, getAllDoctors)


router.route("/approve-request/:doctorId")
    .post(verifyToken, allowTo("ADMIN"), approveDoctorRequest)

router.route("/:doctorId/schedual")
    .get(verifyToken, getDoctorSchedual)
router.route("/:doctorId/slots")
    .get(verifyToken, getDoctorSlots)

router.route("/:doctorId/add-review")
    .post(verifyToken, validate(addReviewSchema), addReviewToDoctor)

router.route("/:doctorId")
    .get(verifyToken, getDoctor)

export default router
import express from "express";
import { doctorRegister, verifyEmail, resendOtp, getAllDoctorsRequests, getAllDoctors, approveDoctorRequest, getDoctor } from "./doctor.controler";
import { upload } from "../../middlewares/doctorProfilepic"
import validate from "../../middlewares/userValidate";
import { registerSchema, verifyOtpSchema, resendOtpSchema } from "./doctor.validation";
import { verifyToken } from "../../middlewares/verifyToken";
import { allowTo } from "../../middlewares/allowTo";

const router = express.Router()

router.route("/register")
    .post(upload.single("profilePic"), validate(registerSchema), doctorRegister)

router.route("/verify-email")
    .post(validate(verifyOtpSchema), verifyEmail)

router.route("/resend-otp")
    .post(validate(resendOtpSchema), resendOtp)

router.route("/get-doctors-requests")
    .get(verifyToken, allowTo("ADMIN"), getAllDoctorsRequests)

router.route("/get-all-doctors")
    .get(verifyToken, allowTo("ADMIN"), getAllDoctors)

router.route("/approve-request/:doctorId")
    .patch(verifyToken, allowTo("ADMIN"), approveDoctorRequest)

router.route("/:doctorId")
    .get(verifyToken, getDoctor)

export default router
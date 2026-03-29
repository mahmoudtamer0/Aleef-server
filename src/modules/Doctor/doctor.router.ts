import express from "express";
import { doctorRegister, verifyEmail, resendOtp } from "./doctor.controler";
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


export default router
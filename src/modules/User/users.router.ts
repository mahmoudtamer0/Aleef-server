import express from "express";
import { login, logOut, register, resendOtp, verifyEmail } from "./users.controler";
import { upload } from "../../middlewares/userProfileImage"
import validate from "../../middlewares/userValidate";
import { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema } from "./users.validation";
import { verifyToken } from "../../middlewares/verifyToken";

const router = express.Router()

router.route("/register")
    .post(upload.single("profilePic"), validate(registerSchema), register)

router.route("/verify-email")
    .post(validate(verifyOtpSchema), verifyEmail)

router.route("/resend-otp")
    .post(validate(resendOtpSchema), resendOtp)

router.route("/login")
    .post(validate(loginSchema), login)

router.route("/logout")
    .post(verifyToken, logOut)

export default router
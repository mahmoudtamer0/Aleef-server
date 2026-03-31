import express from "express";
import { banUser, editUserProfile, getME, login, logOut, register, resendOtp, verifyEmail, getAllUsers, getUserToAdmin } from "./users.controler";
import { upload } from "../../middlewares/userProfileImage"
import validate from "../../middlewares/userValidate";
import { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema, editProfileSchema } from "./users.validation";
import { verifyToken } from "../../middlewares/verifyToken";
import { allowTo } from "../../middlewares/allowTo";

const router = express.Router()

router.route("/register")
    .post(upload.single("profilePic"), validate(registerSchema), register)

router.route("/verify-email")
    .post(validate(verifyOtpSchema), verifyEmail)

router.route("/resend-otp")
    .post(validate(resendOtpSchema), resendOtp)

router.route("/login")
    .post(validate(loginSchema), login)

router.route("/me")
    .get(verifyToken, getME)

router.route("/get-all-users")
    .get(verifyToken, allowTo("ADMIN"), getAllUsers)

router.route("/edit-user-profile")
    .patch(verifyToken,
        (req, res, next) => {
            console.log("🚀 Route hit before multer");
            next();
        },
        upload.single("profilePic"),
        (req, res, next) => {
            console.log("📸 After multer:", req.file);
            next();
        }, validate(editProfileSchema), editUserProfile)

router.route("/logout")
    .post(verifyToken, logOut)

router.route("/baan-user/:userId")
    .post(verifyToken, allowTo("ADMIN"), banUser)

router.route("/:userId")
    .get(verifyToken, allowTo("ADMIN"), getUserToAdmin)

export default router
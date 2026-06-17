import express from "express";
import { banUser, editUserProfile, getME, login, logOut, register, resendOtp, verifyEmail, getAllUsers, getUserToAdmin, google, addFcmToken, getUnreadNotificationsCount, getNotifications, markAllNotificationsAsRead } from "./users.controler";
import { upload } from "../../middlewares/userProfileImage"
import validate from "../../middlewares/userValidate";
import { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema } from "./users.validation";
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

router.route("/google")
    .post(google)

router.route("/add-fcmToken")
    .post(verifyToken, addFcmToken)

// router.route("/send-notification")
//     .post(sendNotification)



router.route("/me")
    .get(verifyToken, getME)

router.route("/get-all-users")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getAllUsers)

router.patch(
    "/edit-user-profile",
    verifyToken,
    upload.single("profilePic"),
    editUserProfile
);

router.route("/get-unread-notifications-count")
    .get(verifyToken, getUnreadNotificationsCount)

router.route("/get-notifications")
    .get(verifyToken, getNotifications)

router.route("/mark-all-notifications-as-read")
    .patch(verifyToken, markAllNotificationsAsRead)

router.route("/logout")
    .post(verifyToken, logOut)

router.route("/baan-user/:userId")
    .post(verifyToken, allowTo("ADMIN"), banUser)

router.route("/:userId")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getUserToAdmin)

export default router
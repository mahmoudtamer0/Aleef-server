import express from "express";
import { activeAppoinmentsForDoctor, addReview, approveAppointment, bookAppointment, cancelAppointmentByUser, changeAppoinmentStatus, checkPendingReview, endAppoinment, getActiveAppointment, getAllAppoinments, getAppoinmentDetailsForAdmin, getAppointmentDetails, getAppointmentsRequestsForDoctor, getPrevAppoinments, prevAppointmentsForDoctor, rejectAppointment, skipAppointmentReview } from "./appointment.controler";
import { upload } from "../../middlewares/appoinmentUploads"
import validate from "../../middlewares/userValidate";
import { addAppointmentSchema, addReviewSchema, cancelAppointmentByUserSchema, rejectAppoinmentSchema } from "./appointment.validation";
import { verifyToken } from "../../middlewares/verifyToken";
import { allowTo } from "../../middlewares/allowTo";

const router = express.Router()

router.route("/")
    .post(verifyToken, upload.single("profilePic"), validate(addAppointmentSchema), bookAppointment)
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getAllAppoinments)

router.route("/get-my-active-appointment")
    .get(verifyToken, getActiveAppointment)

router.route("/requests")
    .get(verifyToken, allowTo("DOCTOR"), getAppointmentsRequestsForDoctor)

router.route("/active-appointments")
    .get(verifyToken, allowTo("DOCTOR"), activeAppoinmentsForDoctor)


router.route("/get-my-previous-appointments")
    .get(verifyToken, getPrevAppoinments)

router.route("/doctor-performance")
    .get(verifyToken, allowTo("DOCTOR"), prevAppointmentsForDoctor)

router.route("/check-pending-review")
    .get(verifyToken, checkPendingReview)

router.route("/add-review/:appointmentId")
    .post(verifyToken, allowTo("USER", "ADMIN", "MODERATOR"), validate(addReviewSchema), addReview);

router.route("/skip-review/:appointmentId")
    .post(verifyToken, allowTo("USER", "ADMIN", "MODERATOR"), skipAppointmentReview);

router.route("/approve-appointment/:appointmentId")
    .post(verifyToken, allowTo("DOCTOR"), approveAppointment);

router.route("/reject-appointment/:appointmentId")
    .post(verifyToken, allowTo("DOCTOR"), validate(rejectAppoinmentSchema), rejectAppointment);

router.route("/end-appointment/:appointmentId")
    .patch(verifyToken, upload.array("attachments", 5), allowTo("DOCTOR"), endAppoinment);

router.route("/change-status/:appointmentId")
    .patch(verifyToken, allowTo("ADMIN", "MODERATOR"), changeAppoinmentStatus);


router.route("/cancel-appointment-by-user/:appointmentId")
    .patch(verifyToken, validate(cancelAppointmentByUserSchema), cancelAppointmentByUser);

router.route("/details-for-admin/:appointmentId")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getAppoinmentDetailsForAdmin);

router.route("/:appointmentId")
    .get(verifyToken, getAppointmentDetails);

export default router
import express from "express";
import { approveAppointment, bookAppointment, endAppoinment, getActiveAppointment, getAllAppoinments, getAppointmentDetails, getAppointmentsRequestsForDoctor, getPrevAppoinments, rejectAppointment } from "./appointment.controler";
import { upload } from "../../middlewares/appoinmentUploads"
import validate from "../../middlewares/userValidate";
import { addAppointmentSchema, rejectAppoinmentSchema } from "./appointment.validation";
import { verifyToken } from "../../middlewares/verifyToken";
import { allowTo } from "../../middlewares/allowTo";

const router = express.Router()

router.route("/")
    .post(verifyToken, upload.single("profilePic"), validate(addAppointmentSchema), bookAppointment)
    .get(verifyToken, allowTo("ADMIN"), getAllAppoinments)

router.route("/get-my-active-appointment")
    .get(verifyToken, getActiveAppointment)

router.route("/requests")
    .get(verifyToken, allowTo("DOCTOR"), getAppointmentsRequestsForDoctor)

router.route("/get-my-previous-appointments")
    .get(verifyToken, getPrevAppoinments)

router.route("/approve-appointment/:appointmentId")
    .post(verifyToken, allowTo("DOCTOR"), approveAppointment);

router.route("/reject-appointment/:appointmentId")
    .post(verifyToken, allowTo("DOCTOR"), validate(rejectAppoinmentSchema), rejectAppointment);

router.route("/end-appointment/:appointmentId")
    .patch(verifyToken, upload.array("attachments", 5), allowTo("DOCTOR"), endAppoinment);

router.route("/:appointmentId")
    .get(verifyToken, getAppointmentDetails);

export default router
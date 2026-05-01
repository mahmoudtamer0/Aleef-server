import express from "express";
import { approveAppointment, bookAppointment, getActiveAppointment, getAppointmentDetails, getPrevAppoinments } from "./appointment.controler";
import { upload } from "../../middlewares/userProfileImage"
import validate from "../../middlewares/userValidate";
import { addAppointmentSchema } from "./appointment.validation";
import { verifyToken } from "../../middlewares/verifyToken";
import { allowTo } from "../../middlewares/allowTo";

const router = express.Router()

router.route("/")
    .post(verifyToken, upload.single("profilePic"), validate(addAppointmentSchema), bookAppointment)

router.route("/get-my-active-appointment")
    .get(verifyToken, getActiveAppointment)

router.route("/get-my-previous-appointments")
    .get(verifyToken, getPrevAppoinments)

router.route("/approve-appointment/:appointmentId")
    .post(verifyToken, allowTo("DOCTOR"), approveAppointment);

router.route("/:appointmentId")
    .get(verifyToken, getAppointmentDetails);

export default router
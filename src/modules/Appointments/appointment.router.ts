import express from "express";
import { bookAppointment, getActiveAppointment } from "./appointment.controler";
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

export default router
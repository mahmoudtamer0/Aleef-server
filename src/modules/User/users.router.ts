import express from "express";
import { } from "./users.controler";
import { upload } from "../../middlewares/userProfileImage"

const router = express.Router()

router.route("/register")
    .post(upload.single("profilePic"))

export default router
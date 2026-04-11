import express from "express";
import { addPet } from "./pet.controler";
import { upload } from "../../middlewares/userProfileImage"
import validate from "../../middlewares/userValidate";
import { addPetSchema } from "./pet.validation";
import { verifyToken } from "../../middlewares/verifyToken";
import { allowTo } from "../../middlewares/allowTo";

const router = express.Router()

router.route("/")
    .post(verifyToken, upload.single("profilePic"), validate(addPetSchema), addPet)



export default router
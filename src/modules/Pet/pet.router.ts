import express from "express";
import { addPet, editPet, getMyPets, getPetProfile } from "./pet.controler";
import { upload } from "../../middlewares/petsUploads"
import validate from "../../middlewares/userValidate";
import { addPetSchema, editPetSchema } from "./pet.validation";
import { verifyToken } from "../../middlewares/verifyToken";
const router = express.Router()

router.route("/")
    .post(verifyToken, upload.single("profilePic"), validate(addPetSchema), addPet)

router.route("/get-my-pets")
    .get(verifyToken, getMyPets)

router.route("/:petId")
    .get(verifyToken, getPetProfile)
    .patch(
        verifyToken,
        upload.single("profilePic"),
        validate(editPetSchema),
        editPet
    );

export default router
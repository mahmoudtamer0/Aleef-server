import express from "express";
import { addPet, editPet, getUserPets, getPetProfile, deletePet } from "./pet.controler";
import { upload } from "../../middlewares/petsUploads"
import validate from "../../middlewares/userValidate";
import { addPetSchema, editPetSchema } from "./pet.validation";
import { verifyToken } from "../../middlewares/verifyToken";
import { allowTo } from "../../middlewares/allowTo";
const router = express.Router()

router.route("/")
    .post(verifyToken, upload.single("profilePic"), validate(addPetSchema), addPet)

router.route("/get-my-pets")
    .get(verifyToken, getUserPets)

router.route("/get-user-pets/:userId")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getUserPets)


router.route("/:petId")
    .get(verifyToken, getPetProfile)
    .patch(
        verifyToken,
        upload.single("profilePic"),
        validate(editPetSchema),
        editPet
    )
    .delete(verifyToken, deletePet)

export default router
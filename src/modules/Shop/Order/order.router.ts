import express from "express"
import { verifyToken } from "../../../middlewares/verifyToken"
import { allowTo } from "../../../middlewares/allowTo"
import { upload } from "../../../middlewares/productsUploads"
import validate from "../../../middlewares/userValidate"
import { createOrder } from "./order.controler"
import { orderValidationSchema } from "./order.validation"


const router = express.Router()

router.route("/")
    .post(verifyToken, validate(orderValidationSchema), createOrder)

export default router

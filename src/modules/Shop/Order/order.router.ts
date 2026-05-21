import express from "express"
import { verifyToken } from "../../../middlewares/verifyToken"
import validate from "../../../middlewares/userValidate"
import { createOrder, getAllOrderDetailsForAdmin, getAllOrders, getMyPreviousOrders, getMyUpComingOrders } from "./order.controler"
import { orderValidationSchema } from "./order.validation"
import { allowTo } from "../../../middlewares/allowTo"


const router = express.Router()

router.route("/")
    .post(verifyToken, validate(orderValidationSchema), createOrder)
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getAllOrders)


router.route("/my-upcoming-orders")
    .get(verifyToken, getMyUpComingOrders)

router.route("/my-previous-orders")
    .get(verifyToken, getMyPreviousOrders)

router.route("/:orderId")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getAllOrderDetailsForAdmin)

export default router

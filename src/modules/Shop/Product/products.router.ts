import express from "express"
import { verifyToken } from "../../../middlewares/verifyToken"
import { allowTo } from "../../../middlewares/allowTo"
import { upload } from "../../../middlewares/productsUploads"
import validate from "../../../middlewares/userValidate"
import { calculateCartSchema } from "./product.validation"
import { addProduct, calculateCart, editProduct, getProduct, getProducts } from "./product.controler"


const router = express.Router()

router.route("/")
    .post(
        verifyToken,
        allowTo("ADMIN", "MODERATOR"),
        upload.fields([
            { name: "thumbnail", maxCount: 1 },
            { name: "productImages", maxCount: 5 },
        ]),
        addProduct
    )
    .get(getProducts)


router.route("/calculate-cart")
    .post(validate(calculateCartSchema), calculateCart)


router.route("/:prodId")
    .get(getProduct)
    .patch(
        verifyToken,
        allowTo("ADMIN"),
        upload.fields([
            { name: "thumbnail", maxCount: 1 },
            { name: "productImages", maxCount: 5 }
        ]),
        editProduct
    )


export default router

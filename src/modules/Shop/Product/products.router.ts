import express from "express"
import { verifyToken } from "../../../middlewares/verifyToken"
import { allowTo } from "../../../middlewares/allowTo"
import { upload } from "../../../middlewares/productsUploads"
import validate from "../../../middlewares/userValidate"
import { addProductValidation, calculateCartSchema } from "./product.validation"
import { addManyProducts, addProduct, calculateCart, editProduct, getProduct, getProducts } from "./product.controler"


const router = express.Router()

router.route("/")
    .post(
        verifyToken,
        allowTo("ADMIN"),
        upload.fields([
            { name: "thumbnail", maxCount: 1 },
            { name: "productImages", maxCount: 5 }
        ]),
        validate(addProductValidation),
        addProduct
    )
    .get(verifyToken, getProducts)

router.route("/calculate-cart")
    .post(verifyToken, validate(calculateCartSchema), calculateCart)

router.route("/many-products")
    .post(addManyProducts)

router.route("/:prodId")
    .get(verifyToken, getProduct)
    .patch(
        verifyToken,
        allowTo("ADMIN"),
        upload.fields([
            { name: "thumbnail", maxCount: 1 },
            { name: "productImages", maxCount: 5 }
        ]), editProduct
    )


export default router

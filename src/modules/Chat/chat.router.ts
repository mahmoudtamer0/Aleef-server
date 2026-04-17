import express from "express";

import { verifyToken } from "../../middlewares/verifyToken";
import { allowTo } from "../../middlewares/allowTo";
import { getChats } from "./chat.controler";
const router = express.Router()



router.route("/")
    .get(verifyToken, getChats)


export default router

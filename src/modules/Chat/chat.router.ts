import express from "express";

import { verifyToken } from "../../middlewares/verifyToken";
import { getAllChats, getChatbotMessages, getChatMessages, getChats } from "./chat.controler";
import { allowTo } from "../../middlewares/allowTo";
const router = express.Router()



router.route("/")
    .get(verifyToken, getChats)

router.route("/all")
    .get(verifyToken, allowTo("ADMIN"), getAllChats)

router.route("/chatbot")
    .get(verifyToken, getChatbotMessages)

router.route("/:chatId/messages")
    .get(verifyToken, getChatMessages)


export default router

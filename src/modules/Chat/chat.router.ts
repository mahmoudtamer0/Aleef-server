import express from "express";

import { verifyToken } from "../../middlewares/verifyToken";
import { allowTo } from "../../middlewares/allowTo";
import { getChatbotMessages, getChatMessages, getChats } from "./chat.controler";
const router = express.Router()



router.route("/")
    .get(verifyToken, getChats)

router.route("/chatbot")
    .get(verifyToken, getChatbotMessages)

router.route("/:chatId/messages")
    .get(verifyToken, getChatMessages)


export default router

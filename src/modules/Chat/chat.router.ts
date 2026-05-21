import express from "express";

import { verifyToken } from "../../middlewares/verifyToken";
import { getAllChats, getChatbotMessages, getChatMessages, getChatMessagesForAdmin, getChats } from "./chat.controler";
import { allowTo } from "../../middlewares/allowTo";
const router = express.Router()



router.route("/")
    .get(verifyToken, getChats)

router.route("/all")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getAllChats)

router.route("/chatbot")
    .get(verifyToken, getChatbotMessages)

router.route("/:chatId/messages")
    .get(verifyToken, getChatMessages)

router.route("/:chatId/messages/admin")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getChatMessagesForAdmin)

export default router

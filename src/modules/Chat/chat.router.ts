import express from "express";

import { verifyToken } from "../../middlewares/verifyToken";
import { getAllChats, getChatbotMessages, getChatMessages, getChatMessagesForAdmin, getChats, uploadChatPhoto } from "./chat.controler";
import { allowTo } from "../../middlewares/allowTo";
import { upload } from "../../middlewares/chatUploads";
const router = express.Router()



router.route("/")
    .get(verifyToken, getChats)

router.route("/all")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getAllChats)


router.route("/chatbot/image")
    .post(upload.single("image"), uploadChatPhoto)

router.route("/chatbot")
    .get(verifyToken, getChatbotMessages)

router.route("/:chatId/messages")
    .get(verifyToken, getChatMessages)

router.route("/:chatId/messages/admin")
    .get(verifyToken, allowTo("ADMIN", "MODERATOR"), getChatMessagesForAdmin)

export default router

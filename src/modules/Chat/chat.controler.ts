import catchAsync from "../../utils/catchAsync";
import * as chatServices from "./chat.services"



export const getChats = catchAsync(async (req, res, next) => {

    const user = req.user;
    const { chatId } = req.params;
    const chats = await chatServices.getChats(user);

    return res.status(200).json({
        status: "success",
        chats,
    })
})


export const getChatMessages = catchAsync(async (req, res, next) => {

    const user = req.user;
    const { chatId } = req.params;
    const messages = await chatServices.getChatMessages(chatId, user);
    return res.status(200).json({
        status: "success",
        messages: messages.messages,
        chatId: messages.chatId,
        user: messages.user,
    })
});



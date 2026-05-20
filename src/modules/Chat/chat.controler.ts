import catchAsync from "../../utils/catchAsync";
import * as chatServices from "./chat.services"



export const getChats = catchAsync(async (req, res, next) => {

    const user = req.user;
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


export const getChatbotMessages = catchAsync(async (req, res, next) => {
    const user = req.user;
    const messages = await chatServices.getChatbotMessages(user);

    return res.status(200).json({
        status: "success",
        messages: messages.messages,
        chatId: messages.chatId
    })
})


export const getAllChats = catchAsync(async (req, res, next) => {

    const chats = await chatServices.getAllChats();
    return res.status(200).json({
        status: "success",
        chats,
    });

})
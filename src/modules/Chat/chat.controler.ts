import e from "express";
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

    const chats = await chatServices.getAllChats(req.query);
    return res.status(200).json({
        status: "success",
        chats: chats.chats,
        totalChats: chats.totalChats,
        totalPages: chats.totalPages,
        results: chats.results,
        page: chats.page,
    });

})

export const getChatMessagesForAdmin = catchAsync(async (req, res, next) => {
    const { chatId } = req.params;
    const messages = await chatServices.getChatMessagesForAdmin(chatId);
    return res.status(200).json({
        status: "success",
        messages: messages,
    })
}); 
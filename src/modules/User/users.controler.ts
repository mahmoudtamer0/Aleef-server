import catchAsync from "../../utils/catchAsync";
import * as userService from "./users.services"



export const register = catchAsync(async (req, res, next) => {

    const user = await userService.register(req.body)

    return res.status(200).json({
        status: "success",
        message: "User registered. Please verify your email.",
    })

})

export const verifyEmail = catchAsync(async (req, res, next) => {
    const device = req.headers["user-agent"] || ""
    const verfied = await userService.verifyEmail(req.body, device)

    return res.status(200).json({
        status: "success",
        token: verfied.token,
        user: {
            id: verfied.user._id,
            name: verfied.user.name,
            email: verfied.user.email,
            profilePic: verfied.user.profilePic,
        }
    })
})

export const resendOtp = catchAsync(async (req, res, next) => {

    const verify = await userService.resendOtp(req.body)

    return res.status(200).json({
        status: "success",
        message: "User registered. Please verify your email.",
    })
})

export const login = catchAsync(async (req, res, next) => {

    const device = req.headers["user-agent"] || ""
    const user = await userService.login(req.body, device)

    return res.status(200).json({
        status: "success",
        message: "User logined. Please verify your email.",
        token: user.token,
        user: {
            id: user.findUser._id,
            name: user.findUser.name,
            email: user.findUser.email,
            profilePic: user.findUser.profilePic,
        }
    })

})

export const forgetPassword = catchAsync(async (req, res, next) => {

    const forget = null

    return res.status(200).json({
        status: "success",
        message: "User registered. Please verify your email.",
    })

})

export const logOut = catchAsync(async (req, res, next) => {

    const user = (req as any).user

    const logout = await userService.logOut(user)

    return res.status(200).json({
        status: logout,
        message: "log-out successfuly",
    })

})
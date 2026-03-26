import catchAsync from "../../utils/catchAsync";
import * as userService from "./users.services"



export const register = catchAsync(async (req, res, next) => {

    const user = await userService.register(req.body)

    return res.status(200).json({
        status: "success",
        message: "User registered. Please verify your email.",
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone
        }
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

export const logOut = catchAsync(async (req, res, next) => {

    const user = (req as any).user

    const logout = await userService.logOut(user)

    return res.status(200).json({
        status: logout,
        message: "log-out successfuly",
    })

})
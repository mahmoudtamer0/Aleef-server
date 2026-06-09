import catchAsync from "../../utils/catchAsync";
import * as authService from "./services/auth.service"
import * as adminService from "./services/admin.service"
import * as profileService from "./services/profile.service"



export const register = catchAsync(async (req, res, next) => {

    await authService.register(req.body)

    return res.status(200).json({
        status: "success",
        message: "User registered. Please verify your email.",
    })

})

export const verifyEmail = catchAsync(async (req, res, next) => {
    const device = req.headers["user-agent"] || ""
    const verfied = await authService.verifyEmail(req.body, device)

    return res.status(200).json({
        status: "success",
        token: verfied.token,
        user: {
            id: verfied.user.id,
            name: verfied.user.name,
            email: verfied.user.email,
            phone: verfied.user.phone,
            profilePic: verfied.user.profilePic,
        }
    })
})

export const resendOtp = catchAsync(async (req, res, next) => {

    await authService.resendOtp(req.body)

    return res.status(200).json({
        status: "success",
        message: "User registered. Please verify your email.",
    })
})

export const login = catchAsync(async (req, res, next) => {

    const device = req.headers["user-agent"] || ""
    const user = await authService.login(req.body, device)

    return res.status(200).json({
        status: "success",
        message: "User logined. Please verify your email.",
        token: user.token,
        user: {
            id: user.findUser.id,
            name: user.findUser.name,
            email: user.findUser.email,
            phone: user.findUser.phone,
            profilePic: user.findUser.profilePic,
        }
    })

})

export const google = catchAsync(async (req, res, next) => {
    const device = req.headers["user-agent"] || ""
    const user = await authService.google(req.body, device)

    return res.status(200).json({
        status: "success",
        message: "User logined. Please verify your email.",
        token: user.token,
        user: {
            id: user.user.id,
            name: user.user.name,
            email: user.user.email,
            phone: user.user.phone,
            profilePic: user.user.profilePic,
        }
    })
});

export const getME = catchAsync(async (req, res, next) => {
    const user = (req as any).user
    const userProfile = await profileService.getMe(user.id)

    return res.status(200).json({
        status: "success",
        user: userProfile
    })
})

export const getUserToAdmin = catchAsync(async (req, res, next) => {
    const { userId } = (req as any).params
    const userProfile = await profileService.getMe(userId)

    return res.status(200).json({
        status: "success",
        user: userProfile
    })
})

export const editUserProfile = catchAsync(async (req, res, next) => {
    const user = (req as any).user
    const body = (req as any).body
    const file = (req as any).file
    const userProfile = await profileService.editUserProfile(user, body, file)

    return res.status(200).json({
        status: "success",
        user: {
            name: userProfile.name,
            email: userProfile.email,
            phone: userProfile.phone,
            profilePic: userProfile.profilePic,
        }
    })
})

export const getAllUsers = catchAsync(async (req, res, next) => {

    const users = await adminService.getAllUsers(req.query)

    return res.status(200).json({
        status: "success",
        users: users.users,
        totalPages: users.totalPages,
        page: users.page,
        results: users.results,
        totalUsers: users.totalUsers
    })

})

// export const addFcmToken = catchAsync(async (req, res, next) => {

//     const { fcmToken } = req.body;
//     const user = req.user;

//     await userService.addFcmToken(user, fcmToken);

//     return res.status(200).json({
//         status: "success",
//         message: "added successfully"
//     });

// })

// export const forgetPassword = catchAsync(async (req, res, next) => {

//     // const forget = null

//     return res.status(200).json({
//         status: "success",
//         message: "User registered. Please verify your email.",
//     })

// })

export const banUser = catchAsync(async (req, res, next) => {

    const baan = await adminService.banUser(req)

    return res.status(200).json({
        status: baan.status,
        message: baan.message
    })

})

export const logOut = catchAsync(async (req, res, next) => {

    const user = (req as any).user

    const logout = await authService.logOut(user)

    return res.status(200).json({
        status: logout,
        message: "log-out successfuly",
    })

})


import User from "./user.schema"
import bcrypt from "bcrypt";
import ApiError from "../../utils/ApiError";
import { generateOTP } from "../../utils/generatOtp";
import { sendEmail } from "../../utils/sendEmail";
import crypto from "crypto";
import { generateToken } from "../../utils/generateToken";
import Session from "./session.schema";
import deleteProfilPic from "../../utils/deleteProfile";


export const register = async ({ email, name, password, phone }: any) => {

    const { otp, hashedOtp, expires } = generateOTP()
    const findUser = await User.findOne({ email: email })

    if (findUser && findUser.isEmailVerified == true) {
        throw new ApiError(400, "this email already in use");
    }
    let user;
    const hashedPassword = await bcrypt.hash(password, 10)
    if (findUser && findUser.isEmailVerified == false) {
        findUser.name = name
        findUser.phone = phone
        findUser.password = hashedPassword
        findUser.emailVerificationCode = hashedOtp
        findUser.emailVerificationExpires = expires
        user = await findUser.save()
    } else {
        user = await User.create({
            email: email,
            name: name,
            phone: phone,
            password: hashedPassword,
            emailVerificationCode: hashedOtp,
            emailVerificationExpires: expires
        })
    }

    await sendEmail({
        email: email,
        subject: "Verify your email",
        message: `
            <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
                <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">
                    <!-- Header -->
                    <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
                    <h2 style="color: #333;">Email Verification</h2>
                    <p style="color: #555; font-size: 16px;">You're almost ready! Use the code below to verify your email address.</p>

                    <!-- OTP Code -->
                    <div style="margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #267D77; letter-spacing: 8px;">${otp}</span>
                    </div>

                    <p style="color: #777; font-size: 14px;">This verification code will expire in 1 minute.</p>

                    <!-- Footer -->
                    <div style="margin-top: 30px; font-size: 12px; color: #999;">
                        <p>If you did not request this email, please ignore it.</p>
                        <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                    </div>
                </div>
            </div>
`
    });

    return user;
}

export const resendOtp = async ({ email }: any) => {
    const { otp, hashedOtp, expires } = generateOTP()

    const findUser = await User.findOne({ email: email })

    if (!findUser) {
        throw new ApiError(404, "user not found");
    }

    if (findUser && findUser.isEmailVerified == true) {
        throw new ApiError(400, "this email already in use");
    }

    findUser.emailVerificationCode = hashedOtp
    findUser.emailVerificationExpires = expires

    await findUser.save()


    sendEmail({
        email: email,
        subject: "Resend Verification Code",
        message: `
        <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">
                
                <!-- Header -->
                <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
                <h2 style="color: #333;">Verification Code Resent</h2>
                
                <p style="color: #555; font-size: 16px;">
                    We've sent you a new verification code. Please use the code below to verify your email address.
                </p>

                <!-- OTP Code -->
                <div style="margin: 25px 0;">
                    <span style="font-size: 34px; font-weight: bold; color: #267D77; letter-spacing: 8px;">
                        ${otp}
                    </span>
                </div>

                <p style="color: #777; font-size: 14px;">
                    This code will expire in 1 minute. Make sure to use the latest code we sent.
                </p>

                <!-- Extra Note -->
                <p style="color: #999; font-size: 13px;">
                    If you didn't receive the previous code, please check your spam folder or request again.
                </p>

                <!-- Footer -->
                <div style="margin-top: 30px; font-size: 12px; color: #999;">
                    <p>If you did not request this email, please ignore it.</p>
                    <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                </div>

            </div>
        </div>
`
    });

    return findUser;
}

export const verifyEmail = async ({ email, otp }: any, device: string) => {


    const hashedOtp = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    const user = await User.findOne({
        email: email,
        emailVerificationCode: hashedOtp,
        emailVerificationExpires: { $gt: Date.now() }
    })

    if (!user) {
        throw new ApiError(400, "wrong or expired otp");
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;

    await user.save()
    const session = await Session.create({
        userId: user._id,
        device: device
    });
    const token = generateToken(user.name, user._id.toString(), user.role, session._id.toString())

    return { user, token }

}

export const login = async ({ email, password }: any, device: string) => {

    const findUser = await User.findOne({ email: email })

    if (!findUser) {
        throw new ApiError(400, "email or password not correct");
    }

    if (findUser.isEmailVerified == false) {
        throw new ApiError(401, "email not veryfied");
    }

    if (findUser.status == "banned") {
        throw new ApiError(403, "your account is banned");
    }

    const checkPass = await bcrypt.compare(password, findUser.password)

    if (!checkPass) {
        throw new ApiError(400, "password not correct");
    }

    const session = await Session.create({
        userId: findUser._id,
        device: device
    });

    const token = generateToken(findUser.name, findUser._id.toString(), findUser.role, session._id.toString())

    const time = new Date().toLocaleString();

    sendEmail({
        email: email,
        subject: "New Login Detected",
        message: `
        <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">
                
                <!-- Header -->
                <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
                <h2 style="color: #333;">New Login Detected</h2>
                <p style="color: #555; font-size: 16px;">
                    We noticed a new login to your account. Here are the details:
                </p>

                <!-- Login Details -->
                <div style="margin: 25px 0; text-align: left; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
                    <p style="margin: 8px 0;"><strong>Device:</strong> ${device}</p>
                    <p style="margin: 8px 0;"><strong>Time:</strong> ${time}</p>
                    <p style="margin: 8px 0;"><strong>Location:</strong> Egypt,Cairo</p>
                </div>

                <!-- Warning -->
                <p style="color: #d9534f; font-size: 14px; margin-top: 15px;">
                    If this wasn't you, please secure your account immediately.
                </p>

                <!-- Footer -->
                <div style="margin-top: 30px; font-size: 12px; color: #999;">
                    <p>If you recognize this activity, you can safely ignore this email.</p>
                    <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                </div>
            </div>
        </div>
`
    }).catch(err => console.log("email error:", err))

    return { findUser, token };
}

export const getMe = async (user: any) => {

    const userProfile = await User.findOne({ _id: user.id }).select('name email phone profilePic')

    if (!userProfile) throw new ApiError(404, "user not fount");

    return userProfile;
}

export const editUserProfile = async (user: any, reqBody: any, reqFile: any) => {
    const { name, phone, changeProfilePic, deleteProfilePic } = reqBody;
    const userProfile = await User.findOne({ _id: user.id }).select('name email phone profilePic cloudinary_id')

    if (!userProfile) throw new ApiError(404, "user not fount");

    if (name) userProfile.name = name;

    if (phone) userProfile.phone = phone;


    if (deleteProfilePic == true || deleteProfilePic == "true") {

        if (userProfile.cloudinary_id == "default") {
            throw new ApiError(400, "user don't have profile pic");
        }

        void deleteProfilPic(userProfile.cloudinary_id)

        userProfile.profilePic = "https://res.cloudinary.com/ddgniiotg/image/upload/v1773086407/default_eop2qt.jpg";
        userProfile.cloudinary_id = "default";

    }

    if (changeProfilePic == "true" && reqFile) {

        if (userProfile.cloudinary_id != "default") {
            void deleteProfilPic(userProfile.cloudinary_id)
        }

        userProfile.profilePic = reqFile.path;
        userProfile.cloudinary_id = reqFile.filename;

    }

    await userProfile.save()

    return userProfile

}

export const banUser = async (req: any) => {
    const { userId } = req.params;
    const { banAction, banDays } = req.body;

    const user = await User.findOne({ _id: userId });

    if (!user) throw new ApiError(404, "user not fount");

    if (banAction == "ban") {
        const banDate = new Date(Date.now() + Number(banDays) * 24 * 60 * 60 * 1000);

        user.status = "banned";
        user.banExpiresAt = banDate;

        await user.save();

        await Session.deleteMany({ userId: userId });

        sendEmail({
            email: user.email,
            subject: "Account Suspended - Aleef",
            message: `
    <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">
            
            <!-- Header -->
            <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
            <h2 style="color: #d9534f;">Account Suspended</h2>
            <p style="color: #555; font-size: 16px;">
                Your account has been temporarily restricted due to a violation of our policies.
            </p>

            <!-- Ban Details -->
            <div style="margin: 25px 0; text-align: left; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
                <p style="margin: 8px 0;"><strong>Action By:</strong> System Administration</p>
                <p style="margin: 8px 0;"><strong>Administrator:</strong> Mahmoud Tamer</p>
                <p style="margin: 8px 0;"><strong>Ban Start:</strong> ${new Date().toLocaleString()}</p>
                <p style="margin: 8px 0;"><strong>Ban Ends:</strong> ${banDate.toLocaleString()}</p>
            </div>

            <!-- Warning -->
            <p style="color: #d9534f; font-size: 14px; margin-top: 15px;">
                During this period, you will not be able to access your account.
            </p>

            <!-- Help -->
            <p style="color: #555; font-size: 14px;">
                If you believe this action was taken by mistake, please contact our support team.
            </p>

            <!-- Footer -->
            <div style="margin-top: 30px; font-size: 12px; color: #999;">
                <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
            </div>
        </div>
    </div>
`
        }).catch(err => console.log("email error:", err));
        return { status: "success", message: "User banned successfully" }
    }

    if (banAction == "remove") {
        user.status = "active";
        user.banExpiresAt = null;
        await user.save()

        return { status: "success", message: "ban removed successfuly" }
    }

    throw new ApiError(400, "unexpected ban action");
}

export const logOut = async (user: any) => {
    try {
        await Session.deleteOne({ _id: user.sessionId });
        return "success"
    } catch (err) {
        throw new ApiError(500, "error")
    }

}

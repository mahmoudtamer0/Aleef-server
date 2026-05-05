import User from "./user.schema"
import ApiError from "../../utils/ApiError";
import { generateOTP } from "../../utils/generatOtp";
import { sendEmail } from "../../utils/sendEmail";
import crypto from "crypto";
import { generateToken } from "../../utils/generateToken";
import Session from "./session.schema";
import deleteProfilPic from "../../utils/deleteProfile";
import { hashPassword } from "../../utils/hashPassword";
import { checkPassword } from "../../utils/checkPassword";


export const register = async ({ email, name, password, phone }: any) => {

    const { otp, hashedOtp, expires } = generateOTP()
    const findUser = await User.findOne({ email: email })

    if (findUser && findUser.isEmailVerified == true) {
        throw new ApiError(400, "this email already in use");
    }
    let user;
    const hashedPassword = await hashPassword(password);

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

    setImmediate(() => {
        sendEmail({
            email: email,
            subject: "Verify your email",
            text: "",
            message: `
                <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 20px;">

    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 25px;">

        <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
        <h2 style="color: #333;">Email Verification</h2>

        <p style="color: #555; font-size: 16px;">
            Hello ${user.name}, You're almost ready! Use the code below to verify your email address.
        </p>

        <div style="margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; color: #267D77; letter-spacing: 4px; word-break: break-word;">
                ${otp}
            </span>
        </div>

        <p style="color: #777; font-size: 14px;">
            This verification code will expire in 1 minute.
        </p>

        <div style="margin-top: 30px; font-size: 12px; color: #999;">
        <p style="margin-top: 15px;">
            <a href="https://www.linkedin.com/in/mahmoudtamer0/" style="color: #267D77; text-decoration: none;">
                Mahmoud Tamer
            </a>
        </p>
            <p>If you did not request this email, please ignore it.</p>


            <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
        </div>

    </div>

</div>
    `
        }).catch(err => console.log("email error:", err));
    })



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


    await sendEmail({
        email: email,
        subject: "Resend Verification Code",
        text: "",
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
    const token = generateToken(user.name, user._id.toString(), user.role, session._id.toString(), user.email)

    setImmediate(() => {
        sendEmail({
            email: user.email,
            subject: "Account Created 🎉 - Aleef",
            text: "",
            message: `
        <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px;">
                
                <h2 style="color: #4CAF50;">Congratulations 🎉</h2>
                
                <p>Dear ${user.name},</p>
    
                <p>Your account has been <strong>created</strong> successfully.</p>
    
                <p>You can now log in and start using the platform.</p>
    
                <p style="margin-top:30px; font-size:12px; color:#888;">
                    Thank you for being part of Aleef ❤️
                </p>
    
            </div>
        </div>
      `
        }).catch(err => console.log("email error:", err));
    })


    return { user, token }

}

export const login = async ({ email, password }: any, device: string) => {

    const findUser = await User.findOne({ email })
        .select("password name role status isEmailVerified profilePic phone email banExpiresAt")
        .lean();

    if (!findUser) {
        throw new ApiError(400, "email or password not correct");
    }

    const checkedPass = await checkPassword(password, findUser.password)

    if (!checkedPass) {
        throw new ApiError(400, "email or password not correct");
    }

    if (findUser.isEmailVerified == false) {
        throw new ApiError(401, "email not veryfied");
    }

    if (findUser.status == "banned" && findUser.banExpiresAt) {
        if (findUser.banExpiresAt > new Date()) {
            throw new ApiError(403, "your account is banned");
        }
        await User.findByIdAndUpdate({ _id: findUser._id }, {
            status: "active",
            banExpiresAt: null
        })
    }


    const session = await Session.create({
        userId: findUser._id,
        device: device
    });

    const token = generateToken(findUser.name, findUser._id.toString(), findUser.role, session._id.toString(), findUser.email)

    const time = new Date().toLocaleString();

    setImmediate(() => {
        sendEmail({
            email: email,
            subject: "New Login Detected",
            text: "",
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
                    <p style="margin-top: 15px;">
                        Made with <span style="color: #267D77;">❤️</span> by 
                        <a href="https://www.linkedin.com/in/mahmoudtamer0/" style="color: #267D77; text-decoration: none;">
                            Mahmoud Tamer
                        </a>
                    </p>
                    <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                </div>
            </div>
        </div>
`
        }).catch(err => console.log("email error:", err))
    })


    return { findUser, token };
}

export const addFcmToken = async (user: any, fcmToken: any) => {

    const session = await Session.findByIdAndUpdate(user.sessionId, { fcmToken: fcmToken });

    return session;
}


export const getMe = async (userId: any) => {

    const userProfile = await User.findById(userId).lean().select('name email phone profilePic status createdAt')

    if (!userProfile) throw new ApiError(404, "user not fount");

    return userProfile;
}

export const editUserProfile = async (user: any, reqBody: any, reqFile: any) => {
    const { name, phone, changeProfilePic, deleteProfilePic } = reqBody;

    const userProfile = await User.findOne({ _id: user.id }).select('name email phone profilePic cloudinary_id')

    if (!userProfile) throw new ApiError(404, "user not fount");

    if (name) userProfile.name = name;

    if (phone) userProfile.phone = phone;

    let oldImageId: string | null = null;

    if (deleteProfilePic == true || deleteProfilePic == "true") {

        if (userProfile.cloudinary_id == "default") {
            throw new ApiError(400, "user don't have profile pic");
        }

        oldImageId = userProfile.cloudinary_id;

        userProfile.profilePic = "https://res.cloudinary.com/ddgniiotg/image/upload/v1773086407/default_eop2qt.jpg";
        userProfile.cloudinary_id = "default";

    }



    if (changeProfilePic === true || changeProfilePic === "true") {

        if (!reqFile) {
            console.error("❌ No file uploaded from frontend");
            throw new ApiError(400, "No file uploaded");
        }


        if (userProfile.cloudinary_id != "default") {
            oldImageId = userProfile.cloudinary_id;
        }

        userProfile.profilePic = reqFile.path;
        userProfile.cloudinary_id = reqFile.filename;
    }

    await userProfile.save()

    if (oldImageId) {
        setImmediate(async () => {
            try {
                await deleteProfilPic(oldImageId!);
            } catch (err) {
                console.error("❌ Failed to delete image:", err);
            }
        });
    }

    return userProfile

}

export const getAllUsers = async (reqQuery: any) => {
    interface FilterType {
        name?: {
            $regex: string;
            $options: string;
        };
        isEmailVerified?: boolean;
    }

    const { search } = reqQuery;

    let filter: FilterType = {};

    // search
    if (search) {
        filter.name = { $regex: search, $options: "i" };
    }


    filter.isEmailVerified = true;


    const page = reqQuery.page * 1 || 1;
    const limit = reqQuery.limit * 1 || 10;
    const skip = (page - 1) * limit;

    const users = await User.find(filter)
        .skip(skip)
        .limit(limit)
        .lean()
        .select("name email createdAt phone status")
        .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments(filter)
    const totalPages = Math.ceil(totalUsers / limit)
    const results = users.length

    return { users, totalUsers, totalPages, page, results };

}

export const banUser = async (req: any) => {
    const { userId } = req.params;
    const { banAction, banDays } = req.body;

    const user = await User.findOne({ _id: userId });

    if (!user) throw new ApiError(404, "user not fount");

    if (banAction == "ban") {
        const days = banDays ? Number(banDays) : 5;

        const banDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        user.status = "banned";
        user.banExpiresAt = banDate;

        await user.save();

        await Session.deleteMany({ userId: userId });

        await sendEmail({
            email: user.email,
            subject: "Important update about your Aleef account",

            text: `
Hello ${user.name},

We want to inform you that your account access has been temporarily restricted.

Ban start: ${new Date().toLocaleString()}
Ban ends: ${banDate.toLocaleString()}

If you believe this was a mistake, please contact our support team.

- Aleef Team
`,

            message: `
        <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
    
                <h1 style="color: #267D77;">Aleef</h1>
                <h2 style="color: #333;">Account Access Update</h2>

                <p style="color: #555; font-size: 16px;">
                    Hello <strong>${user.name}</strong>,
                </p>

                <p style="color: #555; font-size: 15px;">
                    Your account access has been temporarily restricted due to a policy review.
                </p>

                <div style="margin: 25px 0; text-align: left; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
                    <p><strong>Action By:</strong> System</p>
                    <p><strong>Start:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>End:</strong> ${banDate.toLocaleString()}</p>
                </div>

                <p style="color: #555;">
                    If you think this is a mistake, you can contact our support team.
                </p>

                <a href="https://yourdomain.com/support"
                    style="display: inline-block; margin-top: 15px; padding: 12px 20px; background-color: #267D77; color: white; text-decoration: none; border-radius: 6px;">
                    Contact Support
                </a>

                <div style="margin-top: 30px; font-size: 12px; color: #999;">
                    <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                    <p>If you didn’t expect this email, you can ignore it.</p>
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

        await sendEmail({
            email: user.email,
            subject: "Your Aleef account is now accessible",

            text: `
Hello ${user.name},

Good news! Your account access has been restored and you can now use Aleef normally.

If you experience any issues, feel free to contact our support team.

- Aleef Team
`,

            message: `
<div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
  <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
    
    <h1 style="color: #267D77;">Aleef</h1>
    <h2 style="color: #28a745;">Account Access Restored</h2>

    <p style="color: #555; font-size: 16px;">
      Hello <strong>${user.name}</strong>,
    </p>

    <p style="color: #555; font-size: 15px;">
      We're happy to inform you that your account is now fully accessible again.
    </p>

    <div style="margin: 25px 0; text-align: left; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
      <p><strong>Status:</strong> Active</p>
      <p><strong>Restored At:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <p style="color: #555;">
      You can now continue using Aleef without any restrictions.
    </p>

    <a href="https://yourdomain.com/login"
       style="display: inline-block; margin-top: 15px; padding: 12px 20px; background-color: #267D77; color: white; text-decoration: none; border-radius: 6px;">
       Go to your account
    </a>

    <p style="color: #777; font-size: 13px; margin-top: 20px;">
      If you have any questions, our support team is here to help.
    </p>

    <div style="margin-top: 30px; font-size: 12px; color: #999;">
      <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
      <p>If you didn’t expect this email, you can safely ignore it.</p>
    </div>
  </div>
</div>
`
        }).catch(err => console.log("email error:", err));

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

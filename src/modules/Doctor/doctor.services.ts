import Doctor from "./doctor.schema"
import bcrypt from "bcrypt";
import ApiError from "../../utils/ApiError";
import { generateOTP } from "../../utils/generatOtp";
import { sendEmail } from "../../utils/sendEmail";
import crypto from "crypto";
import { generateToken } from "../../utils/generateToken";
import Session from "../User/session.schema";
import deleteProfilPic from "../../utils/deleteProfile";



export const doctorRegister = async ({ email, name, password, phone, license_number, city, address }: any, reqFile: any) => {

    const { otp, hashedOtp, expires } = generateOTP()
    const findDoctor = await Doctor.findOne({ $or: [{ email: email }, { license_number: license_number }] })

    if (findDoctor && findDoctor.isEmailVerified == true) {
        throw new ApiError(400, "this email already in use");
    }
    let doctor;
    const hashedPassword = await bcrypt.hash(password, 10)
    if (findDoctor && findDoctor.isEmailVerified == false) {

        if (!reqFile) { throw new ApiError(400, "profile picture is required") }

        findDoctor.name = name
        findDoctor.phone = phone
        findDoctor.password = hashedPassword
        findDoctor.license_number = license_number
        findDoctor.city = city
        findDoctor.address = address
        findDoctor.profilePic = reqFile.path
        findDoctor.cloudinary_id = reqFile.filename
        findDoctor.emailVerificationCode = hashedOtp
        findDoctor.emailVerificationExpires = expires
        doctor = await findDoctor.save()
    } else {
        if (!reqFile) { throw new ApiError(400, "profile picture is required") }
        doctor = await Doctor.create({
            email: email,
            name: name,
            phone: phone,
            password: hashedPassword,
            license_number: license_number,
            city: city,
            address: address,
            profilePic: reqFile.path,
            cloudinary_id: reqFile.filename,
            emailVerificationCode: hashedOtp,
            emailVerificationExpires: expires
        })
    }

    void sendEmail({
        email: email,
        subject: "Verify your email",
        text: "",
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

    return doctor;
}


export const resendOtp = async ({ email }: any) => {
    const { otp, hashedOtp, expires } = generateOTP()

    const findUser = await Doctor.findOne({ email: email })

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

    const doctor = await Doctor.findOne({
        email: email,
        emailVerificationCode: hashedOtp,
        emailVerificationExpires: { $gt: Date.now() }
    })

    if (!doctor) {
        throw new ApiError(400, "wrong or expired otp");
    }

    doctor.isEmailVerified = true;
    doctor.emailVerificationCode = null;
    doctor.emailVerificationExpires = null;

    await doctor.save()

    void sendEmail({
        email: email,
        subject: "Your Account is Under Review - Aleef",
        text: "",
        message: `
        <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">
                
                <!-- Header -->
                <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
                <h2 style="color: #333;">Account Under Review</h2>

                <!-- Message -->
                <p style="color: #555; font-size: 16px;">
                    Thank you for registering as a doctor on Aleef 🐾
                </p>

                <p style="color: #555; font-size: 15px;">
                    Your account has been successfully created and is currently 
                    <strong style="color: #F59E0B;">under review</strong> by our administration team.
                </p>

                <p style="color: #555; font-size: 15px;">
                    We are verifying your information to ensure the best experience for our users.
                    This process usually takes a short time.
                </p>

                <!-- Status Box -->
                <div style="margin: 25px 0; padding: 15px; background-color: #FFF7ED; border-radius: 8px;">
                    <p style="margin: 0; color: #B45309; font-weight: bold;">
                        Status: Pending Approval
                    </p>
                </div>

                <!-- Info -->
                <p style="color: #777; font-size: 14px;">
                    You will receive another email once your account is approved.
                </p>

                <!-- Footer -->
                <div style="margin-top: 30px; font-size: 12px; color: #999;">
                    <p>If you did not request this account, please ignore this email.</p>
                    <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                </div>

            </div>
        </div>
    `
    });


    return { doctor }

}


export const getAllDoctorsRequests = async () => {

    const docotrs = await Doctor.find({ isEmailVerified: true, status: "pending" }).lean().select("name phone city specialization status").sort({ createdAt: 1 })

    return docotrs

}


export const getAllDoctors = async () => {

    const docotrs = await Doctor.find({ isEmailVerified: true, status: { $ne: "pending" } }).lean().select("name phone city specialization status").sort({ createdAt: -1 })

    return docotrs

}
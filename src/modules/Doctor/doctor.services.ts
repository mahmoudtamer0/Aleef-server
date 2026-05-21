import Doctor from "./doctor.schema"
import CreditAccount from "./crediteAccount"
import Appointment from "../Appointments/appointments.schema"
import bcrypt from "bcrypt";
import ApiError from "../../utils/ApiError";
import { generateOTP } from "../../utils/generatOtp";
import { sendEmail } from "../../utils/sendEmail";
import crypto from "crypto";
import { generateToken } from "../../utils/generateToken";
import Session from "../User/session.schema";
import { getNextDays } from "../../utils/getDoctorAvailableDays";
import { getAvailableSlots } from "../../utils/getDoctorAvailableSlots";
import DoctorReview from "./doctorReview.schema";
import { checkPassword } from "../../utils/checkPassword";



export const doctorRegister = async ({ email, name, password, phone, specialization, license_number, city, address, appointmentFee }: any, reqFiles: any) => {

    //const { otp, hashedOtp, expires } = generateOTP()
    const findDoctor = await Doctor.findOne({ $or: [{ email: email }, { license_number: license_number }] })

    if (findDoctor && findDoctor.isEmailVerified == true) {
        throw new ApiError(400, "this email already in use");
    }
    let doctor;

    const hashedPassword = await bcrypt.hash(password, 10)
    if (!reqFiles.profilePic || !reqFiles.IdentityVerificationImage || !reqFiles.NationalIdFront || !reqFiles.NationalIdBack) {
        throw new ApiError(400, "profile picture is required")
    }
    if (findDoctor && findDoctor.isEmailVerified == false) {
        findDoctor.name = name
        findDoctor.phone = phone
        findDoctor.password = hashedPassword
        findDoctor.license_number = license_number
        findDoctor.city = city
        findDoctor.address = address
        findDoctor.specialization = specialization
        findDoctor.profilePic = reqFiles.profilePic[0].path
        findDoctor.cloudinary_id = reqFiles.profilePic[0].filename
        findDoctor.IdentityVerificationImage = reqFiles.IdentityVerificationImage[0].path;
        findDoctor.NationalIdFront = reqFiles.NationalIdFront[0].path;
        findDoctor.NationalIdBack = reqFiles.NationalIdBack[0].path;
        doctor = await findDoctor.save()
    } else {
        doctor = await Doctor.create({
            email: email,
            name: name,
            phone: phone,
            password: hashedPassword,
            license_number: license_number,
            city: city,
            address: address,
            specialization: specialization,
            profilePic: reqFiles.profilePic[0].path,
            cloudinary_id: reqFiles.profilePic[0].filename,
            IdentityVerificationImage: reqFiles.IdentityVerificationImage[0].path,
            NationalIdFront: reqFiles.NationalIdFront[0].path,
            NationalIdBack: reqFiles.NationalIdBack[0].path,
            appointmentFee: Number(appointmentFee),
            isEmailVerified: true
        });

        await CreditAccount.create({ doctor: doctor._id });
    }

    // // void sendEmail({
    // //     email: email,
    // //     subject: "Verify your email",
    // //     text: "",
    // //     message: `
    // //             <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
    // //                 <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">
    // //                     <!-- Header -->
    // //                     <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
    // //                     <h2 style="color: #333;">Email Verification</h2>
    // //                     <p style="color: #555; font-size: 16px;">You're almost ready! Use the code below to verify your email address.</p>

    // //                     <!-- OTP Code -->
    // //                     <div style="margin: 20px 0;">
    // //                         <span style="font-size: 32px; font-weight: bold; color: #267D77; letter-spacing: 8px;">${otp}</span>
    // //                     </div>

    // //                     <p style="color: #777; font-size: 14px;">This verification code will expire in 1 minute.</p>

    // //                     <!-- Footer -->
    // //                     <div style="margin-top: 30px; font-size: 12px; color: #999;">
    //                         <p style="margin-top: 15px;" >
    //                             Made with <span style= "color: #267D77;" >❤️</span> by
    //                             <a href = "https://www.linkedin.com/in/mahmoudtamer0/" style = "color: #267D77; text-decoration: none;">
    //                             Mahmoud Tamer
    //                             </a>
    //                         </p>
    // //                         <p>If you did not request this email, please ignore it.</p>
    // //                         <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
    // //                     </div>
    // //                 </div>
    // //             </div>
    // // `
    // // });

    return;
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

    setImmediate(() => {
        sendEmail({
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
                    <p style="margin-top: 15px;">
                        Made with <span style="color: #267D77;">❤️</span> by
                        <a href="https://www.linkedin.com/in/mahmoudtamer0/" style="color: #267D77; text-decoration: none;">
                        Mahmoud Tamer
                        </a>
                    </p>
                    <p>If you did not request this account, please ignore this email.</p>
                    <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
                </div>

            </div>
        </div>
    `
        }).catch(err => {
            console.error("Email failed:", err);
        });
    });



    return { doctor }

}


export const login = async ({ email, password }: any, device: string) => {

    const findUser = await Doctor.findOne({ email })
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
        await Doctor.findByIdAndUpdate({ _id: findUser._id }, {
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

export const approveDoctorRequest = async (doctorId: any) => {
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
        throw new ApiError(404, "Doctor not found");
    }

    if (doctor.status !== "pending") {
        throw new ApiError(400, "Doctor is already processed");
    }

    doctor.status = "active";
    await doctor.save();

    setImmediate(() => {
        sendEmail({
            email: doctor.email,
            subject: "Account Approved 🎉 - Aleef",
            text: "",
            message: `
    <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px;">
            
            <h2 style="color: #4CAF50;">Congratulations 🎉</h2>
            
            <p>Dear Dr. ${doctor.name},</p>

            <p>Your account has been <strong>approved</strong> successfully.</p>

            <p>You can now log in and start using the platform.</p>

            <p style="margin-top:30px; font-size:12px; color:#888;">
                Thank you for being part of Aleef ❤️
            </p>
            <p style="margin-top: 15px;">
                Made with <span style="color: #267D77;">❤️</span> by 
                <a href="https://www.linkedin.com/in/mahmoudtamer0/" style="color: #267D77; text-decoration: none;">
                Mahmoud Tamer
                </a>
            </p>
        </div>
    </div>
  `
        }).catch(err => {
            console.error("Email failed:", err);
        });

    });


    return "request approved"

}



export const getAllDoctorsRequests = async () => {

    const docotrs = await Doctor.find({ isEmailVerified: true, status: "pending" }).lean().select("name phone city specialization status appointmentFee").sort({ createdAt: 1 })

    return docotrs

}

export const getAllDoctors = async (reqQuery: any) => {

    const {
        search,
        status,
        sort
    } = reqQuery;

    const page = Number(reqQuery.page) || 1;
    const limit = Number(reqQuery.limit) || 10;

    const skip = (page - 1) * limit;

    const matchFilter: any = {
        isEmailVerified: true,
        status: { $ne: "pending" }
    };

    // search
    if (search) {

        matchFilter.$or = [
            {
                name: {
                    $regex: search,
                    $options: "i"
                }
            },
            {
                email: {
                    $regex: search,
                    $options: "i"
                }
            },
            {
                phone: {
                    $regex: search,
                    $options: "i"
                }
            },
            {
                city: {
                    $regex: search,
                    $options: "i"
                }
            },
            {
                specialization: {
                    $regex: search,
                    $options: "i"
                }
            }
        ];
    }

    // status filter
    if (status && status !== "all") {
        matchFilter.status = status;
    }

    let sortStage: any = {
        createdAt: -1
    };

    if (sort === "appointments") {
        sortStage = {
            totalAppointments: -1
        };
    }

    if (sort === "completed") {
        sortStage = {
            completedAppointments: -1
        };
    }

    if (sort === "cancelled") {
        sortStage = {
            cancelledAppointments: -1
        };
    }

    if (sort === "rejected") {
        sortStage = {
            rejectedAppointments: -1
        };
    }

    if (sort === "rating") {
        sortStage = {
            rating: -1
        };
    }

    const doctors = await Doctor.aggregate([

        {
            $match: matchFilter
        },

        {
            $lookup: {
                from: "appointments",
                localField: "_id",
                foreignField: "doctor",
                as: "appointments"
            }
        },

        {
            $addFields: {

                totalAppointments: {
                    $size: "$appointments"
                },

                completedAppointments: {
                    $size: {
                        $filter: {
                            input: "$appointments",
                            as: "appointment",
                            cond: {
                                $eq: [
                                    "$$appointment.status",
                                    "completed"
                                ]
                            }
                        }
                    }
                },

                cancelledAppointments: {
                    $size: {
                        $filter: {
                            input: "$appointments",
                            as: "appointment",
                            cond: {
                                $eq: [
                                    "$$appointment.status",
                                    "cancelled"
                                ]
                            }
                        }
                    }
                },

                rejectedAppointments: {
                    $size: {
                        $filter: {
                            input: "$appointments",
                            as: "appointment",
                            cond: {
                                $eq: [
                                    "$$appointment.status",
                                    "rejected"
                                ]
                            }
                        }
                    }
                }
            }
        },

        {
            $sort: sortStage
        },

        {
            $skip: skip
        },

        {
            $limit: limit
        },

        {
            $project: {
                name: 1,
                email: 1,
                phone: 1,
                city: 1,
                specialization: 1,
                status: 1,
                profilePic: 1,
                address: 1,
                rating: 1,
                ratingsCount: 1,
                appointmentFee: 1,

                totalAppointments: 1,
                completedAppointments: 1,
                cancelledAppointments: 1,
                rejectedAppointments: 1,

                createdAt: 1
            }
        }

    ]);

    const totalDoctors = await Doctor.countDocuments(matchFilter);

    return {
        doctors,
        totalDoctors,
        page: page,
        totalPages: Math.ceil(totalDoctors / limit),
        results: doctors.length
    };
};

export const getDoctor = async (doctorId: any) => {

    const doctor = await Doctor.findById(doctorId).lean().select("name email about phone city specialization status profilePic rating ratingsCount address appointmentFee");

    console.log(doctor)
    const reviews = await DoctorReview.find({ doctor: doctorId })
        .populate({
            path: "user",
            select: "name profilePic"
        });
    return { doctor, reviews }
}



export const getAvailableDoctors = async () => {

    const docotrs = await Doctor.find({ isEmailVerified: true, status: { $ne: "pending" } }).lean().select("name email phone city specialization status profilePic rating ratingQuantity appointmentFee").sort({ createdAt: -1 })

    return docotrs

}

export const getDoctorSchedual = async (doctorId: any) => {
    const doctor = await Doctor.findById(doctorId)
        .lean()
        .select("-password -about -createdAt -updatedAt -role -slotDuration -emailVerificationCode -emailVerificationExpires -cloudinary_id -IdentityVerificationImage -NationalIdFront -NationalIdBack -__v");

    if (!doctor) {
        throw new ApiError(404, "Doctor not found");
    }

    const doctorDays = getNextDays(doctor);

    let firstDaySlots: string[] = [];

    if (doctorDays.length > 0) {
        firstDaySlots = await getAvailableSlots(
            doctor,
            doctorId,
            doctorDays[0].date
        );
    }

    return {
        doctor: {
            name: doctor.name,
            specialization: doctor.specialization,
            city: doctor.city,
            address: doctor.address,
            profilePic: doctor.profilePic,
            rating: doctor.rating,
            ratingsCount: doctor.ratingsCount,
            appointmentFee: doctor.appointmentFee,
        },
        doctorDays,
        firstDaySlots,
    };
};


export const getDoctorSlots = async (doctorId: any, date: any) => {

    const doctor = await Doctor.findById(doctorId).lean();

    if (!doctor) {
        throw new ApiError(404, "Doctor not found");
    }

    const slots = await getAvailableSlots(
        doctor,
        doctorId,
        date as string
    );

    return {
        date,
        slots,
    };
};

export const addReviewToDoctor = async (user: any, doctorId: any, { comment, rate }: any) => {

    const doctor = await Doctor.findById(doctorId).select("ratingsCount");

    if (!doctor) {
        throw new ApiError(404, "Doctor not found");
    }

    const checkAppointment = await Appointment.findOne({
        doctor: doctorId,
        owner: user.id,
        status: "completed"
    })

    if (!checkAppointment) {
        throw new ApiError(404, "no appointment found");
    }

    const review = await DoctorReview.create({
        doctor: doctorId,
        user: user.id,
        comment,
        rate
    })

    doctor.ratingsCount += 1;
    await doctor.save()
    return review;
};
import ApiError from "../../utils/ApiError";
import { generateOTP } from "../../utils/generatOtp";
import { sendEmail } from "../../utils/sendEmail";
import crypto from "crypto";
import { generateToken } from "../../utils/generateToken";
import deleteProfilPic from "../../utils/deleteProfile";
import { checkPassword } from "../../utils/checkPassword";
import pool from "../../db";
import { hashPassword } from "../../utils/hashPassword";
import { clearCache } from "../../cache";


//mongo Version
// export const register = async ({ email, name, password, phone }: any) => {
//     const { otp, hashedOtp, expires } = generateOTP()

//     const findUser = await User.findOne({ email: email })

//     if (findUser && findUser.isEmailVerified == true) {
//         throw new ApiError(400, "this email already in use");
//     }
//     let user;
//     const hashedPassword = await hashPassword(password);

//     if (findUser && findUser.isEmailVerified == false) {
//         findUser.name = name.toLowerCase()
//         findUser.phone = phone
//         findUser.password = hashedPassword
//         findUser.emailVerificationCode = hashedOtp
//         findUser.emailVerificationExpires = expires
//         user = await findUser.save()
//     } else {
//         user = await User.create({
//             email: email,
//             name: name.toLowerCase(),
//             phone: phone,
//             password: hashedPassword,
//             emailVerificationCode: hashedOtp,
//             emailVerificationExpires: expires
//         })
//     }

//     setImmediate(() => {
//         sendEmail({
//             email: email,
//             subject: "Verify your email",
//             text: "",
//             message: `
//                     <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 20px;">

//         <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 25px;">

//             <h1 style="color: #267D77; margin-bottom: 10px;">Aleef</h1>
//             <h2 style="color: #333;">Email Verification</h2>

//             <p style="color: #555; font-size: 16px;">
//                 Hello ${user.name}, You're almost ready! Use the code below to verify your email address.
//             </p>

//             <div style="margin: 20px 0;">
//                 <span style="font-size: 28px; font-weight: bold; color: #267D77; letter-spacing: 4px; word-break: break-word;">
//                     ${otp}
//                 </span>
//             </div>

//             <p style="color: #777; font-size: 14px;">
//                 This verification code will expire in 1 minute.
//             </p>

//             <div style="margin-top: 30px; font-size: 12px; color: #999;">
//             <p style="margin-top: 15px;">
//                 <a href="https://www.linkedin.com/in/mahmoudtamer0/" style="color: #267D77; text-decoration: none;">
//                     Mahmoud Tamer
//                 </a>
//             </p>
//                 <p>If you did not request this email, please ignore it.</p>


//                 <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
//             </div>

//         </div>

//     </div>
//         `
//         }).catch(err => console.log("email error:", err));
//     })

//     return;
// }

export const register = async ({ email, name, password, phone }: any) => {

    const { otp, hashedOtp, expires } = generateOTP()

    const findUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])


    if (findUser.rows.length > 0 && findUser.rows[0].isEmailVerified == true) {
        throw new ApiError(400, "this email already in use");
    }

    const hashedPassword = await hashPassword(password);

    if (findUser.rows.length > 0 && findUser.rows[0].isEmailVerified == false) {
        await pool.query("UPDATE users SET name = $1, phone = $2, password = $3, \"emailVerificationCode\" = $4, \"emailVerificationExpires\" = $5 WHERE email = $6", [name.toLowerCase(), phone, hashedPassword, hashedOtp, expires, email])
    } else {
        await pool.query("INSERT INTO users (email, name, phone, password, \"emailVerificationCode\", \"emailVerificationExpires\") VALUES ($1, $2, $3, $4, $5, $6)", [email, name.toLowerCase(), phone, hashedPassword, hashedOtp, expires])
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
                Hello ${name}, You're almost ready! Use the code below to verify your email address.
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



    return;
}

export const resendOtp = async ({ email }: any) => {
    const { otp, hashedOtp, expires } = generateOTP()

    const findUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])

    if (findUser.rows.length === 0) {
        throw new ApiError(404, "user not found");
    }

    if (findUser.rows[0].isEmailVerified === true) {
        throw new ApiError(400, "this email already in use");
    }

    await pool.query("UPDATE users SET \"emailVerificationCode\" = $1, \"emailVerificationExpires\" = $2 WHERE email = $3", [hashedOtp, expires, email])


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

    return;
}

export const verifyEmail = async ({ email, otp }: any, device: string) => {


    const hashedOtp = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    const findUser = await pool.query(`UPDATE users SET "isEmailVerified" = $1, "emailVerificationCode" = $2,
            "emailVerificationExpires" = $3 WHERE email = $4 AND "isEmailVerified" = $5 And "emailVerificationExpires" >= $6 AND "emailVerificationCode" = $7 RETURNING id,name,email`,
        [true, null, null, email, false, new Date(), hashedOtp])

    if (findUser.rowCount == 0) throw new ApiError(400, "Invalid or expired verification code");

    const session = await pool.query(
        `INSERT INTO sessions (user_id, device, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '7 days') RETURNING id`,
        [findUser.rows[0].id, device]
    );

    const token = generateToken(findUser.rows[0].name, findUser.rows[0].id.toString(), findUser.rows[0].role, session.rows[0].id.toString(), findUser.rows[0].email)

    setImmediate(() => {
        sendEmail({
            email: findUser.rows[0].email,
            subject: "Account Created 🎉 - Aleef",
            text: "",
            message: `
        <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px;">

                <h2 style="color: #4CAF50;">Congratulations 🎉</h2>

                <p>Dear ${findUser.rows[0].name},</p>

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


    return { user: findUser.rows[0], token }

}

export const login = async ({ email, password }: any, device: string) => {

    const findUser = await pool.query(`SELECT email, id, name, role, password, "profilePic", "isEmailVerified", status, "banExpiresAt" FROM users WHERE email = $1`, [email])

    if (findUser.rows.length === 0) {
        throw new ApiError(400, "email or password not correct");
    }

    const checkedPass = await checkPassword(password, findUser.rows[0].password)

    if (!checkedPass) {
        throw new ApiError(400, "email or password not correct");
    }

    if (findUser.rows[0].isEmailVerified == false) {
        throw new ApiError(401, "email not veryfied");
    }

    if (findUser.rows[0].status == "banned" && findUser.rows[0].banExpiresAt) {
        if (findUser.rows[0].banExpiresAt > new Date()) {
            throw new ApiError(403, "your account is banned");
        }
        await pool.query("UPDATE users SET status = $1, \"banExpiresAt\" = $2 WHERE email = $3", ["active", null, email])
    }

    const session = await pool.query(
        `INSERT INTO sessions (user_id, device, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '7 days') RETURNING id`,
        [findUser.rows[0].id, device]
    );

    const token = generateToken(findUser.rows[0].name, findUser.rows[0].id.toString(), findUser.rows[0].role, session.rows[0].id.toString(), findUser.rows[0].email)

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


    return { findUser: findUser.rows[0], token };
}

// export const addFcmToken = async (user: any, fcmToken: any) => {

//     const session = await Session.findByIdAndUpdate(user.sessionId, { fcmToken: fcmToken });

//     return session;
// }


export const getMe = async (userId: any): Promise<any> => {

    const userProfile = await pool.query("SELECT name, email, phone, \"profilePic\" FROM users WHERE id = $1", [userId])

    if (userProfile.rows.length == 0) throw new ApiError(404, "user not fount");

    return userProfile.rows[0];
}

export const editUserProfile = async (user: any, reqBody: any, reqFile: any): Promise<any> => {
    const { name, phone, changeProfilePic, deleteProfilePic } = reqBody;

    const fields = [];
    const values = [];
    let index = 1;



    if (name) {
        fields.push(`name = $${index}`)
        values.push(name);
        index++;
    };

    if (phone) {
        fields.push(`phone = $${index}`)
        values.push(phone);
        index++;
    }

    let oldImageId: string | null = null;

    let userProfile;

    if (deleteProfilePic == true || deleteProfilePic == "true" || changeProfilePic === true || changeProfilePic === "true") {
        userProfile = await pool.query(`SELECT cloudinary_id FROM users WHERE id = $1`, [user.id]);
    }


    if (deleteProfilePic == true || deleteProfilePic == "true") {

        if (userProfile?.rows[0].cloudinary_id == "default") {
            throw new ApiError(400, "user don't have profile pic");
        }


        oldImageId = userProfile?.rows[0].cloudinary_id;


        fields.push(`"profilePic" = $${index}`)
        values.push("https://res.cloudinary.com/ddgniiotg/image/upload/v1773086407/default_eop2qt.jpg")
        index++

        fields.push(`cloudinary_id = $${index}`)
        values.push("default")
        index++
    }



    if (changeProfilePic === true || changeProfilePic === "true") {

        if (!reqFile) {
            console.error("❌ No file uploaded from frontend");
            throw new ApiError(400, "No file uploaded");
        }


        if (userProfile?.rows[0].cloudinary_id != "default") {
            oldImageId = userProfile?.rows[0].cloudinary_id;
        }

        fields.push(`"profilePic" = $${index}`)
        values.push(reqFile.path)
        index++


        fields.push(`cloudinary_id = $${index}`)
        values.push(reqFile.filename)
        index++
    }


    let updatedUser;

    if (fields.length === 0) {
        throw new ApiError(400, "No data provided to update");
    }

    if (fields.length > 0) {
        values.push(user.id)
        updatedUser = await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = $${index} RETURNING id,name,email,phone`, values)
    }

    if (oldImageId) {
        setImmediate(async () => {
            try {
                await deleteProfilPic(oldImageId!);
            } catch (err) {
                console.error("❌ Failed to delete image:", err);
            }
        });
    }

    return updatedUser?.rows[0]

}

export const getAllUsers = async (reqQuery: any) => {
    const { search, status } = reqQuery;


    const filters: string[] = []
    const values: any[] = []
    let index = 1


    const page = reqQuery.page * 1 || 1;
    const limit = reqQuery.limit < 8 ? reqQuery.limit * 1 || 8 : 8;
    const offset = (page - 1) * limit


    if (search) {
        filters.push(`(name ILIKE $${index} OR email ILIKE $${index})`)
        values.push(`%${search}%`)
        index++
    }

    if (status) {
        filters.push(`status = $${index}`)
        values.push(status)
        index++
    }


    // filters.push(`LIMIT $${index} $`)
    // values.push(limit)
    // index++

    // filters.push(`OFFSET $${index}`)
    // values.push(offset)
    // index++

    let query = `SELECT users.id, name, email, "createdAt", phone, status FROM users`

    if (filters.length > 0) {
        query += ` WHERE ${filters.join(" AND ")}`
    }


    const filterValues = [...values];


    const limitIndex = index;
    values.push(limit);

    const offsetIndex = index + 1;
    values.push(offset);


    query += ` ORDER BY users."createdAt" DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`
    let countQuery = `SELECT COUNT(*) AS total FROM users`

    if (filters.length > 0) {
        countQuery += ` WHERE ${filters.join(" AND ")}`
    }

    const [users, totalCount] = await Promise.all([
        pool.query(query, values),
        pool.query(countQuery, filterValues)
    ])


    return {
        users: users.rows,
        results: users.rowCount,
        totalUsers: totalCount.rows[0].total,
        totalPages: Math.ceil(totalCount.rows[0].total / limit),
        page
    };
}

export const banUser = async (req: any) => {
    const { userId } = req.params;
    const { banAction, banDays } = req.body;

    const client = await pool.connect();
    try {

        await client.query("BEGIN");

        if (banAction == "ban") {

            const days = banDays ? Number(banDays) : 5;

            const banDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

            const user = await client.query("UPDATE users SET status = $1, \"banExpiresAt\" = $2 WHERE id = $3", ["banned", banDate, userId])

            if (user.rows.length == 0) throw new ApiError(404, "user not fount");

            await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);

            setImmediate(async () => {
                await sendEmail({
                    email: user.rows[0].email,
                    subject: "Important update about your Aleef account",

                    text: `
                Hello ${user.rows[0].name},
    
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
                                    Hello <strong>${user.rows[0].name}</strong>,
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

            })

            return { status: "success", message: "User banned successfully" }
        } else if (banAction == "remove") {
            const user = await client.query("UPDATE users SET status = $1, \"banExpiresAt\" = $2 WHERE id = $3 RETURNING id,name,email", ["active", null, userId])
            if (user.rowCount == 0) throw new ApiError(404, "user not fount");

            setImmediate(() => {
                sendEmail({
                    email: user.rows[0].email,
                    subject: "Your Aleef account is now accessible",

                    text: `
        Hello ${user.rows[0].name},
        
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
              Hello <strong>${user.rows[0].name}</strong>,
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
            })

            return { status: "success", message: "ban removed successfuly" }
        }

        await client.query("COMMIT");
        throw new ApiError(400, "unexpected ban action");
    } catch (err) {
        await client.query("ROLLBACK");
        return new ApiError(500, "error")
    } finally {
        client.release();
    }

}

export const logOut = async (user: any) => {
    try {
        await pool.query("DELETE FROM sessions WHERE id = $1", [user.sessionId]);
        clearCache(`session:${user.sessionId}`);
        return "success"
    } catch (err) {
        throw new ApiError(500, "error")
    }

}

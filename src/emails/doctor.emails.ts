export const verifyEmailTemplate = (
    otp: string
) => {
    return `
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
                <p style="margin-top: 15px;" >
                    Made with <span style= "color: #267D77;" >❤️</span> by
                    < a href = "https://www.linkedin.com/in/mahmoudtamer0/" style = "color: #267D77; text-decoration: none;" >
                        Mahmoud Tamer
                        </a>
                        </p>
                <p>If you did not request this email, please ignore it.</p>
                <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
            </div>
        </div>
    </div>
`;
}

export const resendOtpTemplate = (
    otp: string
) => {
    return `
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
`;
}

export const verifyOtpTemplate = (
    name: string,
) => {
    return `
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
`;
}

export const loginTemplate = (
    device: string,
    time: string
) => {
    return `
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
`;
}
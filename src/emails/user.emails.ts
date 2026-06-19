

export const verifyEmailTemplate = (
    name: string,
    otp: string
) => {
    return `
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
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px;">

            <h2 style="color: #4CAF50;">Congratulations 🎉</h2>

            <p>Dear ${name},</p>

            <p>Your account has been <strong>created</strong> successfully.</p>

            <p>You can now log in and start using the platform.</p>

            <p style="margin-top:30px; font-size:12px; color:#888;">
                Thank you for being part of Aleef ❤️
            </p>

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
                <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
            </div>
        </div>
    </div>
`;
}

export const banUserTemplate = (
    name: string,
    banDate: string
) => {
    return `
    <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">

            <h1 style="color: #267D77;">Aleef</h1>
            <h2 style="color: #333;">Account Access Update</h2>

            <p style="color: #555; font-size: 16px;">
                Hello <strong>${name}</strong>,
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
}

export const unBanUserTemplate = (
    name: string,
) => {
    return `
    <div style="font-family: Arial, sans-serif; text-align: center; background-color: #f5f5f5; padding: 40px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
        
        <h1 style="color: #267D77;">Aleef</h1>
        <h2 style="color: #28a745;">Account Access Restored</h2>
    
        <p style="color: #555; font-size: 16px;">
          Hello <strong>${name}</strong>,
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
}

export const forgetPasswordTemplate = (name: string, otp: string) => {
    return `
    <div style="background-color: #F5F5F5; padding: 20px; margin: 20px; border-radius: 5px;">
        <h1 style="text-align: center; margin-bottom: 20px;">Reset Password</h1>
        <p style="text-align: center; margin-bottom: 20px;">
            Hello ${name}, please click the button below to reset your password.
        </p>

        <p style="text-align: center; margin-bottom: 20px;">
            your password reset code is: <span style="font-weight: bold; color: #267D77;">${otp}</span>
        </p>
    </div>
    `;
}
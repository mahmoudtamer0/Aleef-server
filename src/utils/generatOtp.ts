import crypto from "crypto";



export const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOtp = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    const expires = new Date(Date.now() + 1 * 60 * 1000);

    return { otp, hashedOtp, expires };
};

import Joi from "joi";

export const registerSchema = Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    phone: Joi.string(),
    password: Joi.string()
        .min(8)
        .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"))
        .required()
        .messages({
            "string.pattern.base": "Password must have at least 8 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character",
            "string.min": "Password must be at least 8 characters long",
            "any.required": "Password is required",
        }),
});


export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
        .required()
        .messages({
            "any.required": "Password is required",
        }),
});

export const verifyOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string()
        .required()
        .messages({
            "any.required": "otp required",
        }),
});

export const resendOtpSchema = Joi.object({
    email: Joi.string().email().required()
});
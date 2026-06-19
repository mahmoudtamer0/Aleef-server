import Joi from "joi";

export const registerSchema = Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    license_number: Joi.string().required(),
    city: Joi.string().required(),
    address: Joi.string().required(),
    specialization: Joi.string().required(),
    appointmentFee: Joi.number().min(200).required(),
    lat: Joi.number().required(),
    lng: Joi.number().required(),
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


export const addReviewSchema = Joi.object({
    comment: Joi.string().min(2).max(200).required(),
    rate: Joi.number().max(5).min(1).required(),

});


export const editDoctorProfileSchema = Joi.object({
    name: Joi.string().min(5),
    phone: Joi.string(),
    city: Joi.string(),
    address: Joi.string(),
    specialization: Joi.string(),
    appointmentFee: Joi.number().min(200),
    about: Joi.string().max(500),
    slotduration: Joi.number().valid(15, 30, 45, 60),
});

export const editScheduleSchema = Joi.object({
    schedule: Joi.array().items(
        Joi.object({
            day_of_week: Joi.string()
                .valid('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
                .required(),
            start_time: Joi.string()
                .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
                .when('is_available', { is: true, then: Joi.required() }),
            end_time: Joi.string()
                .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
                .when('is_available', { is: true, then: Joi.required() }),
            is_available: Joi.boolean().required(),
        }).options({ stripUnknown: true })
    ).min(1).required()
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string()
        .required()
        .messages({
            "any.required": "current password is required",
        }),
    newPassword: Joi.string()
        .min(8)
        .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"))
        .required()
        .messages({
            "string.pattern.base": "Password must have at least 8 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character",
            "string.min": "Password must be at least 8 characters long",
            "any.required": "Password is required",
        }),
});

export const forgetPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
    newPassword: Joi.string()
        .min(8)
        .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$"))
        .required()
        .messages({
            "string.pattern.base": "Password must have at least 8 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character",
            "string.min": "Password must be at least 8 characters long",
            "any.required": "Password is required",
        }),
    otp: Joi.string()
        .required()
        .messages({
            "any.required": "otp required",
        }),
});
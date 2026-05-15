import Joi from "joi";

export const addPetSchema = Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
        "string.empty": "Pet name is required",
    }),

    type: Joi.string()
        .valid("dog", "cat", "bird", "other")
        .required(),

    breed: Joi.string().min(2).max(50).optional(),

    birthDate: Joi.date().max("now").optional().messages({
        "date.max": "Birth date cannot be in the future",
    }),

    gender: Joi.string().valid("male", "female").required(),

    weight: Joi.number().min(0).max(40).optional(),

    profilePic: Joi.string().uri().optional(),

});

// validations/pet.validation.ts

export const editPetSchema = Joi.object({

    name: Joi.string().min(2).max(50).optional(),

    type: Joi.string()
        .valid("dog", "cat", "bird", "other")
        .optional(),

    breed: Joi.string().min(2).max(50).optional(),

    birthDate: Joi.date().max("now").optional().messages({
        "date.max": "Birth date cannot be in the future",
    }),

    gender: Joi.string()
        .valid("male", "female")
        .optional(),

    deleteProfilePic: Joi.string().valid("true", "false").optional(),

    weight: Joi.number()
        .min(0)
        .max(40)
        .optional(),

    profilePic: Joi.string().uri().optional(),
});
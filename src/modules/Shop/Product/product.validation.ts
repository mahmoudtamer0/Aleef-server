import Joi from "joi";

export const addProductValidation = Joi.object({
    title: Joi.string().min(4).required(),
    description: Joi.string().min(10).required(),
    originalPrice: Joi.number().min(10).required(),
    discount: Joi.number().min(0).max(100).required(),
    category: Joi.string().required(),
    stock: Joi.number().required(),
    buys: Joi.number().optional(),
});


export const editProductValidation = Joi.object({
    title: Joi.string().min(4).optional(),
    description: Joi.string().min(10).optional(),
    originalPrice: Joi.number().min(10).optional(),
    discount: Joi.number().min(0).max(100).optional(),
    category: Joi.string().optional(),
    stock: Joi.number().optional(),
    deletedImages: Joi.array().items(Joi.string()).optional(),
});


export const calculateCartSchema = Joi.object({
    cart: Joi.array().required(),
});
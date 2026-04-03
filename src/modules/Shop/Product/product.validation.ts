import Joi from "joi";

export const addProductValidation = Joi.object({
    title: Joi.string().min(4).required(),
    description: Joi.string().min(10).required(),
    originalPrice: Joi.number().required(),
    discount: Joi.number().required(),
    category: Joi.string().required(),
    stock: Joi.number().required(),
    buys: Joi.number().required(),
});
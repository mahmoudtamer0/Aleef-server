import Joi from "joi";

export const orderValidationSchema = Joi.object({
    cart: Joi.array().required(),
    shippingAddress: Joi.object().required(),
    paymentMethod: Joi.string().required(),
});

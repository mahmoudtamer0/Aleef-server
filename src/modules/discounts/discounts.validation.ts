import Joi from 'joi';

const discountType = Joi.string().valid('PERCENTAGE', 'FIXED_AMOUNT');
const discountScope = Joi.string().valid('GLOBAL_LIMITED', 'PROMO_CODE', 'USER_SPECIFIC');

export const createDiscountSchema = Joi.object({
    name: Joi.string().min(3).max(255).required(),
    type: discountType.required(),
    value: Joi.number().positive().required(),
    discount_scope: discountScope.required(),
    code: Joi.string().min(3).max(50).when('discount_scope', {
        is: 'PROMO_CODE',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
    }),
    target_user_id: Joi.string().guid().when('discount_scope', {
        is: 'USER_SPECIFIC',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
    }),
    max_total_uses: Joi.number().integer().positive(),
    max_uses_per_user: Joi.number().integer().positive().default(1),
    applies_to_first_appointment_only: Joi.boolean().default(false),
    valid_from: Joi.date().iso(),
    valid_until: Joi.date().iso().greater(Joi.ref('valid_from')).messages({
        'date.greater': 'valid_until must be after valid_from',
    }),
})
    .custom((value, helpers) => {
        if (value.type === 'PERCENTAGE' && value.value > 100) {
            return helpers.error('any.custom', { message: 'PERCENTAGE value cannot exceed 100' });
        }
        return value;
    })
    .messages({
        'any.custom': '{{#message}}',
    });

export const updateDiscountSchema = Joi.object({
    name: Joi.string().min(3).max(255),
    value: Joi.number().positive(),
    max_total_uses: Joi.number().integer().positive(),
    max_uses_per_user: Joi.number().integer().positive(),
    valid_from: Joi.date().iso(),
    valid_until: Joi.date().iso().greater(Joi.ref('valid_from')).messages({
        'date.greater': 'valid_until must be after valid_from',
    }),
    is_active: Joi.boolean(),
}).min(1);

export const idParamSchema = Joi.object({
    id: Joi.string().guid().required(),
});

export const applyDiscountSchema = Joi.object({
    userId: Joi.string().guid().required(),
    code: Joi.string().min(3).max(50),
    originalPrice: Joi.number().positive().required(),
});
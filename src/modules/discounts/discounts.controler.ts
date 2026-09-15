import { User } from '../../types/user';
import catchAsync from '../../utils/catchAsync';
import * as discountService from './discounts.services';

export const createDiscount = catchAsync(async (req, res, next) => {
    const discount = await discountService.createDiscount(req.body);
    return res.status(201).json({
        status: 'success',
        data: discount,
    });
});

export const getDiscount = catchAsync(async (req, res, next) => {
    const { id } = req.params as { id: string };
    const discount = await discountService.getDiscountById(id);
    return res.status(200).json({
        status: 'success',
        data: discount,
    });
});

export const listDiscounts = catchAsync(async (req, res, next) => {
    const { scope, isActive } = req.query;

    const filters: { scope?: string; isActive?: boolean } = {};
    if (typeof scope === 'string') filters.scope = scope;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const discounts = await discountService.getAllDiscounts(filters);
    return res.status(200).json({
        status: 'success',
        data: discounts,
    });
});

export const updateDiscount = catchAsync(async (req, res, next) => {
    const { id } = req.params as { id: string };
    const discount = await discountService.updateDiscount(id, req.body);
    return res.status(200).json({
        status: 'success',
        data: discount,
    });
});

export const deleteDiscount = catchAsync(async (req, res, next) => {
    const { id } = req.params as { id: string };
    await discountService.deleteDiscount(id);
    return res.status(200).json({
        status: 'success',
    });
});


export const previewApplicableDiscount = catchAsync(async (req, res, next) => {
    const user = req.user as User;
    const { code, originalPrice } = req.body;
    const result = await discountService.findApplicableDiscount(user.id, originalPrice, code);

    return res.status(200).json({
        status: 'success',
        data: result,
    });
});
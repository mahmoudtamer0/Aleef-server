import { Router } from 'express';
import {
    createDiscount,
    getDiscount,
    listDiscounts,
    updateDiscount,
    deleteDiscount,
    previewApplicableDiscount,
} from './discounts.controler';


import {
    createDiscountSchema,
    updateDiscountSchema,
    idParamSchema,
    applyDiscountSchema,
} from './discounts.validation';

import validate from '../../middlewares/userValidate';
import { verifyToken } from '../../middlewares/verifyToken';
import { allowTo } from '../../middlewares/allowTo';

const router = Router();

router.post(
    '/',
    verifyToken,
    allowTo('ADMIN'),
    validate(createDiscountSchema),
    createDiscount
);

router.get('/', verifyToken, allowTo('ADMIN'), listDiscounts);

router.get(
    '/:id',
    verifyToken,
    allowTo('ADMIN'),
    validate(idParamSchema),
    getDiscount
);

router.patch(
    '/:id',
    verifyToken,
    allowTo('ADMIN'),
    validate(updateDiscountSchema),
    updateDiscount
);

router.delete(
    '/:id',
    verifyToken,
    allowTo('ADMIN'),
    validate(idParamSchema),
    deleteDiscount
);


router.post(
    '/preview',
    verifyToken,
    validate(applyDiscountSchema),
    previewApplicableDiscount
);

export default router;
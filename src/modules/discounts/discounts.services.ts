import { PoolClient } from 'pg';
import pool from '../../db';

import {
    Discount,
    CreateDiscountInput,
    UpdateDiscountInput,
    ApplicableDiscountResult,
} from './../../types/discount';
import ApiError from '../../utils/ApiError';

export async function createDiscount(input: CreateDiscountInput) {
    const {
        name,
        type,
        value,
        discount_scope,
        code,
        target_user_id,
        max_total_uses,
        max_uses_per_user = 1,
        applies_to_first_appointment_only = false,
        valid_from,
        valid_until,
        max_discount_amount,
    } = input;

    const result = await pool.query<Discount>(
        `INSERT INTO discounts
      (name, type, value, discount_scope, code, target_user_id,
       max_total_uses, max_uses_per_user, applies_to_first_appointment_only,
       valid_from, valid_until, max_discount_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
        [
            name,
            type,
            value,
            discount_scope,
            code ?? null,
            target_user_id ?? null,
            max_total_uses ?? null,
            max_uses_per_user,
            applies_to_first_appointment_only,
            valid_from ?? null,
            valid_until ?? null,
            max_discount_amount ?? null,
        ]
    );

    return result.rows[0];
}

export async function getDiscountById(id: string) {
    const result = await pool.query<Discount>('SELECT * FROM discounts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        throw new ApiError(404, `Discount ${id} not found`);
    }
    return result.rows[0];
}

export async function getAllDiscounts(filters: {
    scope?: string;
    isActive?: boolean;
} = {}): Promise<Discount[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.scope) {
        values.push(filters.scope);
        conditions.push(`discount_scope = $${values.length}`);
    }
    if (filters.isActive !== undefined) {
        values.push(filters.isActive);
        conditions.push(`is_active = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query<Discount>(
        `SELECT * FROM discounts ${whereClause} ORDER BY created_at DESC`,
        values
    );
    return result.rows;
}

export async function updateDiscount(id: string, input: UpdateDiscountInput) {
    const fields = Object.keys(input) as (keyof UpdateDiscountInput)[];
    if (fields.length === 0) {
        throw new Error('No fields provided to update');
    }

    const setClauses = fields.map((field, i) => `${field} = $${i + 1}`);
    const values = fields.map((field) => input[field]);
    values.push(id);

    const result = await pool.query<Discount>(
        `UPDATE discounts SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
    );

    if (result.rows.length === 0) {
        throw new ApiError(400, `Discount ${id} not found`);
    }
    return result.rows[0];
}


export async function deleteDiscount(id: string): Promise<void> {
    const result = await pool.query(
        'UPDATE discounts SET is_active = FALSE WHERE id = $1 RETURNING id',
        [id]
    );
    if (result.rows.length === 0) {
        throw new ApiError(400, `Discount ${id} not found`);
    }
}


export async function findApplicableDiscount(
    userId: string,
    originalPrice: number,
    code?: string
): Promise<ApplicableDiscountResult | null> {
    let discount = null;

    if (code) {
        const result = await pool.query<Discount>(
            `SELECT * FROM discounts
       WHERE code = $1 AND discount_scope = 'PROMO_CODE' AND is_active = TRUE
         AND (valid_until IS NULL OR valid_until > NOW())
         AND (max_total_uses IS NULL OR current_total_uses < max_total_uses)`,
            [code]
        );
        if (result.rows.length === 0) {
            throw new ApiError(400, 'Promo code is invalid, expired, or exhausted');
        }
        const perUserCount = await pool.query(
            `SELECT COUNT(*) FROM discount_redemptions WHERE discount_id = $1 AND user_id = $2`,
            [result.rows[0]?.id, userId]
        );

        if (Number(perUserCount.rows[0].count) >= result.rows[0]!.max_uses_per_user) {
            throw new ApiError(400, 'You have already used this promo code');
        }
        discount = result.rows[0];
    } else {
        const result = await pool.query<Discount>(
            `SELECT * FROM discounts
       WHERE is_active = TRUE
         AND (valid_until IS NULL OR valid_until > NOW())
         AND (
           (discount_scope = 'USER_SPECIFIC' AND target_user_id = $1
             AND (max_total_uses IS NULL OR current_total_uses < max_total_uses))
           OR
           (discount_scope = 'GLOBAL_LIMITED'
             AND (max_total_uses IS NULL OR current_total_uses < max_total_uses)
             AND (
               applies_to_first_appointment_only = FALSE
               OR NOT EXISTS (SELECT 1 FROM appointments WHERE owner = $1)
             ))
         )
       ORDER BY discount_scope = 'USER_SPECIFIC' DESC, value DESC
       LIMIT 1`,
            [userId]
        );
        discount = result.rows[0] ?? null;
    }

    if (!discount) return null;

    const rawAmount =
        discount.type === 'PERCENTAGE'
            ? (originalPrice * discount.value) / 100
            : discount.value;

    const cappedAmount =
        discount.max_discount_amount !== null && discount.max_discount_amount !== undefined
            ? Math.min(rawAmount, discount.max_discount_amount)
            : rawAmount;

    const amountSaved = Math.round(Math.min(cappedAmount, originalPrice) * 100) / 100;

    return {
        discount,
        amountSaved,
        finalPrice: Math.round((originalPrice - amountSaved) * 100) / 100,
    };
}


export async function redeemDiscountWithinTransaction(
    client: PoolClient,
    discountId: string,
    userId: string,
    appointmentId: string,
    amountSaved: number
): Promise<void> {
    const lockResult = await client.query(
        `SELECT current_total_uses, max_total_uses, max_uses_per_user
     FROM discounts WHERE id = $1 FOR UPDATE`,
        [discountId]
    );

    if (lockResult.rows.length === 0) {
        throw new ApiError(400, `Discount ${discountId} not found`);
    }

    const { current_total_uses, max_total_uses, max_uses_per_user } = lockResult.rows[0];

    if (max_total_uses !== null && current_total_uses >= max_total_uses) {
        throw new ApiError(400, 'Discount has reached its usage limit');
    }

    const perUserCount = await client.query(
        `SELECT COUNT(*) FROM discount_redemptions WHERE discount_id = $1 AND user_id = $2`,
        [discountId, userId]
    );
    if (Number(perUserCount.rows[0].count) >= max_uses_per_user) {
        throw new ApiError(400, 'User has already used this discount');
    }

    await client.query(
        `UPDATE discounts SET current_total_uses = current_total_uses + 1 WHERE id = $1`,
        [discountId]
    );

    await client.query(
        `INSERT INTO discount_redemptions (discount_id, user_id, appointment_id, amount_saved)
     VALUES ($1, $2, $3, $4)`,
        [discountId, userId, appointmentId, amountSaved]
    );
}
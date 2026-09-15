export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type DiscountScope = 'GLOBAL_LIMITED' | 'PROMO_CODE' | 'USER_SPECIFIC';

export interface Discount {
    id: string;
    name: string;
    type: DiscountType;
    value: number;
    discount_scope: DiscountScope;
    code: string | null;
    target_user_id: string | null;
    max_total_uses: number | null;
    max_uses_per_user: number;
    current_total_uses: number;
    applies_to_first_appointment_only: boolean;
    max_discount_amount: number | null; // absolute cap in EGP, e.g. 150 for "max 150 EGP off"
    valid_from: Date | null;
    valid_until: Date | null;
    is_active: boolean;
    created_at: Date;
}

export interface CreateDiscountInput {
    name: string;
    type: DiscountType;
    value: number;
    discount_scope: DiscountScope;
    code?: string;
    target_user_id?: string;
    max_total_uses?: number;
    max_uses_per_user?: number;
    applies_to_first_appointment_only?: boolean;
    max_discount_amount?: number;
    valid_from?: string; // ISO date
    valid_until?: string; // ISO date
}

export interface UpdateDiscountInput {
    name?: string;
    value?: number;
    max_total_uses?: number;
    max_uses_per_user?: number;
    max_discount_amount?: number;
    valid_from?: string;
    valid_until?: string;
    is_active?: boolean;
}

export interface DiscountRedemption {
    id: string;
    discount_id: string;
    user_id: string;
    appointment_id: string;
    amount_saved: number;
    redeemed_at: Date;
}

export interface ApplicableDiscountResult {
    discount: Discount;
    amountSaved: number;
    finalPrice: number;
}
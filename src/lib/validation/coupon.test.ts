import { describe, it, expect } from 'vitest';
import { CouponSchema } from './coupon';
import { DiscountType } from '@prisma/client';

describe('CouponSchema', () => {
  it('validates a valid percentage coupon and auto-uppercases the code', () => {
    const validData = {
      code: 'summer20',
      description: 'Summer season 20% discount',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minOrderAmount: 1000,
      maxUses: 100,
      startsAt: new Date('2026-06-01T00:00:00Z'),
      expiresAt: new Date('2026-08-31T23:59:59Z'),
      isActive: true,
    };

    const result = CouponSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('SUMMER20');
      expect(result.data.discountValue).toBe(20);
    }
  });

  it('validates a valid fixed amount coupon', () => {
    const validData = {
      code: 'SAVE500',
      discountType: DiscountType.FIXED,
      discountValue: 500,
      minOrderAmount: 2500,
      isActive: true,
    };

    const result = CouponSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('fails if percentage discount is greater than 100', () => {
    const invalidData = {
      code: 'SUPER150',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 150,
      isActive: true,
    };

    const result = CouponSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe('Percentage discount must be between 1% and 100%');
    }
  });

  it('fails if percentage discount is zero or negative', () => {
    const invalidData = {
      code: 'ZERO',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 0,
      isActive: true,
    };

    const result = CouponSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('fails if expiration date is before start date', () => {
    const invalidDates = {
      code: 'EXPIRED',
      discountType: DiscountType.FIXED,
      discountValue: 100,
      startsAt: new Date('2026-10-01'),
      expiresAt: new Date('2026-09-01'),
      isActive: true,
    };

    const result = CouponSchema.safeParse(invalidDates);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe('Expiration date must be after start date');
    }
  });

  it('fails if code contains invalid special characters', () => {
    const invalidCode = {
      code: 'PROMO 20%!',
      discountType: DiscountType.FIXED,
      discountValue: 100,
      isActive: true,
    };

    const result = CouponSchema.safeParse(invalidCode);
    expect(result.success).toBe(false);
  });
});

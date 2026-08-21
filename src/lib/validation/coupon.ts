import { z } from 'zod';
import { DiscountType } from '@prisma/client';

export const CouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, 'Coupon code must be at least 2 characters')
      .max(50, 'Coupon code cannot exceed 50 characters')
      .transform((val) => val.toUpperCase())
      .refine((val) => /^[A-Z0-9_-]+$/.test(val), {
        message: 'Coupon code may only contain uppercase letters, numbers, hyphens, and underscores',
      }),
    description: z.string().trim().max(255).optional().nullable(),
    discountType: z.nativeEnum(DiscountType),
    discountValue: z.number().positive('Discount value must be greater than 0'),
    minOrderAmount: z.number().nonnegative('Minimum order amount cannot be negative').optional().nullable(),
    maxUses: z.number().int('Max uses must be a whole integer').positive('Max uses must be at least 1').optional().nullable(),
    startsAt: z.coerce.date().optional().nullable(),
    expiresAt: z.coerce.date().optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.discountType === DiscountType.PERCENTAGE) {
        return data.discountValue >= 1 && data.discountValue <= 100;
      }
      return true;
    },
    {
      message: 'Percentage discount must be between 1% and 100%',
      path: ['discountValue'],
    }
  )
  .refine(
    (data) => {
      if (data.startsAt && data.expiresAt) {
        return new Date(data.expiresAt) > new Date(data.startsAt);
      }
      return true;
    },
    {
      message: 'Expiration date must be after start date',
      path: ['expiresAt'],
    }
  );

export type CouponInput = z.infer<typeof CouponSchema>;

export const CouponFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'expired', 'depleted', 'inactive']).default('all'),
  discountType: z.enum(['all', 'PERCENTAGE', 'FIXED']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CouponFilterInput = z.infer<typeof CouponFilterSchema>;

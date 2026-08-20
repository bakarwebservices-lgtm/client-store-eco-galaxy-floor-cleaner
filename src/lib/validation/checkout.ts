import { z } from 'zod';

export const shippingAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(8, 'Valid phone number is required (min 8 digits)').max(20),
  address: z.string().min(3, 'Delivery street address is required').max(255),
  apartment: z.string().max(100).optional().nullable(),
  city: z.string().min(1, 'City is required').max(100),
  province: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
});

export const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.string().default('COD'),
  couponCode: z.string().trim().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  subtotal: z.coerce.number().min(0),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;

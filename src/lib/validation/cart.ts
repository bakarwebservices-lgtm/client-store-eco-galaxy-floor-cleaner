import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  variantId: z.string().uuid('Invalid variant ID').optional().nullable(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(100, 'Max quantity per item is 100'),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative').max(100, 'Max quantity is 100'),
});

export const mergeCartSchema = z.object({
  guestSessionId: z.string().min(1, 'Guest session ID is required'),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

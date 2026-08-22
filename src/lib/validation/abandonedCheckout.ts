import { z } from 'zod';

export const AbandonedCheckoutSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required').max(255),
  name: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  cart: z.any(),
  subtotal: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative().default(0),
});

export type AbandonedCheckoutInput = z.infer<typeof AbandonedCheckoutSchema>;

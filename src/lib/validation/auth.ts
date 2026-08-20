import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

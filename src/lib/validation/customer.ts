import { z } from 'zod';

export const customerRegisterSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').max(20).optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const customerLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const customerProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(20).optional().nullable(),
});

export const customerAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  label: z.string().max(50).optional().nullable(),
  phone: z.string().min(8, 'Phone number required').max(20),
  address: z.string().min(3, 'Address line required').max(255),
  city: z.string().min(1, 'City is required').max(100),
  province: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().default('Pakistan'),
  isDefault: z.boolean().default(false),
});

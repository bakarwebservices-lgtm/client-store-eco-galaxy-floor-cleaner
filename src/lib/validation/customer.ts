import { z } from 'zod';
import { normalizePhone, normalizeCity } from '@/lib/geo';

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
  phone: z
    .string()
    .min(8, 'Phone number required')
    .max(25)
    .transform((val) => normalizePhone(val)),
  address: z
    .string()
    .min(8, 'Please provide a complete street address (House/Shop #, Street/Road, Area - min 8 characters)')
    .max(255),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100)
    .transform((val) => normalizeCity(val)),
  province: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().min(1).optional(),
  isDefault: z.boolean().default(false),
});

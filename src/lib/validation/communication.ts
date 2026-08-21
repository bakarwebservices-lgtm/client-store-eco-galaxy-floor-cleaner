import { z } from 'zod';

// =============================================================================
// NEWSLETTER SCHEMA
// =============================================================================

export const NewsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(150, 'Email cannot exceed 150 characters'),
});

export type NewsletterInput = z.infer<typeof NewsletterSchema>;

// =============================================================================
// CONTACT MESSAGE SCHEMA
// =============================================================================

export const ContactMessageSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(150, 'Email cannot exceed 150 characters'),
  phone: z.string().trim().max(30, 'Phone number cannot exceed 30 characters').optional().nullable(),
  subject: z.string().trim().max(150, 'Subject cannot exceed 150 characters').optional().nullable(),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(3000, 'Message cannot exceed 3000 characters'),
});

export type ContactMessageInput = z.infer<typeof ContactMessageSchema>;

// =============================================================================
// WAITLIST SUBSCRIPTION SCHEMA
// =============================================================================

export const WaitlistSubscriptionSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(150, 'Email cannot exceed 150 characters'),
  productId: z.string().uuid('Invalid product identifier'),
  variantId: z.string().uuid('Invalid variant identifier').optional().nullable(),
});

export type WaitlistSubscriptionInput = z.infer<typeof WaitlistSubscriptionSchema>;

// =============================================================================
// RESTOCK SCHEDULE SCHEMA
// =============================================================================

export const RestockScheduleSchema = z.object({
  productId: z.string().uuid('Invalid product identifier'),
  variantId: z.string().uuid('Invalid variant identifier').optional().nullable(),
  expectedDate: z.coerce.date({ required_error: 'Expected restock date is required' }),
  actualDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
});

export type RestockScheduleInput = z.infer<typeof RestockScheduleSchema>;

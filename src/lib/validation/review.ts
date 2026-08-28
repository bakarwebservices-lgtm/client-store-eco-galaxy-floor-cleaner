import { z } from 'zod';
import { imageUrlSchema } from './url';

export const CreateReviewSchema = z.object({
  reviewerName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  rating: z
    .number()
    .int('Rating must be a whole integer')
    .min(1, 'Minimum rating is 1 star')
    .max(5, 'Maximum rating is 5 stars'),
  title: z
    .string()
    .trim()
    .max(150, 'Title cannot exceed 150 characters')
    .optional()
    .nullable(),
  body: z
    .string()
    .trim()
    .min(5, 'Review must be at least 5 characters long')
    .max(2000, 'Review cannot exceed 2000 characters')
    .optional()
    .nullable(),
  images: z
    .array(
      z.object({
        url: imageUrlSchema,
        altText: z.string().trim().min(2, 'Image alt text is required for accessibility').max(200),
      })
    )
    .max(5, 'You can upload a maximum of 5 photos')
    .default([]),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

export const AdminReviewFilterSchema = z.object({
  status: z.enum(['ALL', 'PENDING', 'APPROVED']).default('ALL'),
  productId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminReviewFilterInput = z.infer<typeof AdminReviewFilterSchema>;

export const AdminUpdateReviewSchema = z.object({
  isApproved: z.boolean(),
});

export type AdminUpdateReviewInput = z.infer<typeof AdminUpdateReviewSchema>;

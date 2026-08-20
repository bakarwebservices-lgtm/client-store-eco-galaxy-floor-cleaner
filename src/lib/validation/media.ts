import { z } from 'zod';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const mediaUploadSchema = z.object({
  altText: z
    .string({ required_error: 'Alt text is required for accessibility and SEO' })
    .min(1, 'Alt text is required and cannot be empty')
    .max(255, 'Alt text must be under 255 characters'),
});

export const mediaUpdateSchema = z.object({
  altText: z
    .string()
    .min(1, 'Alt text cannot be empty')
    .max(255, 'Alt text must be under 255 characters'),
});

import { z } from 'zod';

/**
 * Validates that a string is a valid image URL or web path.
 * Accepts:
 * - Absolute URLs (https://example.com/image.png)
 * - Protocol-relative URLs (//example.com/image.png)
 * - Absolute local paths (/uploads/photo.jpg, /images/bottle.png)
 * - Data URLs (data:image/png;base64,...)
 */
export const isValidUrlOrPath = (val: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length === 0) return false;

  // Relative path or root-relative path
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return true;
  }

  // Data URI
  if (trimmed.startsWith('data:image/')) {
    return true;
  }

  // Standard absolute URL
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    // Also allow protocol-relative
    if (trimmed.startsWith('//')) return true;
    return false;
  }
};

export const imageUrlSchema = z
  .string()
  .min(1, 'Image URL cannot be empty')
  .refine(isValidUrlOrPath, {
    message: 'Image URL must be a valid web URL or local path (e.g. /uploads/... or https://...)',
  });

export const optionalImageUrlSchema = z
  .string()
  .optional()
  .nullable()
  .refine((val) => !val || val === '' || isValidUrlOrPath(val), {
    message: 'Image URL must be a valid web URL or local path (e.g. /uploads/... or https://...)',
  });

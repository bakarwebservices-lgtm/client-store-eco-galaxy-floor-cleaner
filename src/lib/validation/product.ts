import { z } from 'zod';
import { ProductStatus } from '@prisma/client';

export const productImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url('Image URL must be a valid URL'),
  altText: z.string().max(255, 'Alt text must be less than 255 characters').optional().nullable(),
  position: z.coerce.number().int().default(0),
  isPrimary: z.boolean().default(false),
  variantId: z.string().optional().nullable(),
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Variant title is required (e.g. "Black / Size L")'),
  sku: z.string().min(1, 'SKU is required'),
  price: z.coerce.number().positive('Price must be greater than 0').optional().nullable(),
  comparePrice: z.coerce.number().positive().optional().nullable(),
  inventoryQty: z.coerce.number().int().min(0, 'Inventory cannot be negative').default(0),
  color: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens (e.g. "leather-jacket")'),
  description: z.string().min(1, 'Description is required'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  comparePrice: z.coerce.number().positive('Compare price must be positive').optional().nullable(),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
  type: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  weight: z.coerce.number().positive().optional().nullable(),
  featured: z.boolean().default(false),
  hasVariants: z.boolean().default(false),
  seoTitle: z.string().max(100, 'SEO title should be under 100 characters').optional().nullable(),
  seoDescription: z.string().max(300, 'SEO description should be under 300 characters').optional().nullable(),
  categoryIds: z.array(z.string()).default([]),
  images: z.array(productImageSchema).default([]),
  variants: z.array(productVariantSchema).default([]),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type ProductImageInput = z.infer<typeof productImageSchema>;

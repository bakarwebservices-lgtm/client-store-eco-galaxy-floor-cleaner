import { z } from 'zod';
import { CollectionType } from '@prisma/client';

export const CategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(100),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens (e.g. "footwear")'),
  description: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().url('Image URL must be a valid URL').optional().nullable(),
  imageAlt: z.string().trim().max(200).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  seoTitle: z.string().trim().max(100).optional().nullable(),
  seoDescription: z.string().trim().max(300).optional().nullable(),
});

export type CategoryInput = z.infer<typeof CategorySchema>;

export const CollectionSchema = z.object({
  name: z.string().trim().min(2, 'Collection name must be at least 2 characters').max(100),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens (e.g. "summer-sale")'),
  description: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().url('Image URL must be a valid URL').optional().nullable(),
  imageAlt: z.string().trim().max(200).optional().nullable(),
  type: z.nativeEnum(CollectionType).default(CollectionType.MANUAL),
  ruleField: z.enum(['tags', 'vendor', 'type', 'price', 'featured']).optional().nullable(),
  ruleOperator: z.enum(['equals', 'contains', 'not_equals', 'greater_than', 'less_than']).optional().nullable(),
  ruleValue: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
  seoTitle: z.string().trim().max(100).optional().nullable(),
  seoDescription: z.string().trim().max(300).optional().nullable(),
  productIds: z.array(z.string().uuid()).default([]), // For manual collection assignment
});

export type CollectionInput = z.infer<typeof CollectionSchema>;

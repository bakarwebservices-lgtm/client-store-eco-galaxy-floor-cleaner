import { z } from 'zod';
import { BlogStatus, PageStatus } from '@prisma/client';

// =============================================================================
// BLOG ARTICLE SCHEMA
// =============================================================================

export const BlogArticleSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
  bodyHtml: z.string().min(1, 'Article body cannot be empty'),
  excerpt: z.string().trim().max(500, 'Excerpt cannot exceed 500 characters').optional().nullable(),
  author: z.string().trim().max(100, 'Author name cannot exceed 100 characters').optional().nullable(),
  featuredImageUrl: z.string().url('Invalid featured image URL').optional().nullable().or(z.literal('')),
  featuredImageAlt: z.string().trim().max(200, 'Image alt text cannot exceed 200 characters').optional().nullable(),
  status: z.nativeEnum(BlogStatus).default(BlogStatus.DRAFT),
  publishedAt: z.coerce.date().optional().nullable(),
  tags: z.array(z.string().trim()).default([]),
  seoTitle: z.string().trim().max(150, 'SEO title cannot exceed 150 characters').optional().nullable(),
  seoDescription: z.string().trim().max(300, 'SEO description cannot exceed 300 characters').optional().nullable(),
});

export type BlogArticleInput = z.infer<typeof BlogArticleSchema>;

// =============================================================================
// CMS PAGE SCHEMA
// =============================================================================

export const PageSchema = z.object({
  title: z.string().trim().min(2, 'Page title must be at least 2 characters').max(150, 'Page title cannot exceed 150 characters'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
  bodyHtml: z.string().min(1, 'Page body content cannot be empty'),
  status: z.nativeEnum(PageStatus).default(PageStatus.ACTIVE),
  seoTitle: z.string().trim().max(150, 'SEO title cannot exceed 150 characters').optional().nullable(),
  seoDescription: z.string().trim().max(300, 'SEO description cannot exceed 300 characters').optional().nullable(),
});

export type PageInput = z.infer<typeof PageSchema>;

// =============================================================================
// FAQ ITEM SCHEMA
// =============================================================================

export const FaqItemSchema = z.object({
  question: z.string().trim().min(5, 'Question must be at least 5 characters').max(300, 'Question cannot exceed 300 characters'),
  answer: z.string().min(5, 'Answer must be at least 5 characters'),
  category: z.string().trim().max(100, 'Category cannot exceed 100 characters').optional().nullable(),
  sortOrder: z.number().int('Sort order must be an integer').default(0),
  isActive: z.boolean().default(true),
});

export type FaqItemInput = z.infer<typeof FaqItemSchema>;

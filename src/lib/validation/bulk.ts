import { z } from 'zod';
import { PaymentStatus, FulfillmentStatus } from '@prisma/client';

export const BulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one item'),
});

export const BulkOrderActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one order'),
  action: z.enum(['UPDATE_FULFILLMENT', 'UPDATE_PAYMENT', 'CANCEL', 'DELETE', 'SYNC_COURIER']),
  fulfillmentStatus: z.nativeEnum(FulfillmentStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  sendNotification: z.boolean().default(true),
});

export const BulkProductActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one product'),
  action: z.enum(['SET_ACTIVE', 'SET_DRAFT', 'SET_ARCHIVED', 'DELETE']),
});

export const BulkToggleActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one item'),
  action: z.enum(['ACTIVATE', 'DEACTIVATE', 'DELETE']),
});

export const BulkReviewActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one review'),
  action: z.enum(['APPROVE', 'UNAPPROVE', 'DELETE']),
});

export const BulkBlogPageActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one item'),
  action: z.enum(['PUBLISH', 'DRAFT', 'DELETE']),
});

export const BulkNewsletterActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one subscriber'),
  action: z.enum(['SUBSCRIBE', 'UNSUBSCRIBE', 'DELETE']),
});

export const BulkContactActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one message'),
  action: z.enum(['MARK_READ', 'MARK_UNREAD', 'DELETE']),
});

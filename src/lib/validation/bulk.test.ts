import { describe, it, expect } from 'vitest';
import {
  BulkIdsSchema,
  BulkOrderActionSchema,
  BulkProductActionSchema,
  BulkToggleActionSchema,
  BulkReviewActionSchema,
} from './bulk';

describe('Bulk Validation Schemas', () => {
  it('validates non-empty bulk IDs', () => {
    const valid = BulkIdsSchema.safeParse({ ids: ['id-1', 'id-2'] });
    expect(valid.success).toBe(true);

    const empty = BulkIdsSchema.safeParse({ ids: [] });
    expect(empty.success).toBe(false);
  });

  it('validates bulk order fulfillment status update with notification toggle', () => {
    const valid = BulkOrderActionSchema.safeParse({
      ids: ['ord-1', 'ord-2'],
      action: 'UPDATE_FULFILLMENT',
      fulfillmentStatus: 'FULFILLED',
      sendNotification: true,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.sendNotification).toBe(true);
    }
  });

  it('validates bulk product status actions', () => {
    const valid = BulkProductActionSchema.safeParse({
      ids: ['prod-1'],
      action: 'SET_ARCHIVED',
    });
    expect(valid.success).toBe(true);

    const invalid = BulkProductActionSchema.safeParse({
      ids: ['prod-1'],
      action: 'INVALID_ACTION',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates bulk review approval actions', () => {
    const valid = BulkReviewActionSchema.safeParse({
      ids: ['rev-1', 'rev-2'],
      action: 'APPROVE',
    });
    expect(valid.success).toBe(true);
  });
});

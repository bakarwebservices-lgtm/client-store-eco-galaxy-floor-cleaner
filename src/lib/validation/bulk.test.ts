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

  it('validates bulk order courier synchronization action', () => {
    const valid = BulkOrderActionSchema.safeParse({
      ids: ['ord-1', 'ord-2'],
      action: 'SYNC_COURIER',
    });
    expect(valid.success).toBe(true);
  });

  it('validates bulk order cancellation with restock toggle and ledger reason', () => {
    // Default restockInventory should be true
    const validDefault = BulkOrderActionSchema.safeParse({
      ids: ['ord-1', 'ord-2'],
      action: 'CANCEL',
    });
    expect(validDefault.success).toBe(true);
    if (validDefault.success && validDefault.data.action === 'CANCEL') {
      expect(validDefault.data.restockInventory).toBe(true);
    }

    // Explicit false restock and custom reason
    const validExplicit = BulkOrderActionSchema.safeParse({
      ids: ['ord-1', 'ord-2'],
      action: 'CANCEL',
      restockInventory: false,
      reason: 'Batch cancellation due to warehouse flood',
    });
    expect(validExplicit.success).toBe(true);
    if (validExplicit.success && validExplicit.data.action === 'CANCEL') {
      expect(validExplicit.data.restockInventory).toBe(false);
      expect(validExplicit.data.reason).toBe('Batch cancellation due to warehouse flood');
    }

    // Reason exceeding 500 characters should fail
    const invalidReason = BulkOrderActionSchema.safeParse({
      ids: ['ord-1'],
      action: 'CANCEL',
      reason: 'a'.repeat(501),
    });
    expect(invalidReason.success).toBe(false);
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

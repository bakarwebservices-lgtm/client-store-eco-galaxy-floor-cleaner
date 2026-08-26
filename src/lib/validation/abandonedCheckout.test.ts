import { describe, it, expect } from 'vitest';
import { AbandonedCheckoutSchema } from './abandonedCheckout';

describe('AbandonedCheckoutSchema', () => {
  it('validates a valid abandoned checkout payload with partial contact info', () => {
    const valid = AbandonedCheckoutSchema.safeParse({
      sessionId: 'chk_1720000000_abc123',
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '03001234567',
      address: '123 Main St, Apt 4B',
      city: 'Lahore',
      province: 'Punjab',
      cart: [{ productId: 'prod-1', quantity: 2, price: 1500 }],
      subtotal: 3000,
      discount: 0,
      total: 3000,
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.sessionId).toBe('chk_1720000000_abc123');
      expect(valid.data.subtotal).toBe(3000);
    }
  });

  it('allows empty/null optional fields on initial page load capture', () => {
    const valid = AbandonedCheckoutSchema.safeParse({
      sessionId: 'chk_1720000000_abc123',
      cart: [],
      subtotal: 0,
    });

    expect(valid.success).toBe(true);
  });

  it('rejects payload missing sessionId', () => {
    const invalid = AbandonedCheckoutSchema.safeParse({
      cart: [],
      subtotal: 100,
    });

    expect(invalid.success).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import {
  signAdminToken,
  verifyAdminToken,
  signCustomerToken,
  verifyCustomerToken,
  signEmailVerificationToken,
  verifyEmailVerificationToken,
  signOrderAccessToken,
  verifyOrderAccessToken,
} from './token';

describe('Auth Token System', () => {
  it('should sign and verify Admin JWT token', async () => {
    const payload = { id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' };
    const token = await signAdminToken(payload);
    const verified = await verifyAdminToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(payload.id);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.role).toBe(payload.role);
  });

  it('should sign and verify Customer JWT token with nullable strings', async () => {
    const payload = { customerId: 'cust-1', email: 'user@test.com', firstName: 'Jane', lastName: 'Doe' };
    const token = await signCustomerToken(payload);
    const verified = await verifyCustomerToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.customerId).toBe(payload.customerId);
    expect(verified?.email).toBe(payload.email);
  });

  it('should sign and verify Email Verification Token', async () => {
    const payload = { customerId: 'cust-2', email: 'verify@test.com' };
    const token = await signEmailVerificationToken(payload);
    const verified = await verifyEmailVerificationToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.customerId).toBe(payload.customerId);
    expect(verified?.email).toBe(payload.email);
  });

  it('should sign and verify Order Access Token for guest confirmation protection', async () => {
    const token = await signOrderAccessToken('order-123', 'ORD-2026-001');
    const verified = await verifyOrderAccessToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.orderId).toBe('order-123');
    expect(verified?.orderNumber).toBe('ORD-2026-001');
  });

  it('should reject malformed or tampered tokens', async () => {
    const verified = await verifyAdminToken('invalid.token.structure');
    expect(verified).toBeNull();
  });
});

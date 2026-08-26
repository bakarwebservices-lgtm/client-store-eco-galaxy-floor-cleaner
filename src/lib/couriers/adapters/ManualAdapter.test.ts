import { describe, it, expect } from 'vitest';
import { ManualAdapter } from './ManualAdapter';
import { ShipmentStatus } from '@prisma/client';

describe('ManualAdapter', () => {
  const adapter = new ManualAdapter();

  it('generates a unique domestic manual tracking number on booking', async () => {
    const result = await adapter.createShipment(
      {
        orderId: 'order-123',
        orderNumber: '#1001',
        recipient: {
          name: 'Ahmed Khan',
          phone: '03001234567',
          address: 'House 123, Street 4',
          city: 'Lahore',
          country: 'Pakistan',
        },
        isCod: true,
        codAmount: 3500,
        itemsSummary: 'Product A x1',
        totalPieces: 1,
        weightKg: 0.5,
      },
      {}
    );

    expect(result.success).toBe(true);
    expect(result.trackingNumber).toMatch(/^MAN-1001-[A-Z0-9]+$/);
    expect(result.normalizedStatus).toBe(ShipmentStatus.BOOKED);
  });

  it('validates credentials without requiring external keys', async () => {
    const check = await adapter.validateCredentials();
    expect(check.valid).toBe(true);
  });
});

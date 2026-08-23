import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PostExAdapter } from './PostExAdapter';
import { ShipmentStatus } from '@prisma/client';

describe('PostExAdapter', () => {
  const adapter = new PostExAdapter();
  const mockCredentials = {
    apiToken: 'test_token_123',
    environment: 'sandbox' as const,
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('books consignment successfully with PostEx API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        statusCode: '200',
        statusMessage: 'Success',
        dist: {
          trackingNumber: 'PE1234567890',
          orderStatus: 'Booked',
          orderRefNumber: '#1001',
        },
      }),
    } as any);

    const result = await adapter.createShipment(
      {
        orderId: 'order-123',
        orderNumber: '#1001',
        recipient: {
          name: 'Usman Ali',
          phone: '+923001234567',
          address: 'Plot 45, Sector F-8/2\nNear Super Market',
          city: 'Islamabad',
          country: 'Pakistan',
        },
        isCod: true,
        codAmount: 4999,
        itemsSummary: 'Cotton Kurta - M x1',
        totalPieces: 1,
        weightKg: 0.5,
      },
      mockCredentials
    );

    expect(result.success).toBe(true);
    expect(result.trackingNumber).toBe('PE1234567890');
    expect(result.normalizedStatus).toBe(ShipmentStatus.BOOKED);
    expect(result.labelUrl).toContain('trackingNumber=PE1234567890');

    // Verify fetch was called with sanitized phone and stripped newlines
    expect(global.fetch).toHaveBeenCalledWith(
      'https://sandbox.postex.pk/services/integration/api/order/v3/create-order',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: 'test_token_123',
        },
        body: expect.stringContaining('"customerPhone":"03001234567"'),
      })
    );
  });

  it('parses incoming PostEx webhook payload accurately', async () => {
    const payload = {
      trackingNumber: 'PE1234567890',
      transactionStatus: 'Delivered',
      statusDescription: 'Consignment successfully delivered to customer.',
      cityName: 'Karachi',
      transactionDatetime: '2026-08-23T05:00:00.000Z',
    };

    const parsed = await adapter.parseWebhook(payload, {}, mockCredentials);

    expect(parsed.isValid).toBe(true);
    expect(parsed.trackingNumber).toBe('PE1234567890');
    expect(parsed.status).toBe(ShipmentStatus.DELIVERED);
    expect(parsed.location).toBe('Karachi');
    expect(parsed.description).toBe('Consignment successfully delivered to customer.');
  });

  it('validates webhook secret when provided', async () => {
    const payload = { trackingNumber: 'PE123' };
    const invalidHeaders = { token: 'wrong_secret' };
    const validHeaders = { token: 'my_secret_token' };

    const invalidParse = await adapter.parseWebhook(payload, invalidHeaders, mockCredentials, 'my_secret_token');
    expect(invalidParse.isValid).toBe(false);

    const validParse = await adapter.parseWebhook(
      { ...payload, transactionStatus: 'In-Transit' },
      validHeaders,
      mockCredentials,
      'my_secret_token'
    );
    expect(validParse.isValid).toBe(true);
  });
});

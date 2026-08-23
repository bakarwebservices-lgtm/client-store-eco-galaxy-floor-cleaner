import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { ShipmentStatus } from '@prisma/client';

vi.mock('@/lib/db', () => ({
  db: {
    shipment: {
      findUnique: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/security/rateLimit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true, remaining: 29 }),
}));

describe('Public Tracking Lookup API (/api/tracking)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects query when neither trackingNumber nor orderNumber+contact is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/tracking');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Please provide a Consignment Tracking Number');
  });

  it('returns sanitized masked tracking data when queried by valid trackingNumber', async () => {
    vi.mocked(db.shipment.findUnique).mockResolvedValue({
      id: 'shipment-123',
      trackingNumber: 'PE1234567890',
      courierName: 'PostEx Courier',
      courierCode: 'POSTEX',
      status: ShipmentStatus.IN_TRANSIT,
      rawCourierStatus: 'In-Transit to Hub',
      isCod: true,
      codAmount: 3500,
      currency: 'PKR',
      bookedAt: new Date('2026-08-23T06:00:00.000Z'),
      deliveredAt: null,
      trackingUrl: 'https://postex.pk/tracking?cn=PE1234567890',
      order: {
        shippingAddress: {
          name: 'Muhammad Ali',
          city: 'Lahore',
          country: 'Pakistan',
        },
      },
      events: [
        {
          id: 'evt-1',
          status: ShipmentStatus.BOOKED,
          rawStatus: 'Booked',
          description: 'Shipment created',
          location: 'Origin Station',
          eventTime: new Date('2026-08-23T06:00:00.000Z'),
        },
      ],
    } as any);

    const req = new NextRequest('http://localhost:3000/api/tracking?trackingNumber=PE1234567890');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.shipment.trackingNumber).toBe('PE1234567890');
    expect(data.shipment.status).toBe('IN_TRANSIT');
    // Name is masked
    expect(data.shipment.recipient.name).toBe('M******d A*i');
    expect(data.shipment.recipient.city).toBe('Lahore');
    expect(data.shipment.events).toHaveLength(1);
  });

  it('validates customer email/phone match when queried by orderNumber', async () => {
    vi.mocked(db.order.findFirst).mockResolvedValue({
      id: 'order-123',
      orderNumber: '#1001',
      customer: {
        email: 'customer@example.com',
        phone: '03001234567',
      },
      shippingAddress: {
        name: 'Sara Khan',
        email: 'customer@example.com',
        phone: '03001234567',
        city: 'Islamabad',
        country: 'Pakistan',
      },
      shipments: [
        {
          id: 'shipment-123',
          trackingNumber: 'PE99999',
          courierName: 'PostEx Courier',
          courierCode: 'POSTEX',
          status: ShipmentStatus.OUT_FOR_DELIVERY,
          rawCourierStatus: 'Out for delivery',
          isCod: false,
          codAmount: 0,
          currency: 'PKR',
          bookedAt: new Date(),
          deliveredAt: null,
          trackingUrl: null,
          events: [],
        },
      ],
    } as any);

    // Mismatched contact attempt
    const failReq = new NextRequest('http://localhost:3000/api/tracking?orderNumber=%231001&contact=wrong@email.com');
    const failRes = await GET(failReq);
    expect(failRes.status).toBe(404);

    // Correct matching contact attempt
    const successReq = new NextRequest('http://localhost:3000/api/tracking?orderNumber=%231001&contact=customer@example.com');
    const successRes = await GET(successReq);
    const successData = await successRes.json();

    expect(successRes.status).toBe(200);
    expect(successData.success).toBe(true);
    expect(successData.shipment.trackingNumber).toBe('PE99999');
  });
});

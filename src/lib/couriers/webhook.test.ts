import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleInboundWebhook } from './service';
import { db } from '@/lib/db';
import { ShipmentStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';

vi.mock('@/lib/db', () => ({
  db: {
    courierAccount: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    shipment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    trackingEvent: {
      upsert: vi.fn(),
      create: vi.fn(),
    },
    order: {
      update: vi.fn(),
    },
  },
}));

describe('Courier Webhook Ingestion & Lifecycle Automation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects webhooks with missing or unfindable tracking numbers', async () => {
    vi.mocked(db.courierAccount.findFirst).mockResolvedValue(null);
    vi.mocked(db.shipment.findUnique).mockResolvedValue(null);

    const result = await handleInboundWebhook('POSTEX', { trackingNumber: 'NON_EXISTENT' }, {});
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found in database');
  });

  it('ingests tracking event and updates fulfillment status when parcel is picked up', async () => {
    vi.mocked(db.courierAccount.findFirst).mockResolvedValue(null);
    vi.mocked(db.shipment.findUnique).mockResolvedValue({
      id: 'shipment-123',
      orderId: 'order-456',
      courierCode: 'POSTEX',
      trackingNumber: 'PE1234567890',
      status: ShipmentStatus.BOOKED,
      isCod: true,
      deliveredAt: null,
      pickedUpAt: null,
    } as any);

    vi.mocked(db.trackingEvent.upsert).mockResolvedValue({} as any);
    vi.mocked(db.shipment.update).mockResolvedValue({} as any);
    vi.mocked(db.order.update).mockResolvedValue({} as any);

    const payload = {
      trackingNumber: 'PE1234567890',
      transactionStatus: 'Picked Up',
      statusDescription: 'Parcel collected from merchant warehouse.',
      cityName: 'Lahore',
      transactionDatetime: '2026-08-23T07:30:00.000Z',
    };

    const result = await handleInboundWebhook('POSTEX', payload, {});

    expect(result.success).toBe(true);
    expect(db.trackingEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          shipmentId: 'shipment-123',
          status: ShipmentStatus.PICKED_UP,
          location: 'Lahore',
        }),
      })
    );

    // Verify order fulfillmentStatus was transitioned to FULFILLED
    expect(db.order.update).toHaveBeenCalledWith({
      where: { id: 'order-456' },
      data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
    });
  });

  it('auto-transitions COD order paymentStatus to PAID when DELIVERED webhook arrives', async () => {
    vi.mocked(db.courierAccount.findFirst).mockResolvedValue(null);
    vi.mocked(db.shipment.findUnique).mockResolvedValue({
      id: 'shipment-123',
      orderId: 'order-456',
      courierCode: 'POSTEX',
      trackingNumber: 'PE1234567890',
      status: ShipmentStatus.OUT_FOR_DELIVERY,
      isCod: true,
      deliveredAt: null,
      pickedUpAt: new Date(),
    } as any);

    vi.mocked(db.trackingEvent.upsert).mockResolvedValue({} as any);
    vi.mocked(db.shipment.update).mockResolvedValue({} as any);
    vi.mocked(db.order.update).mockResolvedValue({} as any);

    const payload = {
      trackingNumber: 'PE1234567890',
      transactionStatus: 'Delivered',
      statusDescription: 'Cash collected and parcel handed to customer.',
      cityName: 'Islamabad',
      transactionDatetime: '2026-08-23T08:00:00.000Z',
    };

    const result = await handleInboundWebhook('POSTEX', payload, {});

    expect(result.success).toBe(true);

    // Verify paymentStatus updated to PAID
    expect(db.order.update).toHaveBeenCalledWith({
      where: { id: 'order-456' },
      data: { paymentStatus: PaymentStatus.PAID },
    });
  });

  it('transitions order fulfillmentStatus to RETURNED when RTO webhook arrives', async () => {
    vi.mocked(db.courierAccount.findFirst).mockResolvedValue(null);
    vi.mocked(db.shipment.findUnique).mockResolvedValue({
      id: 'shipment-123',
      orderId: 'order-456',
      courierCode: 'POSTEX',
      trackingNumber: 'PE1234567890',
      status: ShipmentStatus.OUT_FOR_DELIVERY,
      isCod: true,
      deliveredAt: null,
      pickedUpAt: new Date(),
    } as any);

    vi.mocked(db.trackingEvent.upsert).mockResolvedValue({} as any);
    vi.mocked(db.shipment.update).mockResolvedValue({} as any);
    vi.mocked(db.order.update).mockResolvedValue({} as any);

    const payload = {
      trackingNumber: 'PE1234567890',
      transactionStatus: 'Returned to Origin',
      statusDescription: 'Customer refused delivery. Returned to merchant.',
      cityName: 'Lahore Hub',
      transactionDatetime: '2026-08-23T08:15:00.000Z',
    };

    const result = await handleInboundWebhook('POSTEX', payload, {});

    expect(result.success).toBe(true);

    // Verify fulfillmentStatus updated to RETURNED
    expect(db.order.update).toHaveBeenCalledWith({
      where: { id: 'order-456' },
      data: { fulfillmentStatus: FulfillmentStatus.RETURNED },
    });
  });
});

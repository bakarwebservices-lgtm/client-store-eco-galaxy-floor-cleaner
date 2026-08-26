import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  bookShipmentForOrder,
  cancelShipmentForOrder,
  refreshShipmentTracking,
  handleInboundWebhook,
  resolveCourierCredentials,
} from './service';
import { encryptConfig, maskSecret, decryptConfig } from './encryption';
import { shouldUpdateShipmentStatus } from './statusMapper';
import { db } from '@/lib/db';
import { ShipmentStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';

vi.mock('@/lib/db', () => ({
  db: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    shipment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    trackingEvent: {
      upsert: vi.fn(),
      create: vi.fn(),
    },
    courierAccount: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Multi-Courier Shipping Subsystem End-to-End Lifecycle & Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Security & AES-256-GCM Encryption', () => {
    it('encrypts sensitive courier credentials with AEAD and validates decryption', () => {
      const secretToken = 'postex_live_secret_token_998877665544';
      const encrypted = encryptConfig({ apiToken: secretToken, environment: 'production' });

      expect(encrypted.encryptedConfig).toBeDefined();
      expect(encrypted.configIv).toHaveLength(24); // 12 bytes hex
      expect(encrypted.configTag).toHaveLength(32); // 16 bytes hex

      const decrypted = decryptConfig<{ apiToken: string; environment: string }>(
        encrypted.encryptedConfig,
        encrypted.configIv,
        encrypted.configTag
      );

      expect(decrypted.apiToken).toBe(secretToken);
      expect(decrypted.environment).toBe('production');
    });

    it('masks secrets securely for UI display without leaking token contents', () => {
      expect(maskSecret('abcdef1234567890')).toBe('••••••••7890');
      expect(maskSecret('short')).toBe('••••rt');
    });
  });

  describe('2. Order Booking Lifecycle (Prepaid vs COD)', () => {
    it('books a manual shipment leaving Order.fulfillmentStatus as UNFULFILLED until pickup', async () => {
      vi.mocked(db.order.findUnique).mockResolvedValue({
        id: 'order-101',
        orderNumber: '#1001',
        totalPrice: 4500,
        currency: 'PKR',
        paymentStatus: PaymentStatus.PAID,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
        shippingAddress: {
          name: 'Hamza Khan',
          address: 'House 12, Street 4, Sector F-7',
          city: 'Islamabad',
          phone: '03001234567',
        },
        items: [
          { productTitle: 'Leather Jacket', sku: 'LJ-BLK-L', quantity: 1, weightKg: 1.2 },
        ],
        shipments: [],
      } as any);

      vi.mocked(db.shipment.create).mockResolvedValue({
        id: 'shipment-101',
        orderId: 'order-101',
        courierCode: 'MANUAL',
        courierName: 'Manual Courier',
        trackingNumber: 'MAN-1001-TEST',
        status: ShipmentStatus.BOOKED,
        isCod: false,
        codAmount: 0,
        currency: 'PKR',
        weightKg: 1.2,
        pieces: 1,
      } as any);
      vi.mocked(db.trackingEvent.create).mockResolvedValue({} as any);

      const result = await bookShipmentForOrder({
        orderId: 'order-101',
        courierCode: 'MANUAL',
        weightKg: 1.2,
      });

      expect(result.success).toBe(true);
      expect(result.trackingNumber).toMatch(/^MAN-1001-/);
      expect(result.normalizedStatus).toBe(ShipmentStatus.BOOKED);

      // Verify db.order.update was NOT called to mark FULFILLED prematurely at booking
      expect(db.order.update).not.toHaveBeenCalled();
    });

    it('prevents double-booking on an order with an active shipment', async () => {
      vi.mocked(db.order.findUnique).mockResolvedValue({
        id: 'order-102',
        orderNumber: '#1002',
        totalPrice: 2000,
        currency: 'PKR',
        paymentStatus: PaymentStatus.UNPAID,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
        shippingAddress: { name: 'Ali', address: 'Main Blvd', city: 'Lahore', phone: '03211112222' },
        items: [],
        shipments: [
          { id: 'existing-shipment', status: ShipmentStatus.BOOKED, trackingNumber: 'PE11111', courierCode: 'POSTEX' },
        ],
      } as any);

      await expect(
        bookShipmentForOrder({
          orderId: 'order-102',
          courierCode: 'POSTEX',
        })
      ).rejects.toThrow(/already has an active shipment/);
    });
  });

  describe('3. Webhook Ingestion, Monotonic Ranks, and Side-Effects', () => {
    it('enforces monotonic status comparison preventing regression from DELIVERED', () => {
      // IN_TRANSIT (rank 30) cannot overwrite DELIVERED (rank 50)
      expect(shouldUpdateShipmentStatus(ShipmentStatus.DELIVERED, ShipmentStatus.IN_TRANSIT)).toBe(false);
      // OUT_FOR_DELIVERY (rank 40) cannot overwrite DELIVERED (rank 50)
      expect(shouldUpdateShipmentStatus(ShipmentStatus.DELIVERED, ShipmentStatus.OUT_FOR_DELIVERY)).toBe(false);
      // DELIVERED (rank 50) can overwrite OUT_FOR_DELIVERY (rank 40)
      expect(shouldUpdateShipmentStatus(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED)).toBe(true);
      // RETURNED_TO_ORIGIN (rank 60) can overwrite OUT_FOR_DELIVERY (rank 40)
      expect(shouldUpdateShipmentStatus(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.RETURNED_TO_ORIGIN)).toBe(true);
    });

    it('transitions Order.fulfillmentStatus to FULFILLED on pickup webhook and Order.paymentStatus to PAID on COD delivery', async () => {
      vi.mocked(db.courierAccount.findFirst).mockResolvedValue(null);
      vi.mocked(db.shipment.findUnique).mockResolvedValue({
        id: 'shipment-999',
        orderId: 'order-999',
        courierCode: 'POSTEX',
        trackingNumber: 'PE999888777',
        status: ShipmentStatus.BOOKED,
        isCod: true,
        deliveredAt: null,
        pickedUpAt: null,
      } as any);

      vi.mocked(db.trackingEvent.upsert).mockResolvedValue({} as any);
      vi.mocked(db.shipment.update).mockResolvedValue({} as any);
      vi.mocked(db.order.update).mockResolvedValue({} as any);

      // Webhook 1: Picked Up
      const pickupPayload = {
        trackingNumber: 'PE999888777',
        transactionStatus: 'Picked Up',
        cityName: 'Lahore',
        transactionDatetime: '2026-08-23T06:00:00.000Z',
      };

      const pickupRes = await handleInboundWebhook('POSTEX', pickupPayload, {});
      expect(pickupRes.success).toBe(true);
      expect(db.order.update).toHaveBeenCalledWith({
        where: { id: 'order-999' },
        data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
      });

      // Webhook 2: Delivered (COD)
      const deliveryPayload = {
        trackingNumber: 'PE999888777',
        transactionStatus: 'Delivered',
        cityName: 'Lahore',
        transactionDatetime: '2026-08-23T10:00:00.000Z',
      };

      const deliveryRes = await handleInboundWebhook('POSTEX', deliveryPayload, {});
      expect(deliveryRes.success).toBe(true);
      expect(db.order.update).toHaveBeenCalledWith({
        where: { id: 'order-999' },
        data: { paymentStatus: PaymentStatus.PAID },
      });
    });
  });

  describe('4. Consignment Cancellation', () => {
    it('cancels active shipment and records tracking event', async () => {
      vi.mocked(db.shipment.findUnique).mockResolvedValue({
        id: 'shipment-cancel-1',
        orderId: 'order-cancel-1',
        courierCode: 'MANUAL',
        trackingNumber: 'MAN-CANCEL-1',
        status: ShipmentStatus.BOOKED,
      } as any);

      vi.mocked(db.shipment.count).mockResolvedValue(0);
      vi.mocked(db.shipment.update).mockResolvedValue({} as any);
      vi.mocked(db.trackingEvent.create).mockResolvedValue({} as any);
      vi.mocked(db.order.update).mockResolvedValue({} as any);

      const cancelRes = await cancelShipmentForOrder('shipment-cancel-1');
      expect(cancelRes.success).toBe(true);
      expect(db.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shipment-cancel-1' },
          data: expect.objectContaining({ status: ShipmentStatus.CANCELLED }),
        })
      );
    });
  });
});

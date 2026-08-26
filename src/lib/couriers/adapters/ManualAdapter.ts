import {
  ICourierAdapter,
  CourierCredentials,
  CreateShipmentParams,
  ShipmentBookingResult,
  TrackingResult,
  NormalizedWebhookEvent,
} from '../types';
import { ShipmentStatus } from '@prisma/client';

export class ManualAdapter implements ICourierAdapter {
  readonly code = 'MANUAL';
  readonly displayName = 'Manual / Self-Delivery';
  readonly supportsWebhooks = false;
  readonly supportsLabelGeneration = false;

  async validateCredentials(): Promise<{ valid: boolean; message?: string }> {
    return { valid: true };
  }

  async createShipment(
    params: CreateShipmentParams,
    _credentials: CourierCredentials
  ): Promise<ShipmentBookingResult> {
    // Generate a unique domestic reference consignment number
    const timestamp = Date.now().toString(36).toUpperCase();
    const trackingNumber = `MAN-${params.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}-${timestamp}`;

    return {
      success: true,
      trackingNumber,
      rawStatus: 'Dispatched via In-House Fleet / Manual Courier',
      normalizedStatus: ShipmentStatus.BOOKED,
      courierMeta: {
        method: 'MANUAL',
        assignedRiderNotes: params.orderNotes || null,
        dispatchedAt: new Date().toISOString(),
      },
    };
  }

  async cancelShipment(
    _trackingNumber: string,
    _credentials: CourierCredentials
  ): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  async getTracking(
    trackingNumber: string,
    _credentials: CourierCredentials
  ): Promise<TrackingResult> {
    return {
      success: true,
      trackingNumber,
      currentStatus: ShipmentStatus.BOOKED,
      rawStatus: 'Manual Tracking',
      history: [
        {
          status: ShipmentStatus.BOOKED,
          rawStatus: 'Dispatched',
          description: 'Package prepared and assigned for manual dispatch.',
          timestamp: new Date(),
        },
      ],
    };
  }

  async parseWebhook(): Promise<NormalizedWebhookEvent> {
    return {
      isValid: false,
      trackingNumber: '',
      status: ShipmentStatus.PENDING,
      rawStatus: '',
      description: 'Manual adapter does not support external webhooks.',
      timestamp: new Date(),
      errorMessage: 'Manual courier does not receive webhooks.',
    };
  }
}

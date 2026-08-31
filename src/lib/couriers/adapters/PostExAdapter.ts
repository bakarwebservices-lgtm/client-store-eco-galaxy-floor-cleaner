import {
  ICourierAdapter,
  CourierCredentials,
  CreateShipmentParams,
  ShipmentBookingResult,
  TrackingResult,
  TrackingHistoryItem,
  NormalizedWebhookEvent,
  PickupLocation,
} from '../types';
import { ShipmentStatus } from '@prisma/client';
import { mapPostExStatus } from '../statusMapper';

export class PostExAdapter implements ICourierAdapter {
  readonly code = 'POSTEX';
  readonly displayName = 'PostEx Courier';
  readonly supportsWebhooks = true;
  readonly supportsLabelGeneration = true;

  private getBaseUrl(credentials: CourierCredentials): string {
    return credentials.environment === 'sandbox'
      ? 'https://sandbox.postex.pk'
      : 'https://api.postex.pk';
  }

  private getHeaders(credentials: CourierCredentials): Record<string, string> {
    const token = credentials.apiToken || credentials.apiKey;
    if (!token) {
      throw new Error('PostEx API token is missing in courier credentials.');
    }
    return {
      'Content-Type': 'application/json',
      token: token.trim(),
    };
  }

  /**
   * Sanitizes and normalizes Pakistani phone numbers to standard 11-digit format (03XXXXXXXXX)
   */
  private normalizePhone(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('92') && cleaned.length === 12) {
      cleaned = '0' + cleaned.slice(2);
    } else if (cleaned.startsWith('0092') && cleaned.length === 14) {
      cleaned = '0' + cleaned.slice(4);
    }
    return cleaned;
  }

  /**
   * Cleans text fields to avoid PostEx API payload validation rejections
   */
  private sanitizeText(text?: string | null, maxLength = 250): string {
    if (!text) return '';
    return text
      .replace(/[\r\n]+/g, ', ')
      .replace(/[^\x20-\x7E\u0600-\u06FF]/g, '') // Keep standard ASCII & Urdu characters
      .trim()
      .slice(0, maxLength);
  }

  async validateCredentials(credentials: CourierCredentials): Promise<{ valid: boolean; message?: string }> {
    try {
      const baseUrl = this.getBaseUrl(credentials);
      const res = await fetch(`${baseUrl}/services/integration/api/order/v1/get-pickup-locations`, {
        method: 'GET',
        headers: this.getHeaders(credentials),
      });

      if (!res.ok) {
        return {
          valid: false,
          message: `PostEx authentication failed with status ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json();
      if (data.statusCode === '200' || data.dist !== undefined || Array.isArray(data.dist)) {
        return { valid: true };
      }

      return {
        valid: false,
        message: data.statusMessage || 'Invalid API Token for PostEx.',
      };
    } catch (err: any) {
      return {
        valid: false,
        message: `Network error connecting to PostEx: ${err?.message || err}`,
      };
    }
  }

  async createShipment(
    params: CreateShipmentParams,
    credentials: CourierCredentials
  ): Promise<ShipmentBookingResult> {
    try {
      const baseUrl = this.getBaseUrl(credentials);
      const normalizedPhone = this.normalizePhone(params.recipient.phone);

      const payload = {
        orderRefNumber: params.orderNumber,
        invoicePayment: params.isCod ? Math.round(params.codAmount) : 0,
        orderDetail: this.sanitizeText(params.itemsSummary || `Order ${params.orderNumber}`, 150),
        customerName: this.sanitizeText(params.recipient.name, 60),
        customerPhone: normalizedPhone,
        deliveryAddress: this.sanitizeText(params.recipient.address, 200),
        cityName: this.sanitizeText(params.recipient.city, 50),
        transactionNotes: this.sanitizeText(params.orderNotes || '', 100),
        orderType: 'Normal', // Normal | Reverse
        items: params.totalPieces || 1,
        pickupAddressCode: params.pickupAddressCode || credentials.pickupAddressCode || '001',
      };

      const res = await fetch(`${baseUrl}/services/integration/api/order/v3/create-order`, {
        method: 'POST',
        headers: this.getHeaders(credentials),
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || (data.statusCode && data.statusCode !== '200' && data.statusCode !== 200)) {
        return {
          success: false,
          trackingNumber: '',
          rawStatus: 'Failed',
          normalizedStatus: ShipmentStatus.PENDING,
          error: data.statusMessage || data.message || `PostEx booking failed with status ${res.status}`,
          courierMeta: data,
        };
      }

      const dist = data.dist || data;
      const trackingNumber = String(dist.trackingNumber || dist.tracking_number || '').trim();

      if (!trackingNumber) {
        return {
          success: false,
          trackingNumber: '',
          rawStatus: 'Failed',
          normalizedStatus: ShipmentStatus.PENDING,
          error: 'PostEx responded successfully but returned no tracking number.',
          courierMeta: data,
        };
      }

      const rawStatus = dist.orderStatus || dist.transactionStatus || 'Booked';
      const labelUrl = `${baseUrl}/services/integration/api/order/v1/invoice?trackingNumber=${trackingNumber}`;
      const trackingUrl = `https://postex.pk/tracking?cn=${trackingNumber}`;

      return {
        success: true,
        trackingNumber,
        rawStatus,
        normalizedStatus: mapPostExStatus(rawStatus),
        labelUrl,
        trackingUrl,
        courierMeta: dist,
      };
    } catch (err: any) {
      return {
        success: false,
        trackingNumber: '',
        rawStatus: 'Error',
        normalizedStatus: ShipmentStatus.PENDING,
        error: `Exception creating PostEx shipment: ${err?.message || err}`,
      };
    }
  }

  async cancelShipment(
    trackingNumber: string,
    credentials: CourierCredentials
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const baseUrl = this.getBaseUrl(credentials);
      const res = await fetch(`${baseUrl}/services/integration/api/order/v1/cancel-order`, {
        method: 'POST',
        headers: this.getHeaders(credentials),
        body: JSON.stringify({ trackingNumber }),
      });

      const data = await res.json();
      if (!res.ok || (data.statusCode && data.statusCode !== '200' && data.statusCode !== 200)) {
        return {
          success: false,
          error: data.statusMessage || data.message || `PostEx cancel failed with status ${res.status}`,
        };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: `Exception cancelling PostEx shipment: ${err?.message || err}`,
      };
    }
  }

  async getTracking(
    trackingNumber: string,
    credentials: CourierCredentials
  ): Promise<TrackingResult> {
    try {
      const baseUrl = this.getBaseUrl(credentials);
      const res = await fetch(
        `${baseUrl}/services/integration/api/order/v1/track-order/${encodeURIComponent(trackingNumber)}`,
        {
          method: 'GET',
          headers: this.getHeaders(credentials),
        }
      );

      const data = await res.json();

      if (!res.ok || (data.statusCode && data.statusCode !== '200' && data.statusCode !== 200)) {
        return {
          success: false,
          trackingNumber,
          currentStatus: ShipmentStatus.BOOKED,
          rawStatus: 'Unknown',
          history: [],
          error: data.statusMessage || data.message || `Failed to track PostEx consignment.`,
        };
      }

      const dist = data.dist || {};
      const rawCurrentStatus = dist.orderStatus || dist.transactionStatus || 'In Transit';
      const normalizedCurrentStatus = mapPostExStatus(rawCurrentStatus);

      const historyItems: TrackingHistoryItem[] = [];
      const trackingHistory = dist.trackingHistory || dist.transactionStatusHistory || [];

      if (Array.isArray(trackingHistory)) {
        for (const item of trackingHistory) {
          const rawStatus = item.status || item.transactionStatus || 'Update';
          historyItems.push({
            status: mapPostExStatus(rawStatus),
            rawStatus,
            description: item.statusDescription || item.remarks || rawStatus,
            location: item.cityName || item.location || undefined,
            timestamp: item.transactionDatetime ? new Date(item.transactionDatetime) : new Date(),
          });
        }
      }

      // Ensure history is ordered chronologically
      historyItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      return {
        success: true,
        trackingNumber,
        currentStatus: normalizedCurrentStatus,
        rawStatus: rawCurrentStatus,
        history: historyItems,
      };
    } catch (err: any) {
      return {
        success: false,
        trackingNumber,
        currentStatus: ShipmentStatus.BOOKED,
        rawStatus: 'Error',
        history: [],
        error: `Exception tracking PostEx consignment: ${err?.message || err}`,
      };
    }
  }

  async parseWebhook(
    payload: any,
    headers: Record<string, string>,
    credentials: CourierCredentials,
    webhookSecret?: string
  ): Promise<NormalizedWebhookEvent> {
    try {
      // Optional security header verification if webhookSecret is configured
      if (webhookSecret) {
        const receivedToken = headers['token'] || headers['x-webhook-token'] || headers['authorization'];
        if (receivedToken && receivedToken.replace(/^Bearer\s+/i, '').trim() !== webhookSecret.trim()) {
          return {
            isValid: false,
            trackingNumber: '',
            status: ShipmentStatus.PENDING,
            rawStatus: '',
            description: 'Unauthorized webhook request token.',
            timestamp: new Date(),
            errorMessage: 'Webhook authentication token mismatch.',
          };
        }
      }

      const trackingNumber = String(
        payload.trackingNumber ||
        payload.tracking_number ||
        payload.cn ||
        payload.dist?.trackingNumber ||
        ''
      ).trim();

      if (!trackingNumber) {
        return {
          isValid: false,
          trackingNumber: '',
          status: ShipmentStatus.PENDING,
          rawStatus: '',
          description: 'Webhook payload missing tracking number.',
          timestamp: new Date(),
          errorMessage: 'Payload has no tracking number.',
        };
      }

      const rawStatus = String(
        payload.transactionStatus ||
        payload.orderStatus ||
        payload.status ||
        payload.dist?.transactionStatus ||
        'Updated'
      ).trim();

      const normalizedStatus = mapPostExStatus(rawStatus);
      const description =
        payload.statusDescription ||
        payload.remarks ||
        payload.statusMessage ||
        `Status updated to ${rawStatus}`;

      const location = payload.cityName || payload.location || undefined;
      const timestamp = payload.transactionDatetime || payload.eventTime
        ? new Date(payload.transactionDatetime || payload.eventTime)
        : new Date();

      return {
        isValid: true,
        trackingNumber,
        status: normalizedStatus,
        rawStatus,
        description,
        location,
        timestamp,
        metadata: payload,
      };
    } catch (err: any) {
      return {
        isValid: false,
        trackingNumber: '',
        status: ShipmentStatus.PENDING,
        rawStatus: '',
        description: 'Failed to parse PostEx webhook.',
        timestamp: new Date(),
        errorMessage: err?.message || String(err),
      };
    }
  }

  async getShippingLabel(
    trackingNumber: string,
    credentials: CourierCredentials
  ): Promise<{ labelUrl?: string; pdfBuffer?: Buffer; error?: string }> {
    const baseUrl = this.getBaseUrl(credentials);
    const labelUrl = `${baseUrl}/services/integration/api/order/v1/invoice?trackingNumber=${encodeURIComponent(trackingNumber)}`;
    return { labelUrl };
  }

  async getPickupLocations(credentials: CourierCredentials): Promise<PickupLocation[]> {
    try {
      const baseUrl = this.getBaseUrl(credentials);
      const res = await fetch(`${baseUrl}/services/integration/api/order/v1/get-pickup-locations`, {
        method: 'GET',
        headers: this.getHeaders(credentials),
      });

      if (!res.ok) return [];

      const data = await res.json();
      const locations = data.dist || data.pickupLocations || [];

      if (!Array.isArray(locations)) return [];

      return locations.map((loc: any) => ({
        code: String(loc.pickupAddressCode || loc.code || loc.id || ''),
        name: String(loc.pickupAddressTitle || loc.name || loc.cityName || 'Warehouse'),
        city: String(loc.cityName || loc.city || ''),
        address: loc.address || loc.pickupAddress || undefined,
        phone: loc.phone || loc.contactNumber || undefined,
      }));
    } catch {
      return [];
    }
  }
}

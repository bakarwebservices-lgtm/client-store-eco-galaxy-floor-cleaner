import { ShipmentStatus } from '@prisma/client';

export interface CourierCredentials {
  apiKey?: string;
  apiToken?: string;
  apiSecret?: string;
  merchantId?: string;
  accountNumber?: string;
  costCenterCode?: string;
  pickupAddressCode?: string;
  environment?: 'sandbox' | 'production';
  [key: string]: any;
}

export interface RecipientAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
}

export interface CreateShipmentParams {
  orderId: string;
  orderNumber: string;
  recipient: RecipientAddress;
  isCod: boolean;
  codAmount: number;
  currency?: string;
  orderNotes?: string;
  itemsSummary: string;
  totalPieces: number;
  weightKg: number;
  pickupAddressCode?: string;
  orderType?: string;
}

export interface ShipmentBookingResult {
  success: boolean;
  trackingNumber: string;
  rawStatus: string;
  normalizedStatus: ShipmentStatus;
  labelUrl?: string;
  trackingUrl?: string;
  shippingCharges?: number;
  fuelSurcharge?: number;
  gst?: number;
  netAmount?: number;
  courierMeta?: Record<string, any>;
  error?: string;
}

export interface TrackingHistoryItem {
  status: ShipmentStatus;
  rawStatus: string;
  description: string;
  location?: string;
  timestamp: Date;
}

export interface TrackingResult {
  success: boolean;
  trackingNumber: string;
  currentStatus: ShipmentStatus;
  rawStatus: string;
  history: TrackingHistoryItem[];
  error?: string;
}

export interface NormalizedWebhookEvent {
  isValid: boolean;
  trackingNumber: string;
  status: ShipmentStatus;
  rawStatus: string;
  description: string;
  location?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  errorMessage?: string;
}

export interface PickupLocation {
  code: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
}

export interface ICourierAdapter {
  readonly code: string;
  readonly displayName: string;
  readonly supportsWebhooks: boolean;
  readonly supportsLabelGeneration: boolean;

  /**
   * Validates courier credentials against the provider API.
   */
  validateCredentials(credentials: CourierCredentials): Promise<{ valid: boolean; message?: string }>;

  /**
   * Books a shipment consignment with the courier and returns tracking details.
   */
  createShipment(params: CreateShipmentParams, credentials: CourierCredentials): Promise<ShipmentBookingResult>;

  /**
   * Cancels a booked shipment before pickup.
   */
  cancelShipment(trackingNumber: string, credentials: CourierCredentials): Promise<{ success: boolean; error?: string }>;

  /**
   * Fetches real-time tracking timeline from the courier API.
   */
  getTracking(trackingNumber: string, credentials: CourierCredentials): Promise<TrackingResult>;

  /**
   * Normalizes incoming webhook payload from the courier.
   */
  parseWebhook(
    payload: any,
    headers: Record<string, string>,
    credentials: CourierCredentials,
    webhookSecret?: string
  ): Promise<NormalizedWebhookEvent>;

  /**
   * Fetches or generates printable Airway Bill / Shipping Label.
   */
  getShippingLabel?(
    trackingNumber: string,
    credentials: CourierCredentials
  ): Promise<{ labelUrl?: string; pdfBuffer?: Buffer; error?: string }>;

  /**
   * Lists merchant pickup addresses configured in the courier account.
   */
  getPickupLocations?(credentials: CourierCredentials): Promise<PickupLocation[]>;
}

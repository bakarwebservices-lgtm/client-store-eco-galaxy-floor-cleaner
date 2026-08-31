import crypto from 'crypto';
import { db } from '@/lib/db';
import { getCourierAdapter } from './registry';
import { decryptConfig } from './encryption';
import { CourierCredentials, CreateShipmentParams, ShipmentBookingResult } from './types';
import { ShipmentStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';
import { shouldUpdateShipmentStatus } from './statusMapper';

export interface BookShipmentOptions {
  orderId: string;
  courierCode: string;
  courierAccountId?: string;
  pickupAddressCode?: string;
  orderType?: string;
  customCodAmount?: number;
  weightKg?: number;
  pieces?: number;
  orderNotes?: string;
}

/**
 * Resolves credentials for a given courier code:
 * 1. Checks specific `CourierAccount` by ID if provided, or default active account for courierCode.
 * 2. If no DB account found, falls back to environment variables (e.g. `POSTEX_API_TOKEN`).
 */
export async function resolveCourierCredentials(
  courierCode: string,
  courierAccountId?: string,
  allowFallback = false
): Promise<{ credentials: CourierCredentials; accountId?: string; webhookSecret?: string }> {
  const normalizedCode = courierCode.toUpperCase().trim();

  let account = null;

  if (courierAccountId) {
    account = await db.courierAccount.findUnique({
      where: { id: courierAccountId },
    });
  } else {
    account = await db.courierAccount.findFirst({
      where: { courierCode: normalizedCode, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  if (account) {
    try {
      const decrypted = decryptConfig<CourierCredentials>(
        account.encryptedConfig,
        account.configIv,
        account.configTag
      );
      return {
        credentials: decrypted,
        accountId: account.id,
        webhookSecret: account.webhookSecret || undefined,
      };
    } catch (err) {
      console.error(`Failed to decrypt credentials for CourierAccount "${account.id}":`, err);
      throw new Error(`Courier account credentials decryption failed. Please re-enter them in settings.`);
    }
  }

  // Fallback to environment variables if no DB account configured
  const envCredentials: CourierCredentials = {};

  if (normalizedCode === 'POSTEX') {
    const token = process.env.POSTEX_API_TOKEN;
    if (token) {
      envCredentials.apiToken = token;
      envCredentials.environment = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
      return { credentials: envCredentials };
    }
  }

  if (normalizedCode === 'MANUAL' || allowFallback) {
    return { credentials: {} };
  }

  throw new Error(
    `No active courier account found for "${courierCode}". Please configure credentials in Admin Settings.`
  );
}

/**
 * Books a shipment for an order with the selected courier.
 */
export async function bookShipmentForOrder(
  options: BookShipmentOptions
): Promise<ShipmentBookingResult & { shipmentId: string }> {
  const { orderId, courierCode, courierAccountId, pickupAddressCode, orderType, customCodAmount, weightKg, pieces, orderNotes } =
    options;

  // 1. Fetch Order with Items and Customer
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      customer: true,
      shipments: {
        where: {
          status: {
            notIn: [ShipmentStatus.CANCELLED, ShipmentStatus.RETURNED_TO_ORIGIN],
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order "${orderId}" not found.`);
  }

  if (order.cancelledAt) {
    throw new Error(`Cannot dispatch a cancelled order.`);
  }

  // Check if there is already an active (non-cancelled) shipment
  if (order.shipments.length > 0) {
    const active = order.shipments[0];
    throw new Error(
      `Order already has an active shipment (${active.courierCode} - ${active.trackingNumber}). Cancel it first to re-book.`
    );
  }

  // 2. Resolve Shipping Address Snapshot
  const shippingAddress = (order.shippingAddress as Record<string, any>) || {};
  const recipientName = shippingAddress.name || `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() || 'Customer';
  const recipientPhone = shippingAddress.phone || order.customer?.phone || '';
  const fullAddress = [shippingAddress.address, shippingAddress.apartment].filter(Boolean).join(', ');

  // 3. Resolve COD amount safely
  // If paymentStatus is PAID, COD must be 0
  const isPrepaid = order.paymentStatus === PaymentStatus.PAID;
  const isCod = !isPrepaid;
  const finalCodAmount = isPrepaid ? 0 : customCodAmount !== undefined ? customCodAmount : order.totalPrice;

  // 4. Calculate total billable weight
  // Priority: manual input -> sum of OrderItem.weightKg snapshots -> fallback 0.5 kg
  let calculatedWeight = weightKg;
  if (!calculatedWeight || calculatedWeight <= 0) {
    const itemWeightSum = order.items.reduce((sum, item) => {
      const itemWeight = item.weightKg || 0.5;
      return sum + itemWeight * item.quantity;
    }, 0);
    calculatedWeight = itemWeightSum > 0 ? Number(itemWeightSum.toFixed(2)) : 0.5;
  }

  const itemsSummary = order.items
    .map((item) => `${item.productTitle}${item.variantTitle ? ` (${item.variantTitle})` : ''} x${item.quantity}`)
    .join(', ');

  // 5. Resolve Courier Adapter and Decrypt Credentials
  const adapter = getCourierAdapter(courierCode);
  const { credentials, accountId } = await resolveCourierCredentials(courierCode, courierAccountId);

  const bookingParams: CreateShipmentParams = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    recipient: {
      name: recipientName,
      phone: recipientPhone,
      address: fullAddress,
      city: shippingAddress.city || 'Lahore',
      province: shippingAddress.province || undefined,
      postalCode: shippingAddress.postalCode || undefined,
      country: shippingAddress.country || 'Pakistan',
    },
    isCod,
    codAmount: finalCodAmount,
    currency: order.currency,
    orderNotes: orderNotes || order.notes || undefined,
    itemsSummary,
    totalPieces: pieces || 1,
    weightKg: calculatedWeight,
    pickupAddressCode,
    orderType,
  };

  // 6. Execute Courier API Call
  const bookingResult = await adapter.createShipment(bookingParams, credentials);

  if (!bookingResult.success) {
    return {
      ...bookingResult,
      shipmentId: '',
    };
  }

  // 7. Persist Shipment in Database
  const shipment = await db.shipment.create({
    data: {
      orderId: order.id,
      courierAccountId: accountId || null,
      courierCode: adapter.code,
      courierName: adapter.displayName,
      trackingNumber: bookingResult.trackingNumber,
      status: bookingResult.normalizedStatus || ShipmentStatus.BOOKED,
      rawCourierStatus: bookingResult.rawStatus,
      isCod,
      codAmount: finalCodAmount,
      currency: order.currency,
      weightKg: calculatedWeight,
      pieces: pieces || 1,
      pickupAddressCode: pickupAddressCode || null,
      labelUrl: bookingResult.labelUrl || null,
      trackingUrl: bookingResult.trackingUrl || null,
      courierMeta: bookingResult.courierMeta || {},
      bookedAt: new Date(),
    },
  });

  // 8. Create Initial Tracking Event
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${shipment.id}:${shipment.status}:${new Date().toISOString().slice(0, 10)}:initial`)
    .digest('hex');

  await db.trackingEvent.create({
    data: {
      shipmentId: shipment.id,
      status: shipment.status,
      rawStatus: shipment.rawCourierStatus,
      description: `Shipment booked with ${adapter.displayName}. Tracking #: ${shipment.trackingNumber}`,
      eventTime: new Date(),
      idempotencyKey,
    },
  });

  // Note: Order.fulfillmentStatus intentionally remains UNFULFILLED until physical collection (PICKED_UP or later)
  // is confirmed via webhook or tracking sync.

  return {
    ...bookingResult,
    shipmentId: shipment.id,
  };
}

/**
 * Cancels a shipment booking before pickup.
 */
export async function cancelShipmentForOrder(shipmentId: string): Promise<{ success: boolean; error?: string }> {
  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    include: { order: true },
  });

  if (!shipment) {
    throw new Error(`Shipment "${shipmentId}" not found.`);
  }

  if (shipment.status === ShipmentStatus.DELIVERED) {
    throw new Error(`Cannot cancel a delivered shipment.`);
  }

  if (shipment.status === ShipmentStatus.CANCELLED) {
    return { success: true };
  }

  const adapter = getCourierAdapter(shipment.courierCode);
  const { credentials } = await resolveCourierCredentials(shipment.courierCode, shipment.courierAccountId || undefined);

  const cancelResult = await adapter.cancelShipment(shipment.trackingNumber, credentials);
  if (!cancelResult.success) {
    return cancelResult;
  }

  // Update Shipment status to CANCELLED
  await db.shipment.update({
    where: { id: shipment.id },
    data: {
      status: ShipmentStatus.CANCELLED,
      rawCourierStatus: 'Cancelled',
      cancelledAt: new Date(),
    },
  });

  // Record tracking event
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${shipment.id}:CANCELLED:${new Date().toISOString()}`)
    .digest('hex');

  await db.trackingEvent.create({
    data: {
      shipmentId: shipment.id,
      status: ShipmentStatus.CANCELLED,
      rawStatus: 'Cancelled',
      description: 'Shipment booking cancelled by administrator.',
      eventTime: new Date(),
      idempotencyKey,
    },
  });

  // Revert Order fulfillment status to UNFULFILLED if no other active shipment exists
  const otherActiveShipments = await db.shipment.count({
    where: {
      orderId: shipment.orderId,
      status: {
        notIn: [ShipmentStatus.CANCELLED, ShipmentStatus.RETURNED_TO_ORIGIN],
      },
    },
  });

  if (otherActiveShipments === 0) {
    await db.order.update({
      where: { id: shipment.orderId },
      data: {
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
      },
    });
  }

  return { success: true };
}

/**
 * Polls courier tracking API to refresh the tracking history and current status.
 */
export async function refreshShipmentTracking(shipmentId: string): Promise<{ success: boolean; eventsAdded: number; status: ShipmentStatus; error?: string }> {
  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    include: { order: true },
  });

  if (!shipment) {
    throw new Error(`Shipment "${shipmentId}" not found.`);
  }

  const adapter = getCourierAdapter(shipment.courierCode);
  const { credentials } = await resolveCourierCredentials(shipment.courierCode, shipment.courierAccountId || undefined);

  const trackingResult = await adapter.getTracking(shipment.trackingNumber, credentials);
  if (!trackingResult.success) {
    return {
      success: false,
      eventsAdded: 0,
      status: shipment.status,
      error: trackingResult.error,
    };
  }

  let eventsAdded = 0;

  // Ingest tracking history items idempotently
  for (const item of trackingResult.history) {
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${shipment.id}:${item.status}:${item.timestamp.toISOString()}:${item.location || ''}`)
      .digest('hex');

    try {
      await db.trackingEvent.upsert({
        where: { idempotencyKey },
        create: {
          shipmentId: shipment.id,
          status: item.status,
          rawStatus: item.rawStatus,
          description: item.description,
          location: item.location || null,
          eventTime: item.timestamp,
          idempotencyKey,
        },
        update: {},
      });
      eventsAdded++;
    } catch {
      // Ignore unique constraint collisions silently
    }
  }

  // Update Shipment Status if monotonic rule allows
  if (shouldUpdateShipmentStatus(shipment.status, trackingResult.currentStatus)) {
    const updates: any = {
      status: trackingResult.currentStatus,
      rawCourierStatus: trackingResult.rawStatus,
    };

    if (trackingResult.currentStatus === ShipmentStatus.DELIVERED && !shipment.deliveredAt) {
      updates.deliveredAt = new Date();
    }
    if (trackingResult.currentStatus === ShipmentStatus.PICKED_UP && !shipment.pickedUpAt) {
      updates.pickedUpAt = new Date();
    }

    await db.shipment.update({
      where: { id: shipment.id },
      data: updates,
    });

    // Side effect 1: If shipment is picked up or in transit/out for delivery/delivered, mark order as FULFILLED
    const fulfilledStatuses: ShipmentStatus[] = [
      ShipmentStatus.PICKED_UP,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.OUT_FOR_DELIVERY,
      ShipmentStatus.DELIVERED,
    ];

    if (fulfilledStatuses.includes(trackingResult.currentStatus)) {
      await db.order.update({
        where: { id: shipment.orderId },
        data: {
          fulfillmentStatus: FulfillmentStatus.FULFILLED,
        },
      });
    }

    // Side effect 2: If COD order is delivered, auto-transition payment status to PAID (INFO-3)
    if (trackingResult.currentStatus === ShipmentStatus.DELIVERED && shipment.isCod) {
      await db.order.update({
        where: { id: shipment.orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
        },
      });
    }

    // Side effect 3: If shipment is returned to origin, update order fulfillment status
    if (trackingResult.currentStatus === ShipmentStatus.RETURNED_TO_ORIGIN) {
      await db.order.update({
        where: { id: shipment.orderId },
        data: {
          fulfillmentStatus: FulfillmentStatus.RETURNED,
        },
      });
    }
  }

  return {
    success: true,
    eventsAdded,
    status: trackingResult.currentStatus,
  };
}

/**
 * Ingests and processes an inbound courier webhook event.
 */
export async function handleInboundWebhook(
  courierCode: string,
  payload: any,
  headers: Record<string, string>
): Promise<{ success: boolean; message: string; trackingNumber?: string }> {
  const adapter = getCourierAdapter(courierCode);
  const { credentials, webhookSecret } = await resolveCourierCredentials(courierCode, undefined, true);

  const parsedEvent = await adapter.parseWebhook(payload, headers, credentials, webhookSecret);
  if (!parsedEvent.isValid || !parsedEvent.trackingNumber) {
    return {
      success: false,
      message: parsedEvent.errorMessage || 'Invalid webhook payload.',
    };
  }

  const shipment = await db.shipment.findUnique({
    where: { trackingNumber: parsedEvent.trackingNumber },
    include: { order: true },
  });

  if (!shipment) {
    return {
      success: false,
      message: `Shipment with tracking number "${parsedEvent.trackingNumber}" not found in database.`,
      trackingNumber: parsedEvent.trackingNumber,
    };
  }

  // Deduplication key
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${shipment.id}:${parsedEvent.status}:${parsedEvent.timestamp.toISOString()}:${parsedEvent.location || ''}`)
    .digest('hex');

  await db.trackingEvent.upsert({
    where: { idempotencyKey },
    create: {
      shipmentId: shipment.id,
      status: parsedEvent.status,
      rawStatus: parsedEvent.rawStatus,
      description: parsedEvent.description,
      location: parsedEvent.location || null,
      eventTime: parsedEvent.timestamp,
      idempotencyKey,
    },
    update: {},
  });

  // Monotonic status update
  if (shouldUpdateShipmentStatus(shipment.status, parsedEvent.status)) {
    const updates: any = {
      status: parsedEvent.status,
      rawCourierStatus: parsedEvent.rawStatus,
    };

    if (parsedEvent.status === ShipmentStatus.DELIVERED && !shipment.deliveredAt) {
      updates.deliveredAt = parsedEvent.timestamp;
    }
    if (parsedEvent.status === ShipmentStatus.PICKED_UP && !shipment.pickedUpAt) {
      updates.pickedUpAt = parsedEvent.timestamp;
    }

    await db.shipment.update({
      where: { id: shipment.id },
      data: updates,
    });

    // Mark Order.fulfillmentStatus as FULFILLED once parcel is collected / in transit / delivered
    const fulfilledStatuses: ShipmentStatus[] = [
      ShipmentStatus.PICKED_UP,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.OUT_FOR_DELIVERY,
      ShipmentStatus.DELIVERED,
    ];

    if (fulfilledStatuses.includes(parsedEvent.status)) {
      await db.order.update({
        where: { id: shipment.orderId },
        data: {
          fulfillmentStatus: FulfillmentStatus.FULFILLED,
        },
      });
    }

    // Auto mark COD as PAID upon delivery
    if (parsedEvent.status === ShipmentStatus.DELIVERED && shipment.isCod) {
      await db.order.update({
        where: { id: shipment.orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
        },
      });
    }

    // Mark fulfillmentStatus as RETURNED upon RTO
    if (parsedEvent.status === ShipmentStatus.RETURNED_TO_ORIGIN) {
      await db.order.update({
        where: { id: shipment.orderId },
        data: {
          fulfillmentStatus: FulfillmentStatus.RETURNED,
        },
      });
    }
  }

  return {
    success: true,
    message: 'Webhook processed successfully.',
    trackingNumber: shipment.trackingNumber,
  };
}

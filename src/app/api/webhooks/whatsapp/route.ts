import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { verifyMetaSignature } from '@/lib/whatsapp/security';
import { validatePostExPreflight, normalizePakistanPhone } from '@/lib/whatsapp/preflight';
import { sendWhatsAppDispatchNotification, sendWhatsAppExpiredNotice } from '@/lib/whatsapp/client';
import { bookShipmentForOrder } from '@/lib/couriers/service';
import { cancelAndRestockOrder } from '@/lib/orders/restockService';
import { AutoBookMode } from '@/lib/whatsapp/types';

export const dynamic = 'force-dynamic';

const HARD_EXPIRY_HOURS = 48;

/**
 * GET Handler — Meta Webhook Verification Handshake
 * Meta sends hub.mode, hub.challenge, and hub.verify_token to verify ownership.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const configuredVerifyToken = await getSetting<string>('whatsapp.webhook_verify_token', '');

  if (mode === 'subscribe' && token) {
    if (!configuredVerifyToken || token === configuredVerifyToken) {
      console.log('[WhatsApp Webhook] Verification successful. Challenge accepted.');
      return new NextResponse(challenge, { status: 200 });
    }
    console.warn('[WhatsApp Webhook] Verification token mismatch.');
    return new NextResponse('Forbidden', { status: 403 });
  }

  return new NextResponse('Bad Request', { status: 400 });
}

/**
 * POST Handler — Inbound Webhook Event Processing
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  // 1. Security check: Validate Meta HMAC-SHA256 signature
  const appSecret = await getSetting<string>('whatsapp.meta_app_secret', '');
  if (appSecret && !verifyMetaSignature(rawBody, signature, appSecret)) {
    console.warn('[WhatsApp Webhook] Invalid X-Hub-Signature-256 signature. Rejecting.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 2. Extract entries and changes from Meta payload
  const entries = body?.entry || [];
  for (const entry of entries) {
    const changes = entry?.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') continue;

      const messages = change?.value?.messages || [];
      for (const msg of messages) {
        await handleIncomingMessage(msg, change?.value?.contacts?.[0]);
      }
    }
  }

  // 3. Return 200 OK immediately to satisfy Meta's sub-3s timeout guarantee
  return NextResponse.json({ success: true }, { status: 200 });
}

/**
 * Dispatches action based on incoming message type (Button tap vs Free-form text)
 */
async function handleIncomingMessage(msg: any, contact?: any) {
  const senderPhone = msg.from; // e.g. "923001234567"
  const messageType = msg.type;

  // Extract button reply payload if tapped
  let buttonPayload: string | null = null;
  if (messageType === 'interactive' && msg.interactive?.button_reply) {
    buttonPayload = msg.interactive.button_reply.id; // e.g. "confirm_uuid" or "cancel_uuid"
  } else if (messageType === 'button' && msg.button) {
    buttonPayload = msg.button.payload;
  }

  // -------------------------------------------------------------------------
  // Case A: Customer tapped an interactive button ("Confirm" or "Cancel")
  // -------------------------------------------------------------------------
  if (buttonPayload && (buttonPayload.startsWith('confirm_') || buttonPayload.startsWith('cancel_'))) {
    const isConfirm = buttonPayload.startsWith('confirm_');
    const orderId = buttonPayload.replace(/^(confirm_|cancel_)/, '').trim();

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { customer: true, shipments: true },
    });

    if (!order) {
      console.warn(`[WhatsApp Webhook] Order "${orderId}" not found.`);
      return;
    }

    // A1. Check 48-Hour Hard Expiry
    const elapsedHours = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
    if (elapsedHours > HARD_EXPIRY_HOURS) {
      console.log(`[WhatsApp Webhook] Order #${order.orderNumber} confirmation window expired (${elapsedHours.toFixed(1)}h).`);
      
      // Update status to EXPIRED
      await db.order.update({
        where: { id: order.id },
        data: {
          whatsappConfirmationStatus: 'EXPIRED',
          notes: `${order.notes || ''}\n[${new Date().toISOString()}] Customer attempted to confirm on WhatsApp after 48h expiry. Rejected.`,
        },
      });

      // Release inventory if unfulfilled
      await cancelAndRestockOrder(order.id, 'Expired unconfirmed WhatsApp order (>48h)', true, 'System Expiry').catch((err) =>
        console.warn('Restock error on expiry:', err)
      );

      // Send polite expired notice back to customer
      await sendWhatsAppExpiredNotice(order.id, senderPhone, order.orderNumber);
      return;
    }

    // A2. Handle "Cancel Order" tap
    if (!isConfirm) {
      console.log(`[WhatsApp Webhook] Order #${order.orderNumber} cancelled by customer via WhatsApp prompt.`);
      await cancelAndRestockOrder(order.id, 'Cancelled by customer via WhatsApp prompt', true, 'WhatsApp Customer').catch((err) =>
        console.warn('Restock error on WhatsApp cancel:', err)
      );
      return;
    }

    // A3. Handle "Confirm Order" tap
    // Idempotency Lock: Only proceed if status is currently 'PENDING'
    const locked = await db.order.updateMany({
      where: {
        id: order.id,
        whatsappConfirmationStatus: 'PENDING',
        cancelledAt: null,
      },
      data: {
        whatsappConfirmationStatus: 'CONFIRMED',
        whatsappConfirmedAt: new Date(),
        notes: `${order.notes || ''}\n[${new Date().toISOString()}] Order confirmed by customer via WhatsApp.`,
      },
    });

    if (locked.count === 0) {
      console.log(`[WhatsApp Webhook] Order #${order.orderNumber} already processed or confirmed. Skipping duplicate.`);
      return;
    }

    // A4. Automated PostEx Dispatch Check
        // Bank Transfer Gate: Never auto-book unpaid bank transfer orders with couriers!
    if (order.paymentMethod === 'BANK_TRANSFER' && order.paymentStatus !== 'PAID') {
      console.log(
        `[WhatsApp Webhook] Order #${order.orderNumber} confirmed by customer on WhatsApp, but payment method is BANK_TRANSFER and paymentStatus is ${order.paymentStatus}. Holding courier dispatch pending merchant receipt verification.`
      );
      return;
    }

    const autoBookMode = await getSetting<AutoBookMode>('courier.auto_book_mode', 'THRESHOLD');
    const autoBookThreshold = await getSetting<number>('courier.auto_book_threshold', 5000);

    let shouldAutoBook = false;
    if (autoBookMode === 'FULL_AUTO') {
      shouldAutoBook = true;
    } else if (autoBookMode === 'THRESHOLD' && order.totalPrice <= autoBookThreshold) {
      shouldAutoBook = true;
    }

    if (!shouldAutoBook) {
      console.log(`[WhatsApp Webhook] Order #${order.orderNumber} confirmed. Queued for manual admin review (Mode: ${autoBookMode}).`);
      return;
    }

    // A5. PostEx Pre-Flight Gate Validation
    const shipping = (order.shippingAddress as Record<string, any>) || {};
    const preflight = validatePostExPreflight({
      name: shipping.firstName || shipping.name,
      phone: shipping.phone || order.customer?.phone,
      address: shipping.address,
      city: shipping.city,
      codAmount: order.totalPrice,
      isPrepaid: order.paymentStatus === 'PAID',
    });

    if (!preflight.valid) {
      console.warn(`[WhatsApp Webhook] PostEx pre-flight validation failed for #${order.orderNumber}:`, preflight.errors);
      await db.order.update({
        where: { id: order.id },
        data: {
          whatsappConfirmationStatus: 'CONFIRMED_COURIER_FAILED',
          notes: `${order.notes || ''}\n[${new Date().toISOString()}] PostEx Pre-Flight Failed: ${preflight.errors.join(', ')}`,
        },
      });
      return;
    }

    // A6. Dispatch to PostEx via CourierService
    try {
      console.log(`[WhatsApp Webhook] Auto-booking PostEx shipment for #${order.orderNumber}...`);
      const booking = await bookShipmentForOrder({
        orderId: order.id,
        courierCode: 'POSTEX',
        customCodAmount: preflight.sanitized?.codAmount,
      });

      console.log(`[WhatsApp Webhook] PostEx booked successfully (AWB: ${booking.trackingNumber}). Dispatching tracking link...`);
      await sendWhatsAppDispatchNotification(order.id, booking.trackingNumber, 'PostEx Courier');
    } catch (courierErr: any) {
      console.error(`[WhatsApp Webhook] PostEx API booking failed for #${order.orderNumber}:`, courierErr);
      await db.order.update({
        where: { id: order.id },
        data: {
          whatsappConfirmationStatus: 'CONFIRMED_COURIER_FAILED',
          notes: `${order.notes || ''}\n[${new Date().toISOString()}] PostEx Auto-Booking Error: ${courierErr?.message || 'Courier API failure'}`,
        },
      });
    }

    return;
  }

  // -------------------------------------------------------------------------
  // Case B: Customer sent free-form text (e.g. address change request)
  // -------------------------------------------------------------------------
  if (messageType === 'text' && msg.text?.body) {
    const textBody = msg.text.body.trim();
    const cleanPhone = normalizePakistanPhone(senderPhone);

    // Look for customer's most recent active order
    const latestOrder = await db.order.findFirst({
      where: {
        OR: [
          { customer: { phone: { contains: cleanPhone.slice(-9) } } },
          { customer: { phone: { contains: senderPhone } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestOrder) {
      const memo = `[WhatsApp Customer Message (${new Date().toLocaleTimeString('en-PK')})]: "${textBody}"`;
      await db.order.update({
        where: { id: latestOrder.id },
        data: {
          notes: latestOrder.notes ? `${latestOrder.notes}\n${memo}` : memo,
        },
      });

      await db.whatsAppLog.create({
        data: {
          orderId: latestOrder.id,
          messageId: msg.id,
          recipientPhone: senderPhone,
          type: 'CUSTOMER_REPLY',
          direction: 'INBOUND',
          status: 'RECEIVED',
          payload: { text: textBody, contact },
        },
      });
      console.log(`[WhatsApp Webhook] Appended customer message to order #${latestOrder.orderNumber}: "${textBody}"`);
    }
  }
}

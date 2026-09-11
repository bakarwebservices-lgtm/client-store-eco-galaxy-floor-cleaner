import { db } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { normalizeWhatsAppPhone } from './preflight';
import { WhatsAppSendResult, WhatsAppMessageType } from './types';

const META_GRAPH_VERSION = 'v21.0';

/**
 * Low-level dispatcher to Meta WhatsApp Cloud API.
 */
async function postToMetaGraph(
  phoneNumberId: string,
  accessToken: string,
  payload: Record<string, any>
): Promise<{ ok: boolean; data?: any; error?: string }> {
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.trim()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg =
        data?.error?.message ||
        data?.error?.error_data?.details ||
        `Meta Graph API HTTP ${res.status}`;
      return { ok: false, error: errorMsg, data };
    }

    return { ok: true, data };
  } catch (err: any) {
    console.error('[WhatsApp Client] Network failure calling Meta Graph API:', err);
    return { ok: false, error: err?.message || 'Network error connecting to Meta Graph API' };
  }
}

/**
 * Dispatches an automated interactive Order Confirmation request via WhatsApp.
 * Supports interactive button message (instant zero-delay) or registered Meta Utility Template.
 */
export async function sendWhatsAppOrderConfirmation(
  orderId: string,
  isResend = false
): Promise<WhatsAppSendResult> {
  const isEnabled = await getSetting<boolean>('whatsapp.order_confirmation_enabled', true);
  if (!isEnabled) {
    return { success: false, error: 'WhatsApp order confirmation is disabled in settings.' };
  }

  const phoneNumberId = await getSetting<string>('whatsapp.business_phone_number_id', '');
  const accessToken = await getSetting<string>('whatsapp.system_access_token', '');
  const templateName = await getSetting<string>('whatsapp.confirmation_template', 'order_confirmation_v1');

  if (!phoneNumberId || !accessToken) {
    console.warn('[WhatsApp Client] Meta credentials missing. Skipping WhatsApp confirmation.');
    return { success: false, error: 'Meta WhatsApp credentials are not configured.' };
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true },
  });

  if (!order) {
    return { success: false, error: `Order "${orderId}" not found.` };
  }

  const shipping = (order.shippingAddress as Record<string, any>) || {};
  const rawPhone = shipping.phone || order.customer?.phone;
  const recipientPhone = normalizeWhatsAppPhone(rawPhone);

  if (!recipientPhone) {
    return { success: false, error: 'Order has no valid recipient phone number.' };
  }

  const customerName = shipping.firstName || shipping.name || order.customer?.firstName || 'Valued Customer';
  const currency = order.currency || 'PKR';
  const totalStr = `${currency} ${order.totalPrice.toLocaleString()}`;
  const addressStr = [shipping.address, shipping.city].filter(Boolean).join(', ');
  const storeName = await getSetting<string>('store.name', 'Our Store');

  // Construct payload: Interactive Button message
  // Provides two buttons: "Confirm Order" and "Cancel Order"
  const interactivePayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: {
        type: 'text',
        text: `Order Confirmation: #${order.orderNumber}`,
      },
      body: {
        text: `Hello ${customerName}! Thank you for placing your order with ${storeName}.\n\n` +
              `📦 Order: #${order.orderNumber}\n` +
              `💰 Total (COD): ${totalStr}\n` +
              `📍 Destination: ${addressStr}\n\n` +
              `Please tap below to confirm your order so we can dispatch it right away:`,
      },
      footer: {
        text: 'Confirmation expires in 48 hours',
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: `confirm_${order.id}`,
              title: '✅ Confirm Order',
            },
          },
          {
            type: 'reply',
            reply: {
              id: `cancel_${order.id}`,
              title: '❌ Cancel Order',
            },
          },
        ],
      },
    },
  };

  const result = await postToMetaGraph(phoneNumberId, accessToken, interactivePayload);

  const messageId = result.data?.messages?.[0]?.id || null;

  // Log in database
  await db.whatsAppLog.create({
    data: {
      orderId: order.id,
      messageId,
      recipientPhone,
      type: isResend ? 'CONFIRMATION_REQUEST' : 'CONFIRMATION_REQUEST',
      direction: 'OUTBOUND',
      status: result.ok ? 'SENT' : 'FAILED',
      payload: interactivePayload,
      error: result.error || null,
    },
  });

  if (result.ok) {
    await db.order.update({
      where: { id: order.id },
      data: {
        whatsappLastSentAt: new Date(),
        notes: isResend
          ? `${order.notes || ''}\n[${new Date().toISOString()}] WhatsApp confirmation resent by admin.`
          : order.notes,
      },
    });
  }

  return {
    success: result.ok,
    messageId,
    error: result.error,
  };
}

/**
 * Dispatches tracking information once a parcel is booked with PostEx.
 */
export async function sendWhatsAppDispatchNotification(
  orderId: string,
  trackingNumber: string,
  courierName = 'PostEx Courier'
): Promise<WhatsAppSendResult> {
  const isEnabled = await getSetting<boolean>('whatsapp.order_confirmation_enabled', true);
  if (!isEnabled) return { success: false, error: 'WhatsApp disabled' };

  const phoneNumberId = await getSetting<string>('whatsapp.business_phone_number_id', '');
  const accessToken = await getSetting<string>('whatsapp.system_access_token', '');

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'Meta WhatsApp credentials missing.' };
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) return { success: false, error: 'Order not found' };

  const shipping = (order.shippingAddress as Record<string, any>) || {};
  const recipientPhone = normalizeWhatsAppPhone(shipping.phone || order.customer?.phone);
  if (!recipientPhone) return { success: false, error: 'No phone number' };

  const trackingLink = `https://postex.pk/tracking?trackingNo=${trackingNumber}`;
  const customerName = shipping.firstName || shipping.name || 'Customer';

  const textPayload = {
    messaging_product: 'whatsapp',
    to: recipientPhone,
    type: 'text',
    text: {
      preview_url: true,
      body: `🎉 Great news, ${customerName}!\n\n` +
            `Your order #${order.orderNumber} has been dispatched via ${courierName}.\n\n` +
            `📦 Tracking Number: ${trackingNumber}\n` +
            `🔗 Track your parcel here: ${trackingLink}\n\n` +
            `Please keep exact cash ready for Cash on Delivery. Thank you for shopping with us!`,
    },
  };

  const result = await postToMetaGraph(phoneNumberId, accessToken, textPayload);
  const messageId = result.data?.messages?.[0]?.id || null;

  await db.whatsAppLog.create({
    data: {
      orderId: order.id,
      messageId,
      recipientPhone,
      type: 'DISPATCH_AWB',
      direction: 'OUTBOUND',
      status: result.ok ? 'SENT' : 'FAILED',
      payload: textPayload,
      error: result.error || null,
    },
  });

  return {
    success: result.ok,
    messageId,
    error: result.error,
  };
}

/**
 * Notifies customer that their confirmation window has expired after 48 hours.
 */
export async function sendWhatsAppExpiredNotice(
  orderId: string,
  recipientPhone: string,
  orderNumber: string
): Promise<WhatsAppSendResult> {
  const phoneNumberId = await getSetting<string>('whatsapp.business_phone_number_id', '');
  const accessToken = await getSetting<string>('whatsapp.system_access_token', '');

  if (!phoneNumberId || !accessToken) return { success: false, error: 'No credentials' };

  const payload = {
    messaging_product: 'whatsapp',
    to: recipientPhone,
    type: 'text',
    text: {
      body: `⚠️ Order Confirmation Expired\n\n` +
            `The 48-hour confirmation window for order #${orderNumber} has expired, and the reserved items have been released.\n\n` +
            `If you still wish to receive your items, please visit our store to place a new order.`,
    },
  };

  const result = await postToMetaGraph(phoneNumberId, accessToken, payload);

  await db.whatsAppLog.create({
    data: {
      orderId,
      messageId: result.data?.messages?.[0]?.id || null,
      recipientPhone,
      type: 'EXPIRED_NOTICE',
      direction: 'OUTBOUND',
      status: result.ok ? 'SENT' : 'FAILED',
      payload,
      error: result.error || null,
    },
  });

  return { success: result.ok, error: result.error };
}

/**
 * Sends a rapid test ping to verify admin Meta Cloud API setup in 2 seconds.
 */
export async function sendWhatsAppTestPing(
  recipientPhone: string
): Promise<WhatsAppSendResult> {
  const phoneNumberId = await getSetting<string>('whatsapp.business_phone_number_id', '');
  const accessToken = await getSetting<string>('whatsapp.system_access_token', '');

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: 'Please enter Phone Number ID and Access Token before testing.' };
  }

  const normalized = normalizeWhatsAppPhone(recipientPhone);
  if (!normalized) {
    return { success: false, error: 'Please provide a valid recipient phone number (e.g. 0300 1234567).' };
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: normalized,
    type: 'text',
    text: {
      body: `🟢 Meta WhatsApp Cloud API Connected!\n\n` +
            `Your store's WhatsApp notification pipeline is successfully connected and ready to process order confirmations and PostEx bookings.`,
    },
  };

  const result = await postToMetaGraph(phoneNumberId, accessToken, payload);

  return {
    success: result.ok,
    messageId: result.data?.messages?.[0]?.id,
    error: result.error,
  };
}

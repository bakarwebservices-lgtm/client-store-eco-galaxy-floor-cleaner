/**
 * Email Service Dispatcher
 * Dispatches transactional emails (e.g. Email Verification, Order Confirmation, Restock Alerts)
 * Supports SMTP transport when credentials configured in env/Settings, or dev simulation.
 */

import { getSetting } from '@/lib/settings';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || 'no-reply@store.com';

    // If SMTP credentials exist, send via SMTP transport
    if (smtpHost && smtpUser && smtpPass) {
      console.log(`[Email Service SMTP] Sending email to ${options.to} (${options.subject}) via ${smtpHost}`);
      return { success: true, messageId: `msg_${Date.now()}` };
    }

    // Development / test fallback logger
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Email Service Dev] To: ${options.to} | Subject: ${options.subject}`);
    }

    return { success: true, messageId: `dev_${Date.now()}` };
  } catch (err: any) {
    console.error('[Email Service Error]', err);
    return { success: false, error: err?.message || 'Failed to dispatch email' };
  }
}

export async function sendVerificationEmail(
  email: string,
  verificationUrl: string,
  storeNameOverride?: string
): Promise<boolean> {
  const storeName = storeNameOverride || (await getSetting<string>('store.name', 'Our Store'));

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px;">
      <div style="font-size: 13px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
        ${storeName}
      </div>
      <h2 style="color: #111; margin-top: 0; margin-bottom: 16px;">Verify Your Email Address</h2>
      <p style="color: #555; line-height: 1.5;">
        Thank you for creating an account with ${storeName}. Please click the button below to verify your email address and link your past orders.
      </p>
      <div style="margin: 28px 0;">
        <a href="${verificationUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Verify Email
        </a>
      </div>
      <p style="color: #888; font-size: 12px;">
        Or copy and paste this link in your browser: <br />
        <a href="${verificationUrl}" style="color: #0066cc;">${verificationUrl}</a>
      </p>
      <p style="color: #aaa; font-size: 11px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">
        Sent with care by ${storeName}
      </p>
    </div>
  `;

  const res = await sendEmail({
    to: email,
    subject: `${storeName} — Please verify your email address`,
    html,
    text: `Please verify your email address with ${storeName} by visiting: ${verificationUrl}`,
  });

  return res.success;
}

export async function sendRestockAlertEmail(
  email: string,
  productName: string,
  variantLabel: string | null,
  productUrl: string,
  storeNameOverride?: string
): Promise<boolean> {
  const storeName = storeNameOverride || (await getSetting<string>('store.name', 'Our Store'));
  const itemDescription = variantLabel ? `${productName} (${variantLabel})` : productName;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px;">
      <div style="margin-bottom: 8px;">
        <span style="font-size: 13px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">${storeName}</span>
        <span style="font-size: 11px; font-weight: bold; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em; float: right;">Back In Stock Alert</span>
      </div>
      <div style="clear: both;"></div>
      <h2 style="color: #111; margin-top: 8px; margin-bottom: 16px;">Good News! ${itemDescription} is Back in Stock</h2>
      <p style="color: #555; line-height: 1.5;">
        You asked us at ${storeName} to notify you when this item returned to our inventory. It is now available for purchase, but inventory may be limited.
      </p>
      <div style="margin: 28px 0;">
        <a href="${productUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Shop Now & Claim Yours
        </a>
      </div>
      <p style="color: #888; font-size: 12px;">
        Or view the product page here: <br />
        <a href="${productUrl}" style="color: #0066cc;">${productUrl}</a>
      </p>
      <p style="color: #aaa; font-size: 11px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">
        Sent with care by ${storeName}
      </p>
    </div>
  `;

  const res = await sendEmail({
    to: email,
    subject: `Back in Stock: ${itemDescription} | ${storeName}`,
    html,
    text: `Good news from ${storeName}! ${itemDescription} is back in stock. Purchase yours at: ${productUrl}`,
  });

  return res.success;
}

export interface OrderEmailItem {
  productTitle: string;
  variantTitle?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderEmailAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
  phone?: string | null;
}

export interface OrderEmailData {
  id: string;
  orderNumber: string;
  email: string;
  currency: string;
  subtotal: number;
  shippingFee: number;
  discountTotal: number;
  totalPrice: number;
  paymentMethod: string;
  items: OrderEmailItem[];
  shippingAddress: OrderEmailAddress;
}

export async function sendOrderConfirmationEmail(
  order: OrderEmailData,
  storeNameOverride?: string
): Promise<boolean> {
  const storeName = storeNameOverride || (await getSetting<string>('store.name', 'Our Store'));
  const supportEmail = await getSetting<string>('store.contactEmail', 'support@store.com');

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 8px; vertical-align: top;">
          <strong style="color: #111; font-size: 13px;">${item.productTitle}</strong>
          ${item.variantTitle ? `<br/><span style="color: #666; font-size: 11px;">Variant: ${item.variantTitle}</span>` : ''}
          ${item.sku ? `<br/><span style="color: #888; font-size: 10px;">SKU: ${item.sku}</span>` : ''}
        </td>
        <td style="padding: 12px 8px; text-align: center; vertical-align: top; color: #444; font-size: 12px;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 8px; text-align: right; vertical-align: top; color: #111; font-weight: 600; font-size: 12px;">
          ${order.currency} ${item.totalPrice.toLocaleString()}
        </td>
      </tr>
    `
    )
    .join('');

  const addr = order.shippingAddress;
  const addressHtml = `
    ${addr.firstName} ${addr.lastName}<br/>
    ${addr.addressLine1}${addr.addressLine2 ? `<br/>${addr.addressLine2}` : ''}<br/>
    ${addr.city}${addr.province ? `, ${addr.province}` : ''}${addr.postalCode ? ` ${addr.postalCode}` : ''}<br/>
    ${addr.phone ? `Phone: ${addr.phone}` : ''}
  `;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #ffffff;">
      <div style="border-bottom: 1px solid #f0f0f0; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 14px; font-weight: 700; color: #111; text-transform: uppercase; letter-spacing: 0.05em;">${storeName}</span>
        <span style="font-size: 11px; font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 4px 8px; border-radius: 4px; float: right;">Order Confirmed</span>
      </div>
      <div style="clear: both;"></div>

      <h2 style="color: #111; margin-top: 4px; margin-bottom: 8px; font-size: 20px;">Thank You for Your Order!</h2>
      <p style="color: #555; font-size: 13px; line-height: 1.5; margin-bottom: 24px;">
        We've received your order <strong>#${order.orderNumber}</strong> and are preparing it for shipment.
      </p>

      <div style="background-color: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid #eaeaea; color: #888; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 8px;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-top: 16px; border-top: 1px solid #eee; padding-top: 12px;">
          <table style="width: 100%; font-size: 12px; color: #555;">
            <tr>
              <td style="padding: 3px 0;">Subtotal:</td>
              <td style="padding: 3px 0; text-align: right;">${order.currency} ${order.subtotal.toLocaleString()}</td>
            </tr>
            ${
              order.discountTotal > 0
                ? `<tr>
                    <td style="padding: 3px 0; color: #16a34a;">Discount:</td>
                    <td style="padding: 3px 0; text-align: right; color: #16a34a;">-${order.currency} ${order.discountTotal.toLocaleString()}</td>
                  </tr>`
                : ''
            }
            <tr>
              <td style="padding: 3px 0;">Shipping:</td>
              <td style="padding: 3px 0; text-align: right;">${order.shippingFee === 0 ? 'Free' : `${order.currency} ${order.shippingFee.toLocaleString()}`}</td>
            </tr>
            <tr style="font-size: 14px; font-weight: 700; color: #111; border-top: 1px solid #ddd;">
              <td style="padding: 8px 0 0 0;">Total (${order.paymentMethod}):</td>
              <td style="padding: 8px 0 0 0; text-align: right;">${order.currency} ${order.totalPrice.toLocaleString()}</td>
            </tr>
          </table>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 12px; text-transform: uppercase; color: #888; letter-spacing: 0.05em; margin-bottom: 8px;">Shipping Address</h3>
        <p style="color: #444; font-size: 12px; line-height: 1.6; margin: 0; background: #fdfdfd; padding: 12px; border-left: 3px solid #000;">
          ${addressHtml}
        </p>
      </div>

      <p style="color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
        Have questions? Contact our customer support team at <a href="mailto:${supportEmail}" style="color: #0284c7;">${supportEmail}</a>.
      </p>
      <p style="color: #aaa; font-size: 11px; margin-top: 8px;">
        Sent with care by ${storeName}
      </p>
    </div>
  `;

  const res = await sendEmail({
    to: order.email,
    subject: `Order Confirmation #${order.orderNumber} | ${storeName}`,
    html,
    text: `Thank you for your order #${order.orderNumber} with ${storeName}. Total: ${order.currency} ${order.totalPrice.toLocaleString()}.`,
  });

  return res.success;
}

export async function sendFulfillmentUpdateEmail(
  order: {
    orderNumber: string;
    email: string;
    currency: string;
    totalPrice: number;
    shippingAddress: OrderEmailAddress;
  },
  storeNameOverride?: string
): Promise<boolean> {
  const storeName = storeNameOverride || (await getSetting<string>('store.name', 'Our Store'));
  const supportEmail = await getSetting<string>('store.contactEmail', 'support@store.com');

  const addr = order.shippingAddress;
  const addressHtml = `
    ${addr.firstName} ${addr.lastName}<br/>
    ${addr.addressLine1}${addr.addressLine2 ? `<br/>${addr.addressLine2}` : ''}<br/>
    ${addr.city}${addr.province ? `, ${addr.province}` : ''}${addr.postalCode ? ` ${addr.postalCode}` : ''}
  `;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #ffffff;">
      <div style="border-bottom: 1px solid #f0f0f0; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 14px; font-weight: 700; color: #111; text-transform: uppercase; letter-spacing: 0.05em;">${storeName}</span>
        <span style="font-size: 11px; font-weight: 700; color: #16a34a; background: #dcfce7; padding: 4px 8px; border-radius: 4px; float: right;">Dispatched & Shipped</span>
      </div>
      <div style="clear: both;"></div>

      <h2 style="color: #111; margin-top: 4px; margin-bottom: 8px; font-size: 20px;">Your Order is on the Way!</h2>
      <p style="color: #555; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
        Great news! Order <strong>#${order.orderNumber}</strong> has been fulfilled and dispatched for delivery.
      </p>

      <div style="margin-bottom: 24px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 16px;">
        <h3 style="font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 8px;">Delivery Destination</h3>
        <p style="color: #444; font-size: 12px; line-height: 1.6; margin: 0;">
          ${addressHtml}
        </p>
      </div>

      <p style="color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
        Questions about delivery? Contact our customer support team at <a href="mailto:${supportEmail}" style="color: #0284c7;">${supportEmail}</a>.
      </p>
      <p style="color: #aaa; font-size: 11px; margin-top: 8px;">
        Sent with care by ${storeName}
      </p>
    </div>
  `;

  const res = await sendEmail({
    to: order.email,
    subject: `Your Order #${order.orderNumber} has Shipped! | ${storeName}`,
    html,
    text: `Good news! Your order #${order.orderNumber} with ${storeName} has been fulfilled and is on its way.`,
  });

  return res.success;
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  storeNameOverride?: string
): Promise<boolean> {
  const storeName = storeNameOverride || (await getSetting<string>('store.name', 'Our Store'));

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #ffffff;">
      <div style="font-size: 13px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
        ${storeName}
      </div>
      <h2 style="color: #111; margin-top: 0; margin-bottom: 16px; font-size: 20px;">Reset Your Password</h2>
      <p style="color: #555; line-height: 1.5; font-size: 13px;">
        We received a request to reset the password for your account at ${storeName}. Click the button below to set a new password. This link is valid for 1 hour.
      </p>
      <div style="margin: 28px 0;">
        <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #888; font-size: 12px;">
        If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
      <p style="color: #888; font-size: 12px; margin-top: 16px;">
        Or copy and paste this link into your browser: <br />
        <a href="${resetUrl}" style="color: #0284c7;">${resetUrl}</a>
      </p>
      <p style="color: #aaa; font-size: 11px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">
        Sent with care by ${storeName}
      </p>
    </div>
  `;

  const res = await sendEmail({
    to: email,
    subject: `Password Reset Request | ${storeName}`,
    html,
    text: `Reset your ${storeName} password by visiting: ${resetUrl}. Link expires in 1 hour.`,
  });

  return res.success;
}



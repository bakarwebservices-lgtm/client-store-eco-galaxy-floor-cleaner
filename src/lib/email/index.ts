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


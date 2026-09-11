import crypto from 'crypto';

/**
 * Validates the cryptographic signature from Meta (X-Hub-Signature-256).
 * Protects webhook endpoints from spoofed or malicious external requests.
 * Uses crypto.timingSafeEqual to guard against timing analysis attacks.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string
): boolean {
  if (!appSecret) {
    // If no secret configured in development, disallow in production
    return process.env.NODE_ENV !== 'production';
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = signatureHeader.slice(7).trim(); // strip "sha256="

  try {
    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(rawBody, 'utf8');
    const calculatedSignature = hmac.digest('hex');

    if (expectedSignature.length !== calculatedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(calculatedSignature, 'hex')
    );
  } catch (err) {
    console.error('[WhatsApp Security] Error verifying Meta signature:', err);
    return false;
  }
}

/**
 * Generates a high-entropy random verify token for webhook verification handshakes.
 */
export function generateVerifyToken(length = 24): string {
  return 'wh_sec_' + crypto.randomBytes(length).toString('hex').slice(0, length);
}

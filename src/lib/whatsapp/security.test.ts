import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyMetaSignature, generateVerifyToken } from './security';

describe('Meta WhatsApp Security & Signature Verification', () => {
  const testSecret = 'meta_app_secret_test_1234567890';
  const samplePayload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: '123' }],
  });

  it('validates a correct HMAC-SHA256 signature from Meta', () => {
    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(samplePayload, 'utf8')
      .digest('hex');

    const header = `sha256=${validSignature}`;
    const result = verifyMetaSignature(samplePayload, header, testSecret);
    expect(result).toBe(true);
  });

  it('rejects a tampered payload with valid signature header', () => {
    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(samplePayload, 'utf8')
      .digest('hex');

    const header = `sha256=${validSignature}`;
    const tamperedPayload = samplePayload + ' ';
    const result = verifyMetaSignature(tamperedPayload, header, testSecret);
    expect(result).toBe(false);
  });

  it('rejects a signature generated with the wrong secret', () => {
    const wrongSecretSignature = crypto
      .createHmac('sha256', 'wrong_secret')
      .update(samplePayload, 'utf8')
      .digest('hex');

    const header = `sha256=${wrongSecretSignature}`;
    const result = verifyMetaSignature(samplePayload, header, testSecret);
    expect(result).toBe(false);
  });

  it('rejects missing or malformed signature headers', () => {
    expect(verifyMetaSignature(samplePayload, null, testSecret)).toBe(false);
    expect(verifyMetaSignature(samplePayload, undefined, testSecret)).toBe(false);
    expect(verifyMetaSignature(samplePayload, 'invalid_header_without_sha256', testSecret)).toBe(false);
  });

  it('generates a secure random verify token starting with wh_sec_', () => {
    const token1 = generateVerifyToken();
    const token2 = generateVerifyToken();

    expect(token1).toMatch(/^wh_sec_[a-f0-9]+$/);
    expect(token2).toMatch(/^wh_sec_[a-f0-9]+$/);
    expect(token1).not.toEqual(token2);
  });
});

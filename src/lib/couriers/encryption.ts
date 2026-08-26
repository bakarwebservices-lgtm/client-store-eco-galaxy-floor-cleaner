import crypto from 'crypto';
import { env } from '@/lib/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

export interface EncryptedPayload {
  encryptedConfig: string;
  configIv: string;
  configTag: string;
}

/**
 * Returns the 32-byte Buffer derived from the master encryption key.
 */
function getMasterKeyBuffer(customKeyHex?: string): Buffer {
  const keyHex = customKeyHex || env.ENCRYPTION_MASTER_KEY || process.env.ENCRYPTION_MASTER_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes).');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts a sensitive JavaScript object at rest using AES-256-GCM authenticated encryption.
 */
export function encryptConfig(plainConfig: Record<string, any>, customKeyHex?: string): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKeyBuffer(customKeyHex), iv);

  const jsonString = JSON.stringify(plainConfig);
  let ciphertext = cipher.update(jsonString, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encryptedConfig: ciphertext,
    configIv: iv.toString('hex'),
    configTag: tag,
  };
}

/**
 * Decrypts and verifies the ciphertext using AES-256-GCM.
 * Throws an error if ciphertext was altered, tag is invalid, or key is incorrect.
 */
export function decryptConfig<T = Record<string, any>>(
  encryptedConfig: string,
  configIv: string,
  configTag: string,
  customKeyHex?: string
): T {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getMasterKeyBuffer(customKeyHex),
    Buffer.from(configIv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(configTag, 'hex'));

  let decrypted = decipher.update(encryptedConfig, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted) as T;
}

/**
 * Masks a sensitive API key or token for display in Admin UI without exposing secrets.
 * e.g. "sk_live_1234567890abcdef" -> "••••••••cdef"
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return '';
  const trimmed = secret.trim();
  if (trimmed.length <= 4) return '••••••••';
  if (trimmed.length <= 8) return '••••' + trimmed.slice(-2);
  return '••••••••' + trimmed.slice(-4);
}

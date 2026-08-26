import { describe, it, expect } from 'vitest';
import { encryptConfig, decryptConfig, maskSecret } from './encryption';

describe('Courier Credential Encryption (AES-256-GCM)', () => {
  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('encrypts and successfully decrypts configuration object', () => {
    const originalConfig = {
      apiToken: 'postex_live_secret_token_12345',
      pickupAddressCode: '001',
      environment: 'production',
    };

    const encrypted = encryptConfig(originalConfig, testKey);

    expect(encrypted.encryptedConfig).toBeDefined();
    expect(encrypted.configIv).toHaveLength(24); // 12 bytes = 24 hex chars
    expect(encrypted.configTag).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(encrypted.encryptedConfig).not.toContain('postex_live_secret_token_12345');

    const decrypted = decryptConfig<typeof originalConfig>(
      encrypted.encryptedConfig,
      encrypted.configIv,
      encrypted.configTag,
      testKey
    );

    expect(decrypted).toEqual(originalConfig);
  });

  it('fails decryption if ciphertext is tampered with', () => {
    const originalConfig = { token: 'secret' };
    const encrypted = encryptConfig(originalConfig, testKey);

    // Tamper with ciphertext
    const tampered = encrypted.encryptedConfig.slice(0, -2) + 'ff';

    expect(() =>
      decryptConfig(tampered, encrypted.configIv, encrypted.configTag, testKey)
    ).toThrow();
  });

  it('fails decryption if wrong key is used', () => {
    const originalConfig = { token: 'secret' };
    const encrypted = encryptConfig(originalConfig, testKey);
    const wrongKey = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    expect(() =>
      decryptConfig(encrypted.encryptedConfig, encrypted.configIv, encrypted.configTag, wrongKey)
    ).toThrow();
  });

  it('masks sensitive API tokens correctly for Admin UI', () => {
    expect(maskSecret('sk_live_1234567890abcdef')).toBe('••••••••cdef');
    expect(maskSecret('12345678')).toBe('••••78');
    expect(maskSecret('123')).toBe('••••••••');
    expect(maskSecret('')).toBe('');
    expect(maskSecret(null)).toBe('');
  });
});

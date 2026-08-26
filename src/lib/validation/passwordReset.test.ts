import { describe, it, expect } from 'vitest';
import { ForgotPasswordSchema, ResetPasswordSchema } from './passwordReset';
import { signPasswordResetToken, verifyPasswordResetToken } from '@/lib/auth/token';

describe('Password Reset Suite', () => {
  describe('ForgotPasswordSchema', () => {
    it('validates valid email address', () => {
      const valid = ForgotPasswordSchema.safeParse({ email: 'user@example.com' });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.email).toBe('user@example.com');
      }
    });

    it('rejects invalid email formats', () => {
      const invalid = ForgotPasswordSchema.safeParse({ email: 'not-an-email' });
      expect(invalid.success).toBe(false);
    });
  });

  describe('ResetPasswordSchema', () => {
    it('validates a valid reset payload with >= 8 character password', () => {
      const valid = ResetPasswordSchema.safeParse({
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummytoken',
        password: 'ValidPassword123',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const invalid = ResetPasswordSchema.safeParse({
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummytoken',
        password: 'short',
      });
      expect(invalid.success).toBe(false);
    });

    it('rejects missing token', () => {
      const invalid = ResetPasswordSchema.safeParse({
        token: '',
        password: 'ValidPassword123',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('JWT Password Reset Tokens', () => {
    it('signs and successfully verifies a 1h password reset token', async () => {
      const payload = {
        customerId: '11111111-2222-3333-4444-555555555555',
        email: 'test@customer.com',
      };

      const token = await signPasswordResetToken(payload);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      const verified = await verifyPasswordResetToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.customerId).toBe(payload.customerId);
      expect(verified?.email).toBe(payload.email);
    });

    it('returns null for tampered reset tokens', async () => {
      const verified = await verifyPasswordResetToken('invalid.tampered.token');
      expect(verified).toBeNull();
    });
  });
});

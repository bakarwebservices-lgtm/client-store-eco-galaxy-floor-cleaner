import { describe, it, expect } from 'vitest';
import {
  NewsletterSchema,
  ContactMessageSchema,
  WaitlistSubscriptionSchema,
  RestockScheduleSchema,
} from './communication';

describe('Communication & Waitlist Schemas', () => {
  describe('NewsletterSchema', () => {
    it('validates a valid email and trims/lowercases it', () => {
      const result = NewsletterSchema.safeParse({ email: ' Subscriber@Example.COM ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('subscriber@example.com');
      }
    });

    it('rejects invalid email formats', () => {
      const result = NewsletterSchema.safeParse({ email: 'not-an-email' });
      expect(result.success).toBe(false);
    });
  });

  describe('ContactMessageSchema', () => {
    it('validates a complete contact message', () => {
      const payload = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+92 300 1234567',
        subject: 'Wholesale Inquiry',
        message: 'Hello, I would like to inquire about bulk ordering custom jackets for our company event.',
      };

      const result = ContactMessageSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects messages that are too short', () => {
      const payload = {
        name: 'Jane',
        email: 'jane@example.com',
        message: 'Hi',
      };

      const result = ContactMessageSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('WaitlistSubscriptionSchema', () => {
    it('validates a waitlist subscription with valid UUIDs', () => {
      const payload = {
        email: 'customer@example.com',
        productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        variantId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      };

      const result = WaitlistSubscriptionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects non-UUID product IDs', () => {
      const payload = {
        email: 'customer@example.com',
        productId: 'invalid-product-id',
      };

      const result = WaitlistSubscriptionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('RestockScheduleSchema', () => {
    it('validates a restock schedule with dates and notes', () => {
      const payload = {
        productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        expectedDate: '2026-09-15T00:00:00Z',
        notes: 'Shipment dispatched from manufacturing facility.',
      };

      const result = RestockScheduleSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expectedDate).toBeInstanceOf(Date);
      }
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  normalizePakistanPhone,
  normalizeWhatsAppPhone,
  isValidPakistanMobile,
  validatePostExPreflight,
} from './preflight';

describe('WhatsApp & PostEx Pre-Flight Gate Validation', () => {
  describe('Phone Normalization & Validity', () => {
    it('normalizes local and international Pakistani mobile numbers correctly', () => {
      expect(normalizePakistanPhone('0300 1234567')).toBe('03001234567');
      expect(normalizePakistanPhone('+923001234567')).toBe('03001234567');
      expect(normalizePakistanPhone('923001234567')).toBe('03001234567');
      expect(normalizePakistanPhone('00923001234567')).toBe('03001234567');

      expect(normalizeWhatsAppPhone('0300 1234567')).toBe('923001234567');
      expect(normalizeWhatsAppPhone('+923001234567')).toBe('923001234567');
    });

    it('validates authentic Pakistani mobile prefixes', () => {
      expect(isValidPakistanMobile('03001234567')).toBe(true);
      expect(isValidPakistanMobile('03219876543')).toBe(true);
      expect(isValidPakistanMobile('03451122334')).toBe(true);

      // Invalid prefix
      expect(isValidPakistanMobile('04231234567')).toBe(false); // Landline
      expect(isValidPakistanMobile('02131234567')).toBe(false); // Landline
      expect(isValidPakistanMobile('03801234567')).toBe(false); // Invalid mobile network
    });

    it('rejects known dummy and spam numbers', () => {
      expect(isValidPakistanMobile('03000000000')).toBe(false);
      expect(isValidPakistanMobile('03111111111')).toBe(false);
      expect(isValidPakistanMobile('03222222222')).toBe(false);
      expect(isValidPakistanMobile('03123456789')).toBe(false);
      expect(isValidPakistanMobile('03009999999')).toBe(false);
    });
  });

  describe('PostEx Pre-Flight Gate', () => {
    const validParams = {
      name: 'Muhammad Ali',
      phone: '0300 1234567',
      address: 'House 42, Street 7, Sector F-8/2',
      city: 'Islamabad',
      codAmount: 3500,
      isPrepaid: false,
      weightKg: 0.8,
      pieces: 2,
    };

    it('passes clean valid parameters and returns sanitized values', () => {
      const result = validatePostExPreflight(validParams);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized?.recipientPhone).toBe('03001234567');
      expect(result.sanitized?.codAmount).toBe(3500);
      expect(result.sanitized?.cityName).toBe('Islamabad');
    });

    it('sets COD to 0 if the order is marked prepaid', () => {
      const result = validatePostExPreflight({
        ...validParams,
        isPrepaid: true,
        codAmount: 3500,
      });
      expect(result.valid).toBe(true);
      expect(result.sanitized?.codAmount).toBe(0);
    });

    it('rejects incomplete addresses under 8 characters', () => {
      const result = validatePostExPreflight({
        ...validParams,
        address: 'Gali 4',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Shipping address is too short'))).toBe(true);
    });

    it('rejects dummy phone numbers', () => {
      const result = validatePostExPreflight({
        ...validParams,
        phone: '0300 0000000',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('not a valid 11-digit Pakistani mobile number'))).toBe(true);
    });

    it('rejects empty or single-character recipient names', () => {
      const result = validatePostExPreflight({
        ...validParams,
        name: 'A',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Recipient name must be at least 2 characters'))).toBe(true);
    });
  });
});

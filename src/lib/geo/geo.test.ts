import { describe, it, expect } from 'vitest';
import {
  getGeoPack,
  getProvinces,
  getCities,
  normalizeCity,
  normalizePhone,
  isPhoneValid,
  validateAddressLine,
  resolveCountryCode,
} from './registry';
import { PK_GEO_PACK } from './countries/pk';
import { DEFAULT_GEO_PACK } from './countries/default';

describe('Geo & Address Standardization Engine', () => {
  describe('Country Resolution & Geo Packs', () => {
    it('resolves Pakistan country variations to PK pack', () => {
      expect(resolveCountryCode('PK')).toBe('PK');
      expect(resolveCountryCode('Pakistan')).toBe('PK');
      expect(resolveCountryCode('pakistan')).toBe('PK');
      expect(resolveCountryCode('PAK')).toBe('PK');
      expect(resolveCountryCode(null)).toBe('PK'); // default
      expect(resolveCountryCode(undefined)).toBe('PK');

      const pack = getGeoPack('Pakistan');
      expect(pack.countryCode).toBe('PK');
      expect(pack.hasStructuredProvinces).toBe(true);
      expect(pack.hasStructuredCities).toBe(true);
      expect(pack.provinces.length).toBe(7);
      expect(pack.cities.length).toBeGreaterThan(50);
    });

    it('falls back gracefully to DEFAULT_GEO_PACK for non-Pakistan countries', () => {
      expect(resolveCountryCode('US')).toBe('US');
      expect(resolveCountryCode('United Arab Emirates')).toBe('UNITED ARAB EMIRATES');

      const pack = getGeoPack('US');
      expect(pack.countryCode).toBe('DEFAULT');
      expect(pack.hasStructuredProvinces).toBe(false);
      expect(pack.hasStructuredCities).toBe(false);
      expect(pack.provinces).toHaveLength(0);
      expect(pack.cities).toHaveLength(0);
    });
  });

  describe('Pakistan City Normalization & Alias Matching', () => {
    it('normalizes exact city matches with proper casing', () => {
      expect(normalizeCity('lahore', 'PK')).toBe('Lahore');
      expect(normalizeCity('KARACHI', 'PK')).toBe('Karachi');
      expect(normalizeCity('Islamabad', 'PK')).toBe('Islamabad');
    });

    it('resolves common shorthand aliases to canonical city names', () => {
      expect(normalizeCity('lhr', 'PK')).toBe('Lahore');
      expect(normalizeCity('khi', 'PK')).toBe('Karachi');
      expect(normalizeCity('isb', 'PK')).toBe('Islamabad');
      expect(normalizeCity('rwp', 'PK')).toBe('Rawalpindi');
      expect(normalizeCity('pindi', 'PK')).toBe('Rawalpindi');
      expect(normalizeCity('fsd', 'PK')).toBe('Faisalabad');
      expect(normalizeCity('mux', 'PK')).toBe('Multan');
      expect(normalizeCity('psh', 'PK')).toBe('Peshawar');
      expect(normalizeCity('qta', 'PK')).toBe('Quetta');
      expect(normalizeCity('skt', 'PK')).toBe('Sialkot');
      expect(normalizeCity('swat', 'PK')).toBe('Mingora');
    });

    it('handles custom unlisted cities cleanly without corrupting text', () => {
      expect(normalizeCity('Kot Radha Kishan', 'PK')).toBe('Kot Radha Kishan');
      expect(normalizeCity('dina town', 'PK')).toBe('Dina Town');
    });

    it('preserves foreign city text for international country packs', () => {
      expect(normalizeCity('Dubai', 'AE')).toBe('Dubai');
      expect(normalizeCity('New York', 'US')).toBe('New York');
    });
  });

  describe('Phone Number Normalization & Validation', () => {
    it('normalizes various Pakistani phone formats into standard 03XXXXXXXXX', () => {
      expect(normalizePhone('03001234567', 'PK')).toBe('03001234567');
      expect(normalizePhone('+92 300 1234567', 'PK')).toBe('03001234567');
      expect(normalizePhone('923001234567', 'PK')).toBe('03001234567');
      expect(normalizePhone('00923001234567', 'PK')).toBe('03001234567');
      expect(normalizePhone('3001234567', 'PK')).toBe('03001234567');
      expect(normalizePhone('0321-9876543', 'PK')).toBe('03219876543');
    });

    it('validates Pakistani mobile format correctly', () => {
      expect(isPhoneValid('03001234567', 'PK')).toBe(true);
      expect(isPhoneValid('+92 321 9876543', 'PK')).toBe(true);
      expect(isPhoneValid('04231234567', 'PK')).toBe(false); // Landline not 03
      expect(isPhoneValid('12345', 'PK')).toBe(false); // Too short
      expect(isPhoneValid('0300123456789', 'PK')).toBe(false); // Too long
    });

    it('handles generic international phone validation', () => {
      expect(isPhoneValid('+1 555 123 4567', 'US')).toBe(true);
      expect(isPhoneValid('123', 'US')).toBe(false);
    });
  });

  describe('Address Line Completeness Validation', () => {
    it('enforces min 8-character address requirement for Pakistan to avoid courier rejections', () => {
      expect(validateAddressLine('Lahore', 'PK').valid).toBe(false); // 6 chars (single word)
      expect(validateAddressLine('House # 12, St 4, DHA Ph 5', 'PK').valid).toBe(true);
    });

    it('applies standard min 3-character threshold for international fallback', () => {
      expect(validateAddressLine('12', 'US').valid).toBe(false);
      expect(validateAddressLine('123 Main St', 'US').valid).toBe(true);
    });
  });
});

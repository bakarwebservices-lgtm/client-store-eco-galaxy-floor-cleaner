import { describe, it, expect } from 'vitest';
import {
  allSettingsSchema,
  storeIdentitySchema,
  themeSettingsSchema,
  shippingTaxSettingsSchema,
  DEFAULT_SETTINGS,
} from './settings';

describe('Store Settings Validation Schemas', () => {
  it('validates default settings successfully', () => {
    const parsed = allSettingsSchema.safeParse(DEFAULT_SETTINGS);
    expect(parsed.success).toBe(true);
  });

  it('validates 3-letter currency code (e.g. PKR, USD, EUR, GBP)', () => {
    const valid = storeIdentitySchema.safeParse({
      'store.name': 'My Store',
      'store.currency': 'USD',
      'store.country': 'United States',
    });
    expect(valid.success).toBe(true);

    const invalid = storeIdentitySchema.safeParse({
      'store.name': 'My Store',
      'store.currency': 'us-dollars',
      'store.country': 'United States',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates hex color codes for theme branding', () => {
    const valid = themeSettingsSchema.safeParse({
      'theme.primary_color': '#2563EB',
      'theme.accent_color': '#F59E0B',
      'theme.font_family': 'Inter',
    });
    expect(valid.success).toBe(true);

    const invalidHex = themeSettingsSchema.safeParse({
      'theme.primary_color': 'blue',
      'theme.accent_color': '#ZZZ',
      'theme.font_family': 'Inter',
    });
    expect(invalidHex.success).toBe(false);
  });

  it('validates numeric shipping thresholds and tax rate percentage bounds', () => {
    const valid = shippingTaxSettingsSchema.safeParse({
      'shipping.free_threshold': 5000,
      'shipping.standard_cost': 250,
      'tax.rate': 16,
    });
    expect(valid.success).toBe(true);

    const negativeShipping = shippingTaxSettingsSchema.safeParse({
      'shipping.free_threshold': -100,
      'shipping.standard_cost': 250,
      'tax.rate': 0,
    });
    expect(negativeShipping.success).toBe(false);

    const excessiveTax = shippingTaxSettingsSchema.safeParse({
      'shipping.free_threshold': 5000,
      'shipping.standard_cost': 250,
      'tax.rate': 150, // > 100%
    });
    expect(excessiveTax.success).toBe(false);
  });
});

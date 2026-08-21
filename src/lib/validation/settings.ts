import { z } from 'zod';

export const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
export const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

export const FONT_FAMILIES = [
  'Inter',
  'Geist',
  'Outfit',
  'Playfair Display',
  'Roboto',
  'Cinzel',
  'Plus Jakarta Sans',
] as const;

export const storeIdentitySchema = z.object({
  'store.name': z
    .string({ required_error: 'Store name is required' })
    .min(1, 'Store name cannot be empty')
    .max(100, 'Store name must be under 100 characters'),
  'store.tagline': z
    .string()
    .max(255, 'Tagline must be under 255 characters')
    .optional()
    .default(''),
  'store.logo_url': z
    .string()
    .optional()
    .default(''),
  'store.currency': z
    .string({ required_error: 'Currency code is required' })
    .regex(CURRENCY_CODE_REGEX, 'Currency must be a 3-letter ISO code (e.g. PKR, USD, EUR, GBP)'),
  'store.country': z
    .string({ required_error: 'Store country is required' })
    .min(1, 'Country name cannot be empty')
    .max(100, 'Country name must be under 100 characters'),
});

export const contactSettingsSchema = z.object({
  'store.email': z
    .string({ required_error: 'Contact email is required' })
    .email('Please enter a valid email address'),
  'store.phone': z
    .string({ required_error: 'Contact phone is required' })
    .min(3, 'Phone number must be at least 3 characters')
    .max(50, 'Phone number must be under 50 characters'),
  'store.address': z
    .string({ required_error: 'Store physical address is required' })
    .min(1, 'Address cannot be empty')
    .max(500, 'Address must be under 500 characters'),
  'store.hours': z
    .string({ required_error: 'Operating hours are required' })
    .min(1, 'Operating hours cannot be empty')
    .max(255, 'Operating hours must be under 255 characters'),
});

export const themeSettingsSchema = z.object({
  'theme.primary_color': z
    .string({ required_error: 'Primary theme color is required' })
    .regex(HEX_COLOR_REGEX, 'Primary color must be a valid hex code (e.g. #0F172A or #2563EB)'),
  'theme.accent_color': z
    .string({ required_error: 'Accent theme color is required' })
    .regex(HEX_COLOR_REGEX, 'Accent color must be a valid hex code (e.g. #D4AF37 or #F59E0B)'),
  'theme.font_family': z
    .string()
    .min(1, 'Font family cannot be empty')
    .default('Inter'),
});

export const shippingTaxSettingsSchema = z.object({
  'shipping.free_threshold': z.coerce
    .number({ required_error: 'Free shipping threshold is required' })
    .gte(0, 'Free shipping threshold must be greater than or equal to 0'),
  'shipping.standard_cost': z.coerce
    .number({ required_error: 'Standard shipping cost is required' })
    .gte(0, 'Standard shipping cost must be greater than or equal to 0'),
  'tax.rate': z.coerce
    .number({ required_error: 'Tax rate percentage is required' })
    .gte(0, 'Tax rate must be at least 0%')
    .lte(100, 'Tax rate cannot exceed 100%'),
});

export const trackingSettingsSchema = z.object({
  'tracking.meta_pixel_id': z
    .string()
    .max(100, 'Meta Pixel ID must be under 100 characters')
    .optional()
    .default(''),
  'tracking.ga4_measurement_id': z
    .string()
    .max(100, 'GA4 Measurement ID must be under 100 characters')
    .optional()
    .default(''),
});

export const socialSettingsSchema = z.object({
  'social.instagram': z
    .string()
    .max(255, 'Instagram link must be under 255 characters')
    .optional()
    .default(''),
  'social.facebook': z
    .string()
    .max(255, 'Facebook link must be under 255 characters')
    .optional()
    .default(''),
  'social.tiktok': z
    .string()
    .max(255, 'TikTok link must be under 255 characters')
    .optional()
    .default(''),
});

/**
 * Unified all-settings schema for batch update
 */
export const allSettingsSchema = z.object({
  ...storeIdentitySchema.shape,
  ...contactSettingsSchema.shape,
  ...themeSettingsSchema.shape,
  ...shippingTaxSettingsSchema.shape,
  ...trackingSettingsSchema.shape,
  ...socialSettingsSchema.shape,
});

export type AllSettingsInput = z.infer<typeof allSettingsSchema>;

/**
 * Default fallback values for all reserved settings keys
 */
export const DEFAULT_SETTINGS: AllSettingsInput = {
  'store.name': 'AWWeb SaaS Template Store',
  'store.tagline': 'Premium E-Commerce Platform',
  'store.logo_url': '',
  'store.currency': 'PKR',
  'store.country': 'Pakistan',
  'store.email': 'support@store.com',
  'store.phone': '+92 300 0000000',
  'store.address': 'Lahore, Punjab, Pakistan',
  'store.hours': 'Mon – Sat: 10:00 AM – 8:00 PM PKT',
  'theme.primary_color': '#0F172A',
  'theme.accent_color': '#D4AF37',
  'theme.font_family': 'Inter',
  'shipping.free_threshold': 5000,
  'shipping.standard_cost': 250,
  'tax.rate': 0,
  'tracking.meta_pixel_id': '',
  'tracking.ga4_measurement_id': '',
  'social.instagram': '',
  'social.facebook': '',
  'social.tiktok': '',
};

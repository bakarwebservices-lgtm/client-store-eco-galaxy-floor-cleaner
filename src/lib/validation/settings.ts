import { z } from 'zod';
import { optionalImageUrlSchema } from './url';

export const HEX_COLOR_REGEX = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
export const CURRENCY_CODE_REGEX = /^[A-Za-z]{3}$/;

export const hexColorSchema = z.preprocess((val) => {
  if (typeof val !== 'string' || !val.trim()) return '#042A1E';
  const trimmed = val.trim();
  return trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`;
}, z.string().regex(HEX_COLOR_REGEX, 'Must be a valid hex color (e.g. #042A1E or #10B981)'));

export const preprocessNumber = (defaultVal = 0, min = 0, max = Infinity) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined || isNaN(Number(val)) ? defaultVal : Number(val)),
    z.number().min(min).max(max).default(defaultVal)
  );

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
  'store.logo_url': optionalImageUrlSchema,
  'store.currency': z
    .string({ required_error: 'Currency code is required' })
    .regex(CURRENCY_CODE_REGEX, 'Currency must be a 3-letter code (e.g. PKR, USD, EUR, GBP)')
    .transform((v) => v.toUpperCase()),
  'store.country': z
    .string({ required_error: 'Store country is required' })
    .min(1, 'Country name cannot be empty')
    .max(100, 'Country name must be under 100 characters'),
  // Announcement Bar
  'announcement.enabled': z.preprocess(
    (val) => val === true || val === 'true' || val === 1 || val === '1',
    z.boolean().default(true)
  ),
  'announcement.text': z
    .string()
    .max(500, 'Announcement text must be under 500 characters')
    .default('FREE DELIVERY ACROSS PAKISTAN • CASH ON DELIVERY AVAILABLE • 100% ORIGINAL FORMULA'),
  'announcement.bg_color': hexColorSchema.default('#032017'),
  'announcement.text_color': hexColorSchema.default('#A7F3D0'),
});

export const contactSettingsSchema = z.object({
  'store.email': z
    .string({ required_error: 'Contact email is required' })
    .min(1, 'Contact email cannot be empty')
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Please enter a valid email address'),
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
  'theme.primary_color': hexColorSchema.default('#042A1E'),
  'theme.accent_color': hexColorSchema.default('#10B981'),
  'theme.font_family': z
    .string()
    .min(1, 'Font family cannot be empty')
    .default('Inter'),
});

export const shippingTaxSettingsSchema = z.object({
  'shipping.free_threshold': preprocessNumber(5000, 0),
  'shipping.standard_cost': preprocessNumber(250, 0),
  'tax.rate': preprocessNumber(0, 0, 100),
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
  'tracking.custom_url': z
    .string()
    .max(500, 'Tracking URL must be under 500 characters')
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

export const notificationAndAuthSchema = z.object({
  'email.smtp_enabled': z.preprocess(
    (val) => val === true || val === 'true' || val === 1 || val === '1',
    z.boolean().default(false)
  ),
  'email.smtp_host': z.string().max(255).optional().default(''),
  'email.smtp_port': preprocessNumber(587, 1, 65535),
  'email.smtp_user': z.string().max(255).optional().default(''),
  'email.smtp_password': z.string().max(255).optional().default(''),
  'email.smtp_from': z.string().max(255).optional().default(''),
  'email.smtp_from_name': z.string().max(255).optional().default(''),
  'auth.customer_accounts_enabled': z.preprocess(
    (val) => val === true || val === 'true' || val === 1 || val === '1',
    z.boolean().default(false)
  ),
  'whatsapp.order_confirmation_enabled': z.preprocess(
    (val) => val !== false && val !== 'false' && val !== 0 && val !== '0',
    z.boolean().default(true)
  ),
  'whatsapp.phone_number': z.string().max(50).optional().default(''),
  'whatsapp.custom_message': z.string().max(500).optional().default(''),
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
  ...notificationAndAuthSchema.shape,
});

export type AllSettingsInput = z.infer<typeof allSettingsSchema>;

/**
 * Default fallback values for all reserved settings keys
 */
export const DEFAULT_SETTINGS: AllSettingsInput = {
  'store.name': 'Eco Galaxy',
  'store.tagline': 'Make Every Floor Feel Brand New. | صاف فرش، خوشبودار گھر',
  'store.logo_url': '/images/eco-galaxy-logo-bg-removed.png',
  'store.currency': 'PKR',
  'store.country': 'Pakistan',
  'announcement.enabled': true,
  'announcement.text': 'FREE DELIVERY ACROSS PAKISTAN • CASH ON DELIVERY AVAILABLE • 100% ORIGINAL FORMULA',
  'announcement.bg_color': '#032017',
  'announcement.text_color': '#A7F3D0',
  'store.email': 'support@ecogalaxy.store',
  'store.phone': '0346 4815775',
  'store.address': 'Lahore, Punjab, Pakistan',
  'store.hours': 'Mon – Sat: 9:00 AM – 9:00 PM PKT',
  'theme.primary_color': '#042A1E',
  'theme.accent_color': '#10B981',
  'theme.font_family': 'Inter',
  'shipping.free_threshold': 5000,
  'shipping.standard_cost': 250,
  'tax.rate': 0,
  'tracking.meta_pixel_id': '',
  'tracking.ga4_measurement_id': '',
  'tracking.custom_url': '',
  'social.instagram': '',
  'social.facebook': '',
  'social.tiktok': '',
  'email.smtp_enabled': false,
  'email.smtp_host': '',
  'email.smtp_port': 587,
  'email.smtp_user': '',
  'email.smtp_password': '',
  'email.smtp_from': '',
  'email.smtp_from_name': '',
  'auth.customer_accounts_enabled': false,
  'whatsapp.order_confirmation_enabled': true,
  'whatsapp.phone_number': '',
  'whatsapp.custom_message': '',
};

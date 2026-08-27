import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/validation/settings';
export { PUT } from '@/app/api/admin/settings/route';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db.setting.findMany();

    // Map existing rows on top of default values
    const settings: Record<string, any> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (row.value !== null && row.value !== undefined) {
        settings[row.key] = row.value;
      }
    }

    // Public sanitized settings payload (hides internal tokens)
    const publicSettings = {
      storeName: settings['store.name'],
      tagline: settings['store.tagline'],
      logoUrl: settings['store.logo_url'],
      faviconUrl: settings['store.favicon_url'],
      currency: settings['store.currency'],
      country: settings['store.country'],
      email: settings['store.email'],
      phone: settings['store.phone'],
      address: settings['store.address'],
      hours: settings['store.hours'],
      freeShippingThreshold: settings['shipping.free_threshold'],
      standardShippingCost: settings['shipping.standard_cost'],
      primaryColor: settings['theme.primary_color'],
      secondaryColor: settings['theme.secondary_color'],
      accentColor: settings['theme.accent_color'],
      fontFamily: settings['theme.font_family'],
      borderRadius: settings['theme.border_radius'],
      trackingUrl: settings['tracking.custom_url'] || settings['store.tracking_url'] || '/track',
      facebookUrl: settings['social.facebook'],
      instagramUrl: settings['social.instagram'],
      twitterUrl: settings['social.twitter'],
      tiktokUrl: settings['social.tiktok'],
      customerAccountsEnabled: Boolean(settings['auth.customer_accounts_enabled']),
      whatsappOrderConfirmationEnabled: settings['whatsapp.order_confirmation_enabled'] !== false,
      whatsappNumber: settings['whatsapp.phone_number'] || settings['store.phone'] || '',
      whatsappCustomMessage: settings['whatsapp.custom_message'] || '',
    };

    return NextResponse.json({ settings: publicSettings });
  } catch (error: any) {
    console.error('Failed to load public settings:', error);
    return NextResponse.json({ error: 'Failed to load store settings' }, { status: 500 });
  }
}

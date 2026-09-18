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

    const smtpEnabled = Boolean(settings['email.smtp_enabled']);
    const emailRequiredAtCheckout = smtpEnabled;
    const whatsappOrderConfirmationEnabled = Boolean(settings['whatsapp.order_confirmation_enabled']);

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
      emailSmtpEnabled: smtpEnabled,
      whatsappOrderConfirmationEnabled,
      whatsappFloatingButtonEnabled: settings['whatsapp.floating_button_enabled'] !== false,
      emailRequiredAtCheckout,
      whatsappNumber: settings['whatsapp.phone_number'] || settings['store.phone'] || '',
      whatsappCustomMessage: settings['whatsapp.custom_message'] || '',
      // Cash on Delivery (COD) Settings
      codEnabled: settings['payment.cod_enabled'] !== false,
      codTitle: settings['payment.cod_title'] || 'Cash on Delivery (COD)',
      codInstructions: settings['payment.cod_instructions'] || 'Pay with cash upon package delivery at your doorstep.',
      codFee: Number(settings['payment.cod_fee']) || 0,
      codMaxLimit: Number(settings['payment.cod_max_limit']) || 0,
      // Direct Bank Transfer & Prepayment Incentive Settings
      bankTransferEnabled: Boolean(settings['payment.bank_transfer_enabled']),
      bankName: settings['payment.bank_name'] || 'Meezan Bank',
      accountTitle: settings['payment.account_title'] || '',
      accountNumber: settings['payment.account_number'] || '',
      bankName2: settings['payment.bank_name_2'] || '',
      accountTitle2: settings['payment.account_title_2'] || '',
      accountNumber2: settings['payment.account_number_2'] || '',
      bankInstructions: settings['payment.bank_instructions'] || '',
      bankDiscountEnabled: Boolean(settings['payment.bank_discount_enabled']),
      bankDiscountType: (settings['payment.bank_discount_type'] as 'percentage' | 'fixed') || 'percentage',
      bankDiscountValue: Number(settings['payment.bank_discount_value']) || 0,
      // Dynamic Top Announcement Bar Settings
      announcementEnabled: Boolean(settings['announcement.enabled']),
      announcementMode: (settings['announcement.mode'] as 'static' | 'marquee' | 'rotate') || 'static',
      announcementDismissible: Boolean(settings['announcement.dismissible']),
      announcementText: settings['announcement.text'] || '',
      announcementLink: settings['announcement.link'] || '',
      announcementBgColor: settings['announcement.bg_color'] || '#032017',
      announcementTextColor: settings['announcement.text_color'] || '#A7F3D0',
      announcement2Enabled: Boolean(settings['announcement.2.enabled']),
      announcement2Text: settings['announcement.2.text'] || '',
      announcement2Link: settings['announcement.2.link'] || '',
      announcement2BgColor: settings['announcement.2.bg_color'] || '#063B2A',
      announcement2TextColor: settings['announcement.2.text_color'] || '#FFFFFF',
      // Hero Section Media Showcase Settings
      heroMediaType: (settings['hero.media_type'] as 'product' | 'image' | 'video') || 'product',
      heroSlideInterval: Number(settings['hero.slide_interval']) || 3000,
      heroImage1Url: settings['hero.image_1_url'] || '',
      heroImage1Alt: settings['hero.image_1_alt'] || '',
      heroImage1Link: settings['hero.image_1_link'] || '',
      heroImage2Url: settings['hero.image_2_url'] || '',
      heroImage2Alt: settings['hero.image_2_alt'] || '',
      heroImage2Link: settings['hero.image_2_link'] || '',
      heroImage3Url: settings['hero.image_3_url'] || '',
      heroImage3Alt: settings['hero.image_3_alt'] || '',
      heroImage3Link: settings['hero.image_3_link'] || '',
      heroVideoUrl: settings['hero.video_url'] || '',
      heroVideoPoster: settings['hero.video_poster'] || '',
    };

    return NextResponse.json(
      { settings: publicSettings },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Failed to load public settings:', error);
    return NextResponse.json({ error: 'Failed to load store settings' }, { status: 500 });
  }
}

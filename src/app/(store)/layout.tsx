import React, { Suspense } from 'react';
import { AttributionTracker } from '@/components/storefront/AttributionTracker';
import { AnnouncementBar } from '@/components/storefront/AnnouncementBar';
import { Navbar } from '@/components/storefront/Navbar';
import { Footer } from '@/components/storefront/Footer';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { FloatingWhatsApp } from '@/components/storefront/FloatingWhatsApp';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { db } from '@/lib/db';

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let storeName = 'Eco Galaxy';
  let logoUrl: string | null = '/images/eco-galaxy-logo-bg-removed.png';
  let customerAccountsEnabled = false;
  let phone = '0346 4815775';
  let primaryColor = '#042A1E';

  // Announcement Bar Defaults
  let announcementEnabled = true;
  let announcementMode: 'static' | 'marquee' | 'rotate' = 'static';
  let announcementDismissible = false;
  let announcementText = 'FREE DELIVERY ACROSS PAKISTAN • CASH ON DELIVERY AVAILABLE • 100% ORIGINAL FORMULA';
  let announcementLink = '';
  let announcementBgColor = '#032017';
  let announcementTextColor = '#A7F3D0';
  let announcement2Enabled = false;
  let announcement2Text = '';
  let announcement2Link = '';
  let announcement2BgColor = '#063B2A';
  let announcement2TextColor = '#FFFFFF';

  let whatsappFloatingEnabled = true;
  let whatsappPhone = '0346 4815775';
  let whatsappCustomMessage: string | undefined = undefined;

  try {
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: [
            'store.name',
            'store.logo_url',
            'store.phone',
            'auth.customer_accounts_enabled',
            'theme.primary_color',
            'announcement.enabled',
            'announcement.mode',
            'announcement.dismissible',
            'announcement.text',
            'announcement.link',
            'announcement.bg_color',
            'announcement.text_color',
            'announcement.2.enabled',
            'announcement.2.text',
            'announcement.2.link',
            'announcement.2.bg_color',
            'announcement.2.text_color',
            'whatsapp.floating_button_enabled',
            'whatsapp.phone_number',
            'whatsapp.custom_message',
          ],
        },
      },
    });

    for (const s of settings) {
      if (s.key === 'store.name' && s.value) {
        storeName = String(s.value);
      } else if (s.key === 'store.logo_url' && s.value) {
        logoUrl = String(s.value);
      } else if (s.key === 'store.phone' && s.value) {
        phone = String(s.value);
        if (!whatsappPhone || whatsappPhone === '0346 4815775') {
          whatsappPhone = String(s.value);
        }
      } else if (s.key === 'auth.customer_accounts_enabled') {
        customerAccountsEnabled = s.value === true || s.value === 'true';
      } else if (s.key === 'theme.primary_color' && s.value) {
        primaryColor = String(s.value);
      } else if (s.key === 'announcement.enabled') {
        announcementEnabled = s.value !== false && s.value !== 'false';
      } else if (s.key === 'announcement.mode' && s.value) {
        announcementMode = s.value as 'static' | 'marquee' | 'rotate';
      } else if (s.key === 'announcement.dismissible') {
        announcementDismissible = s.value === true || s.value === 'true';
      } else if (s.key === 'announcement.text' && s.value) {
        announcementText = String(s.value);
      } else if (s.key === 'announcement.link' && s.value) {
        announcementLink = String(s.value);
      } else if (s.key === 'announcement.bg_color' && s.value) {
        announcementBgColor = String(s.value);
      } else if (s.key === 'announcement.text_color' && s.value) {
        announcementTextColor = String(s.value);
      } else if (s.key === 'announcement.2.enabled') {
        announcement2Enabled = s.value === true || s.value === 'true';
      } else if (s.key === 'announcement.2.text' && s.value) {
        announcement2Text = String(s.value);
      } else if (s.key === 'announcement.2.link' && s.value) {
        announcement2Link = String(s.value);
      } else if (s.key === 'announcement.2.bg_color' && s.value) {
        announcement2BgColor = String(s.value);
      } else if (s.key === 'announcement.2.text_color' && s.value) {
        announcement2TextColor = String(s.value);
      } else if (s.key === 'whatsapp.floating_button_enabled') {
        whatsappFloatingEnabled = s.value !== false && s.value !== 'false';
      } else if (s.key === 'whatsapp.phone_number' && s.value) {
        whatsappPhone = String(s.value);
      } else if (s.key === 'whatsapp.custom_message' && s.value) {
        whatsappCustomMessage = String(s.value);
      }
    }

    if (whatsappCustomMessage) {
      whatsappCustomMessage = whatsappCustomMessage.replace('{store_name}', storeName);
    }
  } catch {
    // fallback defaults
  }

  return (
    <CartProvider>
      <WishlistProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <AnnouncementBar
            initialEnabled={announcementEnabled}
            initialMode={announcementMode}
            initialDismissible={announcementDismissible}
            initialText={announcementText}
            initialLink={announcementLink}
            initialBgColor={announcementBgColor}
            initialTextColor={announcementTextColor}
            initial2Enabled={announcement2Enabled}
            initial2Text={announcement2Text}
            initial2Link={announcement2Link}
            initial2BgColor={announcement2BgColor}
            initial2TextColor={announcement2TextColor}
          />
          <Navbar
            initialStoreName={storeName}
            initialLogoUrl={logoUrl}
            initialCustomerAccountsEnabled={customerAccountsEnabled}
            initialPrimaryColor={primaryColor}
          />
          <div className="flex-1">{children}</div>
          <Footer />
          <CartDrawer />
          {whatsappFloatingEnabled && (
            <FloatingWhatsApp phone={whatsappPhone || phone} defaultMessage={whatsappCustomMessage} />
          )}
          <Suspense fallback={null}>
            <AttributionTracker />
          </Suspense>
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}

import React from 'react';
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
  let announcementEnabled = true;
  let announcementText = 'FREE DELIVERY ACROSS PAKISTAN • CASH ON DELIVERY AVAILABLE • 100% ORIGINAL FORMULA';
  let announcementBgColor = '#032017';
  let announcementTextColor = '#A7F3D0';
  let primaryColor = '#042A1E';

  try {
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: [
            'store.name',
            'store.logo_url',
            'store.phone',
            'auth.customer_accounts_enabled',
            'announcement.enabled',
            'announcement.text',
            'announcement.bg_color',
            'announcement.text_color',
            'theme.primary_color',
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
      } else if (s.key === 'auth.customer_accounts_enabled') {
        customerAccountsEnabled = s.value === true || s.value === 'true';
      } else if (s.key === 'announcement.enabled') {
        announcementEnabled = s.value !== false && s.value !== 'false';
      } else if (s.key === 'announcement.text' && s.value) {
        announcementText = String(s.value);
      } else if (s.key === 'announcement.bg_color' && s.value) {
        announcementBgColor = String(s.value);
      } else if (s.key === 'announcement.text_color' && s.value) {
        announcementTextColor = String(s.value);
      } else if (s.key === 'theme.primary_color' && s.value) {
        primaryColor = String(s.value);
      }
    }
  } catch {
    // fallback defaults
  }

  return (
    <CartProvider>
      <WishlistProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <Navbar
            initialStoreName={storeName}
            initialLogoUrl={logoUrl}
            initialCustomerAccountsEnabled={customerAccountsEnabled}
            initialAnnouncementEnabled={announcementEnabled}
            initialAnnouncementText={announcementText}
            initialAnnouncementBgColor={announcementBgColor}
            initialAnnouncementTextColor={announcementTextColor}
            initialPrimaryColor={primaryColor}
          />
          <div className="flex-1">{children}</div>
          <Footer />
          <CartDrawer />
          <FloatingWhatsApp phone={phone} />
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}

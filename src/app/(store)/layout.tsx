import React from 'react';
import { Navbar } from '@/components/storefront/Navbar';
import { Footer } from '@/components/storefront/Footer';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { db } from '@/lib/db';

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let storeName = 'Store';
  let logoUrl: string | null = null;
  let customerAccountsEnabled = false;

  try {
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: ['store.name', 'store.logo_url', 'auth.customer_accounts_enabled'],
        },
      },
    });

    for (const s of settings) {
      if (s.key === 'store.name' && s.value) {
        storeName = String(s.value);
      } else if (s.key === 'store.logo_url' && s.value) {
        logoUrl = String(s.value);
      } else if (s.key === 'auth.customer_accounts_enabled') {
        customerAccountsEnabled = s.value === true || s.value === 'true';
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
          />
          <div className="flex-1">{children}</div>
          <Footer />
          <CartDrawer />
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}

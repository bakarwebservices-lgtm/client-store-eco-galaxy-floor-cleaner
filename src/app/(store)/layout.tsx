import React from 'react';
import { Navbar } from '@/components/storefront/Navbar';
import { Footer } from '@/components/storefront/Footer';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <WishlistProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
          <CartDrawer />
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}

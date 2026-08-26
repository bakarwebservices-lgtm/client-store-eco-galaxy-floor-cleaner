import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { NewsletterSignup } from './NewsletterSignup';

export async function Footer() {
  let trackingUrl = '/track';
  try {
    const row = await db.setting.findFirst({
      where: { key: { in: ['tracking.custom_url', 'store.tracking_url'] } },
    });
    if (row?.value) {
      trackingUrl = String(row.value);
    }
  } catch {
    // fallback to /track
  }

  return (
    <footer className="border-t border-border bg-card text-card-foreground mt-20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2 font-heading font-bold text-foreground text-base">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
                AW
              </div>
              STORE
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Premium quality products with swift delivery and end-to-end customer support.
            </p>
            <div className="pt-2 max-w-sm">
              <NewsletterSignup />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Quick Links</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li><Link href="/products" className="hover:text-foreground transition-colors">All Products</Link></li>
              <li><Link href="/products?featured=true" className="hover:text-foreground transition-colors">Featured Collections</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">Customer FAQ</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Customer Support</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link
                  href={trackingUrl}
                  target={trackingUrl.startsWith('http') ? '_blank' : undefined}
                  rel={trackingUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="hover:text-foreground transition-colors font-medium text-primary"
                >
                  Track Order
                </Link>
              </li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><Link href="/pages/shipping-policy" className="hover:text-foreground transition-colors">Shipping Policy</Link></li>
              <li><Link href="/pages/returns" className="hover:text-foreground transition-colors">Returns & Refunds</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Legal & Privacy</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li><Link href="/pages/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/pages/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} AWWeb SaaS Template. All rights reserved.</p>
          <p>Config-driven e-commerce platform.</p>
        </div>
      </div>
    </footer>
  );
}

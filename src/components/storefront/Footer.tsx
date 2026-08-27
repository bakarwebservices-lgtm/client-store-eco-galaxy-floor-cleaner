import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { NewsletterSignup } from './NewsletterSignup';
import { stripHtml } from '@/lib/format';

function getSafeStoreInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'ST';
  const clean = name.trim();
  if (!clean) return 'ST';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'ST';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
}

export async function Footer() {
  let trackingUrl = '/track';
  let storeName = 'Store';
  let tagline = 'Premium quality products with swift delivery and end-to-end customer support.';
  let logoUrl: string | null = null;
  let instagramUrl = '';
  let facebookUrl = '';
  let tiktokUrl = '';

  try {
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: [
            'tracking.custom_url',
            'store.tracking_url',
            'store.name',
            'store.tagline',
            'store.logo_url',
            'social.instagram',
            'social.facebook',
            'social.tiktok',
          ],
        },
      },
    });

    for (const s of settings) {
      if (s.key === 'tracking.custom_url' || s.key === 'store.tracking_url') {
        if (s.value) trackingUrl = String(s.value);
      } else if (s.key === 'store.name' && s.value) {
        storeName = String(s.value);
      } else if (s.key === 'store.tagline' && s.value) {
        tagline = String(s.value);
      } else if (s.key === 'store.logo_url' && s.value) {
        logoUrl = String(s.value);
      } else if (s.key === 'social.instagram' && s.value) {
        instagramUrl = String(s.value);
      } else if (s.key === 'social.facebook' && s.value) {
        facebookUrl = String(s.value);
      } else if (s.key === 'social.tiktok' && s.value) {
        tiktokUrl = String(s.value);
      }
    }
  } catch {
    // fallback to defaults
  }

  const hasSocials = Boolean(instagramUrl || facebookUrl || tiktokUrl);

  return (
    <footer className="border-t border-border bg-card text-card-foreground mt-20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2.5 font-heading font-bold text-foreground text-base">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-7 w-auto object-contain max-w-[140px]" />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold shrink-0">
                  {getSafeStoreInitials(storeName)}
                </div>
              )}
              <span className="uppercase">{storeName}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              {stripHtml(tagline)}
            </p>

            {hasSocials && (
              <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors font-medium"
                  >
                    Instagram
                  </a>
                )}
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors font-medium"
                  >
                    Facebook
                  </a>
                )}
                {tiktokUrl && (
                  <a
                    href={tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors font-medium"
                  >
                    TikTok
                  </a>
                )}
              </div>
            )}

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
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <p>Powered by Next.js E-Commerce Engine</p>
        </div>
      </div>
    </footer>
  );
}

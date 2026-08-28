import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { NewsletterSignup } from './NewsletterSignup';
import { stripHtml } from '@/lib/format';
import { ShieldCheck, Truck, Banknote, MessageCircle, Lock } from 'lucide-react';

export async function Footer() {
  let trackingUrl = '/track';
  let storeName = 'Eco Galaxy';
  let tagline = 'Make Every Floor Feel Brand New. | صاف فرش، خوشبودار گھر';
  let logoUrl = '/images/eco-galaxy-logo-bg-removed.png';
  let phone = '0346 4815775';
  let email = 'support@ecogalaxy.store';
  let primaryColor = '#042A1E';

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
            'store.phone',
            'store.email',
            'theme.primary_color',
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
      } else if (s.key === 'store.phone' && s.value) {
        phone = String(s.value);
      } else if (s.key === 'store.email' && s.value) {
        email = String(s.value);
      } else if (s.key === 'theme.primary_color' && s.value) {
        primaryColor = String(s.value);
      }
    }
  } catch {
    // fallback to defaults
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const intlPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone.startsWith('92') ? cleanPhone : '92' + cleanPhone;

  return (
    <footer
      className="border-t border-border/40 text-white mt-24 transition-colors duration-300"
      style={{ backgroundColor: primaryColor || 'var(--primary, #042A1E)' }}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt={storeName} className="h-10 w-auto object-contain max-w-[170px]" />
            </div>
            <p className="text-xs text-white/80 leading-relaxed max-w-sm">
              {tagline}
            </p>
            <div className="pt-2 text-xs text-white/80 space-y-1.5">
              <p>Email: <a href={`mailto:${email}`} className="text-white hover:underline">{email}</a></p>
              <p>WhatsApp: <a href={`https://wa.me/${intlPhone}`} target="_blank" rel="noopener noreferrer" className="text-white font-bold hover:underline">{phone}</a></p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-white">Shop &amp; Packs</p>
            <ul className="space-y-2 text-xs text-white/80">
              <li>
                <Link href="/products" className="transition-colors hover:text-white">
                  All Packs
                </Link>
              </li>
              <li>
                <Link href="/#shop" className="transition-colors hover:text-white">
                  1 Liter Starter Pack
                </Link>
              </li>
              <li>
                <Link href="/#shop" className="transition-colors hover:text-white">
                  3 Liters Family Value Pack
                </Link>
              </li>
              <li>
                <Link href="/#shop" className="transition-colors hover:text-white">
                  5 Liters Mega Value Pack
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care & Multi-Page Links */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-white">Customer Care</p>
            <ul className="space-y-2 text-xs text-white/80">
              <li>
                <Link href="/pages/about-us" className="transition-colors hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="transition-colors hover:text-white">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition-colors hover:text-white">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href={trackingUrl} className="transition-colors hover:text-white">
                  Track Your Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-white">Policies</p>
            <ul className="space-y-2 text-xs text-white/80">
              <li>
                <Link href="/pages/shipping-policy" className="transition-colors hover:text-white">
                  Shipping &amp; Delivery
                </Link>
              </li>
              <li>
                <Link href="/pages/returns" className="transition-colors hover:text-white">
                  Returns &amp; Refunds
                </Link>
              </li>
              <li>
                <Link href="/pages/privacy" className="transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/pages/terms" className="transition-colors hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Admin Login Link */}
        <div className="mt-12 border-t border-white/15 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/70">
          <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Cash on Delivery • Free Delivery Pakistan</span>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
              title="Admin Portal Login"
            >
              <Lock className="h-3 w-3" />
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

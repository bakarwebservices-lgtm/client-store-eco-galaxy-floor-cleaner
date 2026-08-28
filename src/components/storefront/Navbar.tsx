'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Menu, X, Search, User, ChevronDown, Truck, ShieldCheck, MessageCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface CategoryNav {
  id: string;
  name: string;
  slug: string;
}

interface CollectionNav {
  id: string;
  name: string;
  slug: string;
}

export interface NavbarProps {
  initialStoreName?: string;
  initialLogoUrl?: string | null;
  initialCustomerAccountsEnabled?: boolean;
  initialAnnouncementEnabled?: boolean;
  initialAnnouncementText?: string;
  initialAnnouncementBgColor?: string;
  initialAnnouncementTextColor?: string;
  initialPrimaryColor?: string;
}

export function Navbar({
  initialStoreName = 'Eco Galaxy',
  initialLogoUrl = '/images/eco-galaxy-logo-bg-removed.png',
  initialCustomerAccountsEnabled = false,
  initialAnnouncementEnabled = true,
  initialAnnouncementText = 'FREE DELIVERY ACROSS PAKISTAN • CASH ON DELIVERY AVAILABLE • 100% ORIGINAL FORMULA',
  initialAnnouncementBgColor = '#032017',
  initialAnnouncementTextColor = '#A7F3D0',
  initialPrimaryColor = '#042A1E',
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryNav[]>([]);
  const [collections, setCollections] = useState<CollectionNav[]>([]);
  const [trackingUrl, setTrackingUrl] = useState<string>('/track');
  const [storeName, setStoreName] = useState<string>(initialStoreName || 'Eco Galaxy');
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl || '/images/eco-galaxy-logo-bg-removed.png');
  const [logoError, setLogoError] = useState(false);
  const [customerAccountsEnabled, setCustomerAccountsEnabled] = useState<boolean>(initialCustomerAccountsEnabled);
  const [announcementEnabled, setAnnouncementEnabled] = useState<boolean>(initialAnnouncementEnabled);
  const [announcementText, setAnnouncementText] = useState<string>(initialAnnouncementText);
  const [announcementBgColor, setAnnouncementBgColor] = useState<string>(initialAnnouncementBgColor);
  const [announcementTextColor, setAnnouncementTextColor] = useState<string>(initialAnnouncementTextColor);
  const [primaryColor, setPrimaryColor] = useState<string>(initialPrimaryColor);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { totalItems, toggleCart } = useCart();

  useEffect(() => {
    async function loadNavData() {
      try {
        const [catsRes, colsRes, settingsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/collections'),
          fetch('/api/settings'),
        ]);

        if (catsRes.ok) {
          const data = await catsRes.json();
          setCategories(data.categories || []);
        }
        if (colsRes.ok) {
          const data = await colsRes.json();
          setCollections(data.collections || []);
        }
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data.settings?.trackingUrl) {
            setTrackingUrl(data.settings.trackingUrl);
          }
          if (data.settings?.storeName) {
            setStoreName(data.settings.storeName);
          }
          if (data.settings?.logoUrl) {
            setLogoUrl(data.settings.logoUrl);
            setLogoError(false);
          }
          if (typeof data.settings?.customerAccountsEnabled === 'boolean') {
            setCustomerAccountsEnabled(data.settings.customerAccountsEnabled);
          }
          if (typeof data.settings?.announcementEnabled === 'boolean') {
            setAnnouncementEnabled(data.settings.announcementEnabled);
          }
          if (data.settings?.announcementText) {
            setAnnouncementText(data.settings.announcementText);
          }
          if (data.settings?.announcementBgColor) {
            setAnnouncementBgColor(data.settings.announcementBgColor);
          }
          if (data.settings?.announcementTextColor) {
            setAnnouncementTextColor(data.settings.announcementTextColor);
          }
          if (data.settings?.primaryColor) {
            setPrimaryColor(data.settings.primaryColor);
          }
        }
      } catch (err) {
        console.error('Failed to load navigation data', err);
      }
    }
    loadNavData();
  }, []);

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border/40 text-white shadow-md transition-colors duration-300"
      style={{ backgroundColor: primaryColor || 'var(--primary, #042A1E)' }}
    >
      {/* Top Announcement Bar — Fully Dynamic from Admin Settings */}
      {announcementEnabled && (
        <div
          className="px-4 py-2 text-center text-xs font-semibold tracking-wide transition-colors duration-300 border-b border-black/10"
          style={{
            backgroundColor: announcementBgColor || '#032017',
            color: announcementTextColor || '#A7F3D0',
          }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <Truck className="h-3.5 w-3.5 shrink-0" />
              <span>{announcementText}</span>
            </span>
          </div>
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo - Clear contrast on dark primary background */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight text-white transition-opacity hover:opacity-90">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={storeName}
                onError={() => setLogoError(true)}
                className="h-10 w-auto object-contain max-w-[170px]"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white font-extrabold text-sm shrink-0 shadow-sm">
                EG
              </div>
            )}
            <span className="sr-only">{storeName}</span>
          </Link>

          {/* Desktop Multi-Page Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-white/90">
            <Link href="/" className="transition-colors hover:text-white">
              Home
            </Link>

            <Link href="/products" className="transition-colors hover:text-white">
              All Products
            </Link>

            {/* Dynamic Categories Dropdown */}
            {categories.length > 0 && (
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setCategoriesOpen(!categoriesOpen)}
                  className="flex items-center gap-1 transition-colors hover:text-white focus:outline-none"
                >
                  <span>Categories</span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
                </button>
                <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div
                    className="w-52 rounded-xl border border-white/10 p-2 shadow-xl backdrop-blur-md"
                    style={{ backgroundColor: primaryColor || '#042A1E' }}
                  >
                    {categories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/categories/${c.slug}`}
                        className="block rounded-lg px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Link href="/pages/about-us" className="transition-colors hover:text-white">
              About Us
            </Link>

            <Link href="/faq" className="transition-colors hover:text-white">
              FAQ
            </Link>

            <Link href="/contact" className="transition-colors hover:text-white">
              Contact
            </Link>

            <Link
              href={trackingUrl}
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-full border border-white/10 hover:bg-white/20 transition-all text-white"
            >
              <Truck className="h-3 w-3" style={{ color: 'var(--accent, #10ACB7)' }} />
              <span>Track Order</span>
            </Link>
          </nav>
        </div>

        {/* Right Actions: WhatsApp Help, Cart, Account, Mobile Toggle */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center justify-center rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-white/25 active:scale-95"
          >
            Shop Now
          </Link>

          {/* Cart Bag Icon with dynamic items count */}
          <button
            type="button"
            onClick={toggleCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95"
            aria-label={`Shopping Bag with ${totalItems} items`}
          >
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <span
                style={{ backgroundColor: 'var(--accent, #10ACB7)' }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-black text-white shadow-md animate-in zoom-in"
              >
                {totalItems}
              </span>
            )}
          </button>

          {/* Customer Account Icon */}
          {customerAccountsEnabled && (
            <Link
              href="/account"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95"
              aria-label="Customer Account"
            >
              <User className="h-5 w-5" />
            </Link>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          className="border-t border-white/10 px-4 py-6 md:hidden space-y-4 shadow-xl"
          style={{ backgroundColor: primaryColor || '#042A1E' }}
        >
          <div className="flex flex-col space-y-3 font-semibold text-white/90">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-white/10 hover:text-white transition-colors"
            >
              Home
            </Link>

            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-white/10 hover:text-white transition-colors"
            >
              All Products
            </Link>

            {categories.length > 0 && (
              <div className="space-y-1 pl-3 border-l-2 border-white/20">
                <span className="text-xs uppercase tracking-wider text-white/60 font-bold px-3">Categories</span>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/categories/${c.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-3 py-1.5 text-xs text-white/90 hover:bg-white/10 hover:text-white"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}

            <Link
              href="/pages/about-us"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-white/10 hover:text-white transition-colors"
            >
              About Us
            </Link>

            <Link
              href="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-white/10 hover:text-white transition-colors"
            >
              FAQ
            </Link>

            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-white/10 hover:text-white transition-colors"
            >
              Contact
            </Link>

            <Link
              href={trackingUrl}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white border border-white/10"
            >
              <Truck className="h-4 w-4" style={{ color: 'var(--accent, #10ACB7)' }} />
              <span>Track Order</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

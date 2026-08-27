'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Menu, X, Search, User, ChevronDown } from 'lucide-react';
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

function getSafeStoreInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'ST';
  const clean = name.trim();
  if (!clean) return 'ST';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'ST';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
}

export interface NavbarProps {
  initialStoreName?: string;
  initialLogoUrl?: string | null;
  initialCustomerAccountsEnabled?: boolean;
}

export function Navbar({
  initialStoreName = 'STORE',
  initialLogoUrl = null,
  initialCustomerAccountsEnabled = false,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryNav[]>([]);
  const [collections, setCollections] = useState<CollectionNav[]>([]);
  const [trackingUrl, setTrackingUrl] = useState<string>('/track');
  const [storeName, setStoreName] = useState<string>(initialStoreName || 'STORE');
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl || null);
  const [logoError, setLogoError] = useState(false);
  const [customerAccountsEnabled, setCustomerAccountsEnabled] = useState<boolean>(initialCustomerAccountsEnabled);
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
        }
      } catch (err) {
        console.error('Failed to load navigation data', err);
      }
    }
    loadNavData();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight text-foreground">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={storeName}
                onError={() => setLogoError(true)}
                className="h-8 w-auto object-contain max-w-[140px]"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-extrabold text-xs shrink-0">
                {getSafeStoreInitials(storeName)}
              </div>
            )}
            <span className="uppercase">{storeName}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/products" className="transition-colors hover:text-foreground">
              Shop
            </Link>

            {/* Conditionally render Collections in desktop navbar only if active collections exist */}
            {collections.length > 0 && (
              <Link href="/collections" className="transition-colors hover:text-foreground">
                Collections
              </Link>
            )}

            {/* Dynamic Categories Dropdown */}
            {categories.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setCategoriesOpen(true)}
                onMouseLeave={() => setCategoriesOpen(false)}
              >
                <button
                  type="button"
                  className="flex items-center gap-1 transition-colors hover:text-foreground py-2"
                >
                  <span>Categories</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {categoriesOpen && (
                  <div className="absolute left-0 top-full w-48 rounded-xl border border-border bg-card p-2 shadow-lg backdrop-blur space-y-0.5 z-50">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/categories/${cat.slug}`}
                        className="block rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Link href="/products?featured=true" className="transition-colors hover:text-foreground">
              Featured
            </Link>
            <Link
              href={trackingUrl}
              target={trackingUrl.startsWith('http') ? '_blank' : undefined}
              rel={trackingUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="transition-colors hover:text-foreground text-primary font-medium"
            >
              Track
            </Link>
            <Link href="/faq" className="transition-colors hover:text-foreground">
              FAQ
            </Link>
            <Link href="/contact" className="transition-colors hover:text-foreground">
              Contact
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Search catalog"
          >
            <Search className="h-4 w-4" />
          </Link>

          {/* Conditionally rendered Customer Account Button */}
          {customerAccountsEnabled && (
            <Link
              href="/account"
              className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
              aria-label="My Account"
            >
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Account</span>
            </Link>
          )}

          {/* Cart Drawer Trigger Button with Live Counter Badge */}
          <button
            type="button"
            onClick={toggleCart}
            className="relative flex items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-transform active:scale-95 shadow-sm hover:bg-primary-hover"
            aria-label="Open shopping cart"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bag</span>
            {totalItems > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-extrabold text-destructive-foreground">
                {totalItems}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-md md:hidden text-muted-foreground hover:text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-card px-4 py-4 md:hidden space-y-3">
          <Link
            href="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-foreground py-1.5"
          >
            Shop
          </Link>

          {/* Conditionally render Collections in mobile drawer only if active collections exist */}
          {collections.length > 0 && (
            <Link
              href="/collections"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1.5"
            >
              Collections
            </Link>
          )}

          {categories.length > 0 && (
            <div className="border-t border-b border-border py-2 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block px-1">
                Categories
              </span>
              <div className="grid grid-cols-2 gap-1 pt-1">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/products?featured=true"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-foreground py-1.5"
          >
            Featured Items
          </Link>
          {customerAccountsEnabled && (
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1.5"
            >
              My Account
            </Link>
          )}
          <Link
            href={trackingUrl}
            target={trackingUrl.startsWith('http') ? '_blank' : undefined}
            rel={trackingUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-primary py-1.5"
          >
            Track Shipment
          </Link>
          <Link
            href="/faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-foreground py-1.5"
          >
            Customer FAQ
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-foreground py-1.5"
          >
            Contact Store
          </Link>
        </div>
      )}
    </header>
  );
}

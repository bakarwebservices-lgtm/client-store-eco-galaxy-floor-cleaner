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

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryNav[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { totalItems, toggleCart } = useCart();

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error('Failed to load categories navigation', err);
      }
    }
    loadCategories();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-extrabold">
              AW
            </div>
            <span>STORE</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/products" className="transition-colors hover:text-foreground">
              Catalog
            </Link>

            <Link href="/collections" className="transition-colors hover:text-foreground">
              Collections
            </Link>

            {/* Categories Dropdown */}
            {categories.length > 0 && (
              <div
                className="relative group py-2"
                onMouseEnter={() => setCategoriesOpen(true)}
                onMouseLeave={() => setCategoriesOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setCategoriesOpen(!categoriesOpen)}
                  className="flex items-center gap-1 transition-colors hover:text-foreground focus:outline-none"
                >
                  <span>Categories</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {categoriesOpen && (
                  <div className="absolute left-0 top-full w-48 rounded-xl border border-border bg-card p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150 z-50">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/categories/${cat.slug}`}
                        onClick={() => setCategoriesOpen(false)}
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

          <Link
            href="/account"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Account"
          >
            <User className="h-4 w-4" />
          </Link>

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
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-extrabold text-white">
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
            All Products
          </Link>

          <Link
            href="/collections"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-foreground py-1.5"
          >
            Collections
          </Link>

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

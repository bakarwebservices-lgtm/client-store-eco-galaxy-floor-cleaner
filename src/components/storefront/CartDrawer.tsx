'use client';
import { formatCurrency } from '@/lib/format';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export function CartDrawer() {
  const { isOpen, closeCart, items, totalItems, subtotal, updateQuantity, removeItem } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key listener (BUILD_STANDARDS 4.6)
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on mount
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCart();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
          className="relative w-screen max-w-md bg-card text-card-foreground shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right duration-300"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/20">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 id="cart-drawer-title" className="text-base font-bold text-foreground">
                Your Shopping Bag ({totalItems})
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeCart}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-border">
            {items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  {/* Thumbnail with Explicit Dimensions */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/20">
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>

                  {/* Item Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${item.productSlug}`}
                          onClick={closeCart}
                          className="text-xs font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                        >
                          {item.productName}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                          aria-label={`Remove ${item.productName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {item.variantTitle && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Option: {item.variantTitle}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-lg border border-border bg-background">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-muted-foreground hover:text-foreground active:bg-muted/50"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-1 text-xs font-semibold text-foreground min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={item.quantity >= item.availableStock}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 active:bg-muted/50"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-xs font-bold text-foreground">
                          {formatCurrency(item.totalItemPrice)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-[10px] text-muted-foreground">
                            {formatCurrency(item.price)} each
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-24 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Your bag is empty</p>
                  <p className="text-xs text-muted-foreground">Discover quality products in our store catalog.</p>
                </div>
                <Link
                  href="/products"
                  onClick={closeCart}
                  className="inline-block rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
                >
                  Explore Catalog
                </Link>
              </div>
            )}
          </div>

          {/* Drawer Footer / Checkout CTA */}
          {items.length > 0 && (
            <div className="border-t border-border p-5 bg-card space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold text-foreground text-base">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Shipping and taxes calculated during checkout.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="flex items-center justify-center rounded-lg border border-border py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  View Cart Page
                </Link>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-transform active:scale-[0.98]"
                >
                  <span>Checkout</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Encrypted & secure checkout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

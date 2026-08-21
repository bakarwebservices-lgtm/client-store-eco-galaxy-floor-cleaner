'use client';
import { formatCurrency } from '@/lib/format';

import React, { useState } from 'react';
import { ProductGallery } from '@/components/storefront/ProductGallery';
import { VariantSelector, VariantOption } from '@/components/storefront/VariantSelector';
import { ShoppingBag, Heart, ShieldCheck, Truck, RotateCcw, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { ProductWithRelations } from '@/types';

export function ProductDetailClient({ product }: { product: ProductWithRelations }) {
  const { addItem, isLoading } = useCart();
  const variants: VariantOption[] = product.variants || [];
  const [selectedVariant, setSelectedVariant] = useState<VariantOption | null>(
    variants.length > 0 ? variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentPrice = selectedVariant?.price ?? product.price;
  const currentComparePrice = selectedVariant?.comparePrice ?? product.comparePrice;
  const hasDiscount = currentComparePrice && currentComparePrice > currentPrice;
  const isOutOfStock = selectedVariant ? selectedVariant.inventoryQty <= 0 : false;

  const handleAddToCart = async () => {
    setErrorMsg(null);
    const res = await addItem({
      productId: product.id,
      variantId: selectedVariant?.id || null,
      quantity,
      productName: product.name,
      price: currentPrice,
    });

    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  // Waitlist state
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;

    setWaitlistLoading(true);
    setWaitlistError(null);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: waitlistEmail,
          productId: product.id,
          variantId: selectedVariant?.id || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setWaitlistSuccess(true);
    } catch (err: any) {
      setWaitlistError(err.message || 'Something went wrong');
    } finally {
      setWaitlistLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Left: Product Image Gallery */}
      <ProductGallery
        images={product.images}
        productName={product.name}
        activeVariantId={selectedVariant?.id}
      />

      {/* Right: Product Purchase Details */}
      <div className="flex flex-col space-y-6">
        <div className="space-y-2">
          {product.vendor && (
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {product.vendor}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {product.name}
          </h1>

          {/* Pricing */}
          <div className="flex items-baseline gap-3 pt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {formatCurrency(currentPrice)}
            </span>
            {hasDiscount && (
              <span className="text-base text-muted-foreground line-through">
                {formatCurrency(currentComparePrice)}
              </span>
            )}
          </div>
        </div>

        {/* Variant Selector */}
        {variants.length > 0 && (
          <div className="border-t border-border pt-4">
            <VariantSelector
              variants={variants}
              selectedVariant={selectedVariant}
              onSelectVariant={(v) => {
                setSelectedVariant(v);
                setErrorMsg(null);
              }}
            />
          </div>
        )}

        {errorMsg && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Quantity and Actions */}
        <div className="space-y-3 border-t border-border pt-4">
          {isOutOfStock ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Currently Out of Stock
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your email address to receive an immediate notification as soon as this item is restocked.
              </p>

              {waitlistSuccess ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-700">
                  <span>✓ You're on the restock waitlist! We'll email you when it arrives.</span>
                </div>
              ) : (
                <form onSubmit={handleWaitlistSubmit} className="space-y-2">
                  <div className="flex gap-2">
                    <label htmlFor="waitlist-email" className="sr-only">
                      Email Address for Restock Alert
                    </label>
                    <input
                      id="waitlist-email"
                      type="email"
                      required
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="Enter your email for restock alert..."
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="submit"
                      disabled={waitlistLoading}
                      className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors shrink-0"
                    >
                      {waitlistLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Notify Me'}
                    </button>
                  </div>
                  {waitlistError && (
                    <p className="text-[11px] text-destructive">{waitlistError}</p>
                  )}
                </form>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Quantity Stepper */}
              <div className="flex items-center rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="px-2 text-sm font-semibold text-foreground min-w-[24px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleAddToCart}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground shadow transition-transform active:scale-[0.98] hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4" />
                )}
                <span>Add to Bag</span>
              </button>

              {/* Wishlist Button */}
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                aria-label="Add to wishlist"
              >
                <Heart className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Value Props & Trust Badges */}
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/20">
            <Truck className="h-4 w-4 text-primary" />
            <span>Fast Delivery</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/20">
            <RotateCcw className="h-4 w-4 text-primary" />
            <span>Easy Returns</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/20">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Authentic</span>
          </div>
        </div>

        {/* Product Description */}
        <div className="border-t border-border pt-6 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Product Overview
          </h2>
          <div className="prose prose-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        </div>
      </div>
    </div>
  );
}

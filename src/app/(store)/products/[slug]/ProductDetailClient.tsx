'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/format';
import { ProductGallery } from '@/components/storefront/ProductGallery';
import { VariantSelector, VariantOption } from '@/components/storefront/VariantSelector';
import {
  ShoppingBag,
  Zap,
  Heart,
  ShieldCheck,
  Truck,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { SafeHtml } from '@/components/storefront/SafeHtml';
import { ProductWithRelations } from '@/types';

export function ProductDetailClient({ product }: { product: ProductWithRelations }) {
  const router = useRouter();
  const { addItem, closeCart, isLoading } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);
  const variants: VariantOption[] = product.variants || [];
  const [selectedVariant, setSelectedVariant] = useState<VariantOption | null>(
    variants.length > 0 ? variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBuyNowLoading, setIsBuyNowLoading] = useState(false);

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
      openDrawer: true,
    });

    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleBuyNow = async () => {
    setErrorMsg(null);
    setIsBuyNowLoading(true);

    const res = await addItem({
      productId: product.id,
      variantId: selectedVariant?.id || null,
      quantity,
      productName: product.name,
      price: currentPrice,
      openDrawer: false,
    });

    if (res.success) {
      closeCart();
      router.push('/checkout');
    } else {
      setIsBuyNowLoading(false);
      if (res.error) {
        setErrorMsg(res.error);
      }
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
          <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1 pt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {formatCurrency(currentPrice)}
            </span>
            {hasDiscount && (
              <span className="text-base sm:text-lg text-muted-foreground/75 line-through decoration-muted-foreground/60 decoration-1 font-normal inline-block ml-2">
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

        {/* Quantity and Action Buttons */}
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
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Quantity Stepper */}
                <div className="flex items-center justify-between sm:justify-start rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3.5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="px-2 text-sm font-semibold text-foreground min-w-[28px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-3.5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Add to Bag Button */}
                <button
                  type="button"
                  disabled={isLoading || isBuyNowLoading}
                  onClick={handleAddToCart}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary bg-transparent py-3 px-4 text-xs sm:text-sm font-bold text-primary shadow-sm transition-all hover:bg-primary/10 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  {isLoading && !isBuyNowLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}
                  <span>Add to Bag</span>
                </button>

                {/* Buy Now Button (Direct to Checkout) */}
                <button
                  type="button"
                  disabled={isLoading || isBuyNowLoading}
                  onClick={handleBuyNow}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 text-xs sm:text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  {isBuyNowLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 fill-primary-foreground" />
                  )}
                  <span>Buy Now</span>
                </button>

                {/* Wishlist Button */}
                <button
                  type="button"
                  onClick={() =>
                    toggleWishlist({
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      price: currentPrice,
                      imageUrl: product.images?.[0]?.url,
                    })
                  }
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all ${
                    isWishlisted
                      ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400'
                      : 'border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/30'
                  }`}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  title={isWishlisted ? 'Saved in your wishlist' : 'Add to wishlist'}
                >
                  <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Value Propositions / Badges */}
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
          <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 p-3 text-center">
            <Truck className="mb-1 h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-foreground">Express Delivery</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 p-3 text-center">
            <RotateCcw className="mb-1 h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-foreground">Easy Returns</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 p-3 text-center">
            <ShieldCheck className="mb-1 h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-foreground">100% Authentic</span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="border-t border-border pt-4 space-y-2">
            <h2 className="text-sm font-bold text-foreground">Product Description</h2>
            <SafeHtml content={product.description} className="text-xs" />
          </div>
        )}
      </div>
    </div>
  );
}

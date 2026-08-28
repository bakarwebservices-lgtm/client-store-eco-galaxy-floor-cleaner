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
  Banknote,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Loader2,
  Droplets,
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
  const discountPercent = hasDiscount
    ? Math.round(((currentComparePrice - currentPrice) / currentComparePrice) * 100)
    : 0;
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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 py-6">
      {/* Left: Product Image Gallery */}
      <div className="lg:col-span-7">
        <ProductGallery
          images={product.images}
          productName={product.name}
          activeVariantId={selectedVariant?.id}
        />
      </div>

      {/* Right: Product Purchase Details */}
      <div className="flex flex-col space-y-6 lg:col-span-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary border border-primary/20">
              <Sparkles className="h-3 w-3" style={{ color: 'var(--accent, #10ACB7)' }} />
              Eco Galaxy Official
            </span>
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Free Delivery
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-snug">
            {product.name}
          </h1>

          {/* Pricing */}
          <div className="flex items-baseline flex-wrap gap-3 pt-1">
            <span className="text-3xl font-extrabold text-foreground">
              {formatCurrency(currentPrice)}
            </span>
            {hasDiscount && (
              <span className="text-lg text-muted-foreground line-through font-medium">
                {formatCurrency(currentComparePrice)}
              </span>
            )}
            {hasDiscount && (
              <span
                style={{ backgroundColor: 'var(--accent, #10ACB7)' }}
                className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-sm"
              >
                Save {discountPercent}%
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Price includes all taxes &amp; Free Delivery nationwide across Pakistan. Cash on Delivery available.
          </p>
        </div>

        {/* Variant Selector */}
        {variants.length > 1 && (
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
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Quantity and Action Buttons */}
        <div className="space-y-3 border-t border-border pt-4">
          {isOutOfStock ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-amber-700">
                  Currently Out of Stock
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your email to receive an alert as soon as this pack is restocked.
              </p>

              {waitlistSuccess ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>You are on the restock waitlist! We will notify you when available.</span>
                </div>
              ) : (
                <form onSubmit={handleWaitlistSubmit} className="space-y-2">
                  <div className="flex gap-2">
                    <label htmlFor="waitlist-email" className="sr-only">
                      Email Address
                    </label>
                    <input
                      id="waitlist-email"
                      type="email"
                      required
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="Enter your email address..."
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
                <div className="flex items-center justify-between sm:justify-start rounded-xl border border-border bg-card shadow-sm">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3.5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="px-2 text-sm font-semibold text-foreground min-w-[32px] text-center">
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
                  <span>Add to Cart</span>
                </button>

                {/* Buy Now Button */}
                <button
                  type="button"
                  disabled={isLoading || isBuyNowLoading}
                  onClick={handleBuyNow}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 text-xs sm:text-sm font-extrabold text-primary-foreground shadow-md transition-all hover:bg-primary-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  {isBuyNowLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 fill-primary-foreground" />
                  )}
                  <span>Buy Now (COD)</span>
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
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/30'
                  }`}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  title={isWishlisted ? 'Saved in wishlist' : 'Add to wishlist'}
                >
                  <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Direct WhatsApp Order CTA */}
              <a
                href={`https://wa.me/923464815775?text=${encodeURIComponent(
                  `Hi Eco Galaxy, I want to order ${quantity}x ${product.name} (Rs. ${currentPrice * quantity}) via Cash on Delivery.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-[#20bd5a] transition-colors"
              >
                <MessageCircle className="h-4 w-4 fill-current" />
                <span>Quick Order via WhatsApp (0346 4815775)</span>
              </a>
            </div>
          )}
        </div>

        {/* Value Propositions / Badges - Zero Emojis */}
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
          <div className="flex flex-col items-center justify-center rounded-xl bg-[#f4f6f0] p-3 text-center border border-emerald-200/50">
            <Truck className="mb-1 h-4 w-4 text-emerald-800" />
            <span className="text-[10px] font-bold text-foreground">Free Delivery</span>
            <span className="text-[9px] text-muted-foreground">All over Pakistan</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-[#f4f6f0] p-3 text-center border border-emerald-200/50">
            <Banknote className="mb-1 h-4 w-4 text-emerald-800" />
            <span className="text-[10px] font-bold text-foreground">Cash On Delivery</span>
            <span className="text-[9px] text-muted-foreground">Pay upon arrival</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-[#f4f6f0] p-3 text-center border border-emerald-200/50">
            <ShieldCheck className="mb-1 h-4 w-4 text-emerald-800" />
            <span className="text-[10px] font-bold text-foreground">100% Authentic</span>
            <span className="text-[9px] text-muted-foreground">Direct from brand</span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="border-t border-border pt-4 space-y-2">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Product Details</h2>
            <SafeHtml content={product.description} className="text-xs leading-relaxed" />
          </div>
        )}
      </div>
    </div>
  );
}

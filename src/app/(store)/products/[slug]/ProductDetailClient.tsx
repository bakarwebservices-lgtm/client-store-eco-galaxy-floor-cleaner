'use client';

import React, { useState } from 'react';
import { ProductGallery } from '@/components/storefront/ProductGallery';
import { VariantSelector, VariantOption } from '@/components/storefront/VariantSelector';
import { ShoppingBag, Heart, ShieldCheck, Truck, RotateCcw } from 'lucide-react';

export function ProductDetailClient({ product }: { product: any }) {
  const variants: VariantOption[] = product.variants || [];
  const [selectedVariant, setSelectedVariant] = useState<VariantOption | null>(
    variants.length > 0 ? variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  // Price calculates variant price override if set
  const currentPrice = selectedVariant?.price ?? product.price;
  const currentComparePrice = selectedVariant?.comparePrice ?? product.comparePrice;
  const hasDiscount = currentComparePrice && currentComparePrice > currentPrice;
  const isOutOfStock = selectedVariant ? selectedVariant.inventoryQty <= 0 : false;

  const handleAddToCart = () => {
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
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
              Rs. {currentPrice.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-base text-muted-foreground line-through">
                Rs. {currentComparePrice?.toLocaleString()}
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
              onSelectVariant={(v) => setSelectedVariant(v)}
            />
          </div>
        )}

        {/* Quantity and Actions */}
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-3">
            {/* Quantity Counter */}
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
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground shadow transition-transform active:scale-[0.98] hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>{isAdded ? 'Added to Cart ✓' : isOutOfStock ? 'Out of Stock' : 'Add to Bag'}</span>
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

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, ArrowRight, Sparkles, Loader2 } from 'lucide-react';

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  hasVariants?: boolean;
  images: {
    url: string;
    altText?: string | null;
  }[];
}

export function ProductCard({ product }: { product: ProductCardProps }) {
  const { addItem, openCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const primaryImage = product.images[0]?.url;
  const secondaryImage = product.images[1]?.url;

  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding) return;
    setIsAdding(true);
    try {
      await addItem({
        productId: product.id,
        quantity: 1,
        productName: product.name,
        price: product.price,
        openDrawer: true,
      });
      openCart();
    } catch (err) {
      console.error('Failed to add product to cart:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group relative flex flex-col h-full overflow-hidden rounded-2xl border border-border/80 bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-xl shadow-sm">
      {/* Image container */}
      <Link href={`/products/${product.slug}`} className="relative aspect-[4/5] w-full overflow-hidden bg-muted/20 block">
        {primaryImage ? (
          <>
            <Image
              src={primaryImage}
              alt={product.images[0]?.altText || product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
              className={`object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
                secondaryImage ? 'group-hover:opacity-0' : ''
              }`}
            />
            {secondaryImage && (
              <Image
                src={secondaryImage}
                alt={product.images[1]?.altText || product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                className="absolute inset-0 object-cover object-center opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/40 text-xs text-muted-foreground">
            No Image
          </div>
        )}

        {/* Discount Badge */}
        <div className="absolute left-2 top-2 sm:left-3 sm:top-3 flex flex-col gap-1 z-10">
          {hasDiscount && (
            <span
              style={{ backgroundColor: 'var(--accent, #10ACB7)' }}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-white shadow"
            >
              <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Save {discountPercent}%
            </span>
          )}
        </div>

        {/* COD Badge */}
        <div className="absolute right-2 top-2 sm:right-3 sm:top-3 z-10">
          <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm border border-border/60">
            COD
          </span>
        </div>
      </Link>

      {/* Info Section */}
      <div className="flex flex-1 flex-col p-3 sm:p-5 space-y-2 sm:space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">
            <span>Eco Galaxy</span>
            <span>•</span>
            <span>Lavender</span>
          </div>
          <Link href={`/products/${product.slug}`} className="block">
            <h3 className="text-xs sm:text-base font-bold text-foreground transition-colors group-hover:text-primary line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Price display */}
        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 pt-0.5">
          <span className="text-sm sm:text-lg font-extrabold text-foreground">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-[11px] sm:text-xs text-muted-foreground line-through font-medium">
              {formatCurrency(product.comparePrice)}
            </span>
          )}
          <span className="ml-auto text-[9px] sm:text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
            Free Delivery
          </span>
        </div>

        {/* CTAs: 1 column on mobile 2-col cards, 2 columns on tablet/desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 pt-1 mt-auto">
          <button
            type="button"
            disabled={isAdding}
            onClick={handleQuickAdd}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold text-primary transition-colors hover:bg-primary/15 active:scale-[0.98] disabled:opacity-60"
            aria-label={`Add ${product.name} to cart`}
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5" />
            )}
            <span>{isAdding ? 'Adding...' : 'Add to Cart'}</span>
          </button>
          <Link
            href={`/products/${product.slug}`}
            className="w-full flex items-center justify-center gap-1 rounded-xl bg-primary py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98]"
          >
            <span>View Pack</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency } from '@/lib/format';

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  hasVariants?: boolean;
  aspectRatio?: 'square' | 'portrait' | 'wide';
  images: Array<{
    url: string;
    altText?: string | null;
  }>;
}

export function ProductCard({ product }: { product: ProductCardProps }) {
  const primaryImage = product.images[0];
  const secondaryImage = product.images[1];
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;

  const aspectRatioClass = 
    product.aspectRatio === 'portrait' ? 'aspect-[3/4]' :
    product.aspectRatio === 'wide' ? 'aspect-[4/3]' :
    'aspect-square';

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-md">
      {/* Image Container */}
      <Link href={`/products/${product.slug}`} className={`relative ${aspectRatioClass} w-full overflow-hidden bg-muted/20`}>
        {primaryImage ? (
          <>
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText || product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
            {secondaryImage && (
              <Image
                src={secondaryImage.url}
                alt={secondaryImage.altText || product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="absolute inset-0 object-cover object-center opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/40 text-xs text-muted-foreground">
            No Image
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute left-2.5 top-2.5 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground shadow">
            Sale
          </div>
        )}
      </Link>

      {/* Info Section */}
      <div className="flex flex-1 flex-col p-3 sm:p-4 space-y-1.5">
        <Link href={`/products/${product.slug}`} className="group-hover:text-primary transition-colors">
          <h3 className="text-xs sm:text-sm font-semibold line-clamp-1 text-foreground">
            {product.name}
          </h3>
        </Link>

        {/* Price display */}
        <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-0.5 mt-auto pt-1">
          <span className="text-sm sm:text-base font-bold text-foreground">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground/75 line-through decoration-muted-foreground/60 decoration-1 font-normal inline-block ml-1">
              {formatCurrency(product.comparePrice)}
            </span>
          )}
        </div>

        {product.hasVariants && (
          <p className="text-[11px] text-muted-foreground">Multiple options available</p>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export interface GalleryImage {
  id?: string;
  url: string;
  altText?: string | null;
  variantId?: string | null;
}

export function ProductGallery({
  images,
  productName,
  activeVariantId,
}: {
  images: GalleryImage[];
  productName: string;
  activeVariantId?: string | null;
}) {
  // If a variant image matches active variant, prioritize it
  const initialIndex = Math.max(
    0,
    images.findIndex((img) => activeVariantId && img.variantId === activeVariantId)
  );

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  if (images.length === 0) {
    return (
      <div className="aspect-square w-full rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground text-sm">
        No images available
      </div>
    );
  }

  const selectedImage = images[selectedIndex] || images[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Primary Display */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-sm">
        <Image
          src={selectedImage.url}
          alt={selectedImage.altText || productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-center"
        />
      </div>

      {/* Thumbnail Bar */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                  isSelected ? 'border-primary shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                aria-label={`View image ${idx + 1}`}
              >
                <Image
                  src={img.url}
                  alt={img.altText || `${productName} thumbnail ${idx + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover object-center"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

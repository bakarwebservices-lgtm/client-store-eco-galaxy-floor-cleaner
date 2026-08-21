'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Film, Play } from 'lucide-react';

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
  const isVideoUrl = (url: string) => {
    return url.match(/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i) !== null;
  };

  // If a variant image matches active variant, prioritize it
  const initialIndex = Math.max(
    0,
    images.findIndex((img) => activeVariantId && img.variantId === activeVariantId)
  );

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  useEffect(() => {
    if (activeVariantId) {
      const vIdx = images.findIndex((img) => img.variantId === activeVariantId);
      if (vIdx !== -1) {
        setSelectedIndex(vIdx);
      }
    }
  }, [activeVariantId, images]);

  if (images.length === 0) {
    return (
      <div className="aspect-square w-full rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground text-sm border border-border">
        No images available
      </div>
    );
  }

  const selectedItem = images[selectedIndex] || images[0];
  const isCurrentVideo = isVideoUrl(selectedItem.url);

  return (
    <div className="flex flex-col gap-3">
      {/* Primary Display (Image or Video Player) */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-sm flex items-center justify-center">
        {isCurrentVideo ? (
          <video
            key={selectedItem.url}
            src={selectedItem.url}
            controls
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-contain bg-black"
          />
        ) : (
          <Image
            src={selectedItem.url}
            alt={selectedItem.altText || productName}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center"
          />
        )}
      </div>

      {/* Thumbnail Bar (Supports 10+ items with horizontal scroll) */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {images.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            const isThumbVideo = isVideoUrl(img.url);

            return (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30 shadow-md scale-105'
                    : 'border-border/80 opacity-70 hover:opacity-100 bg-muted/20'
                }`}
                aria-label={`View media ${idx + 1}`}
              >
                {isThumbVideo ? (
                  <div className="flex h-full w-full items-center justify-center bg-slate-950 text-white">
                    <Film className="h-5 w-5 text-primary" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-4 w-4 text-white drop-shadow fill-white/80" />
                    </div>
                  </div>
                ) : (
                  <Image
                    src={img.url}
                    alt={img.altText || `${productName} thumbnail ${idx + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover object-center"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

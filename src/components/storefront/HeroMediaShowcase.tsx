'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  PackageOpen, 
  Star,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export interface HeroImageSlide {
  url: string;
  mobileUrl?: string;
  altText?: string;
  link?: string;
}

export interface HeroProductCardFallback {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  imageUrl?: string;
  altText?: string;
}

export interface HeroMediaShowcaseProps {
  mediaType?: 'product' | 'image' | 'video';
  images?: HeroImageSlide[];
  videoUrl?: string;
  videoPoster?: string;
  slideInterval?: number; // ms, default 3000
  fallbackProduct?: HeroProductCardFallback | null;
  storeName?: string;
}

export function HeroMediaShowcase({
  mediaType = 'product',
  images = [],
  videoUrl = '',
  videoPoster = '',
  slideInterval = 3000,
  fallbackProduct = null,
  storeName = 'Store',
}: HeroMediaShowcaseProps) {
  // Slider state
  const validImages = images.filter((img) => img && img.url && img.url.trim().length > 0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Auto-slide effect for images
  useEffect(() => {
    if (mediaType !== 'image' || validImages.length <= 1 || isPaused) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % validImages.length);
    }, Math.max(slideInterval, 1000));

    return () => clearInterval(timer);
  }, [mediaType, validImages.length, isPaused, slideInterval]);

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % validImages.length);
  };

  const toggleAudio = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Resolve actual video URL and poster intelligently (with fallback if video was pasted/uploaded into poster)
  const isPosterVideo = Boolean(videoPoster && videoPoster.match(/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i));
  const resolvedVideoUrl = videoUrl.trim() || (isPosterVideo ? videoPoster : '');
  const resolvedVideoPoster = isPosterVideo ? (videoUrl.match(/\.(jpg|jpeg|png|webp|avif)(\?.*)?$/i) ? videoUrl : '') : videoPoster;

  // 1. VIDEO SHOWCASE (Exactly 1 Video)
  if (mediaType === 'video' && resolvedVideoUrl.trim()) {
    return (
      <div className="relative mx-auto max-w-sm lg:max-w-none">
        {/* Ambient Glow */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-primary/30 to-primary/10 blur-2xl opacity-60" />

        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={resolvedVideoUrl}
              poster={resolvedVideoPoster || undefined}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              className="h-full w-full object-cover object-center"
            />

            {/* Video overlay badge */}
            <div className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 pointer-events-none">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Featured Showcase</span>
            </div>

            {/* Mute / Unmute Control */}
            <button
              type="button"
              onClick={toggleAudio}
              aria-label={isMuted ? 'Unmute video audio' : 'Mute video audio'}
              className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105 active:scale-95 shadow-md focus:outline-none"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. IMAGE SLIDER (Up to 3 Images)
  if (mediaType === 'image' && validImages.length > 0) {
    const activeSlide = validImages[currentSlide] || validImages[0];

    const SlideContent = (
      <div 
        className="relative aspect-[4/3] w-full overflow-hidden bg-muted/20"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {validImages.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {slide.mobileUrl ? (
              <>
                {/* Mobile image (phones/small screens) */}
                <div className="block sm:hidden absolute inset-0">
                  <Image
                    src={slide.mobileUrl}
                    alt={slide.altText || `${storeName} showcase banner ${idx + 1}`}
                    fill
                    priority={idx === 0}
                    className="object-cover object-top"
                    sizes="100vw"
                  />
                </div>
                {/* Desktop/Tablet image */}
                <div className="hidden sm:block absolute inset-0">
                  <Image
                    src={slide.url}
                    alt={slide.altText || `${storeName} showcase banner ${idx + 1}`}
                    fill
                    priority={idx === 0}
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </>
            ) : (
              <Image
                src={slide.url}
                alt={slide.altText || `${storeName} showcase banner ${idx + 1}`}
                fill
                priority={idx === 0}
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            )}
          </div>
        ))}

        {/* Floating Brand Badge */}
        <div className="absolute top-3 left-3 z-20 rounded-full bg-primary/90 backdrop-blur-md px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm flex items-center gap-1.5 pointer-events-none">
          <Sparkles className="h-3 w-3" />
          <span>New Release</span>
        </div>

        {/* Subtle Navigation Arrows (Only if multiple slides) */}
        {validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevSlide}
              aria-label="Previous slide"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/75 hover:scale-105 active:scale-95 focus:outline-none"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleNextSlide}
              aria-label="Next slide"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/75 hover:scale-105 active:scale-95 focus:outline-none"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Bottom Pagination Dots */}
            <div className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center gap-1.5 pointer-events-auto">
              {validImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentSlide(idx);
                  }}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${
                    idx === currentSlide
                      ? 'w-6 bg-white shadow-sm'
                      : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );

    return (
      <div className="relative mx-auto max-w-sm lg:max-w-none">
        {/* Ambient Glow */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-primary/30 to-primary/10 blur-2xl opacity-60" />

        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          {activeSlide.link ? (
            <Link
              href={activeSlide.link}
              className="block cursor-pointer focus:outline-none group"
            >
              {SlideContent}
            </Link>
          ) : (
            SlideContent
          )}
        </div>
      </div>
    );
  }

  // 3. PRODUCT SHOWCASE (Fallback / Default)
  if (fallbackProduct) {
    return (
      <div className="relative mx-auto max-w-sm lg:max-w-none">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-primary/30 to-primary/10 blur-2xl opacity-60" />

        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl p-6 space-y-4">
          <Link href={`/products/${fallbackProduct.slug}`} className="block">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted/30">
              {fallbackProduct.imageUrl ? (
                <Image
                  src={fallbackProduct.imageUrl}
                  alt={fallbackProduct.altText || fallbackProduct.name}
                  fill
                  className="object-cover object-center transition-transform duration-500 hover:scale-105"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <PackageOpen className="h-10 w-10 opacity-40" />
                </div>
              )}
              <div className="absolute top-3 left-3 rounded-full bg-primary/90 backdrop-blur-md px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                Featured Release
              </div>
            </div>
          </Link>

          <div className="flex items-center justify-between">
            <Link href={`/products/${fallbackProduct.slug}`} className="hover:underline">
              <h3 className="font-semibold text-foreground text-base line-clamp-1">{fallbackProduct.name}</h3>
              <p className="text-xs text-muted-foreground">Premium Selection</p>
            </Link>
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(fallbackProduct.price, fallbackProduct.currency)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-amber-500 text-xs">
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="text-muted-foreground ml-1">(Verified Quality)</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. EMPTY PLACEHOLDER
  return (
    <div className="relative mx-auto max-w-sm lg:max-w-none">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl p-8 space-y-4 text-center">
        <div className="flex h-36 w-full items-center justify-center rounded-2xl bg-muted/30">
          <PackageOpen className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h3 className="font-bold text-foreground text-lg">{storeName}</h3>
        <p className="text-xs text-muted-foreground">Visual showcase is ready for your products or media.</p>
      </div>
    </div>
  );
}

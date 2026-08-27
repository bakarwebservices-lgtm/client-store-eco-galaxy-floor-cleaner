export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { ProductStatus } from '@prisma/client';
import { ProductCard, ProductCardProps } from '@/components/storefront/ProductCard';
import { NewsletterSignup } from '@/components/storefront/NewsletterSignup';
import { formatCurrency, stripHtml } from '@/lib/format';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Headphones, 
  Tag, 
  Star, 
  CheckCircle2,
  PackageOpen
} from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  let storeName = 'Official Store';
  let tagline = 'Discover premium products with curated design, high performance, and swift delivery.';
  try {
    const settings = await db.setting.findMany({
      where: { key: { in: ['store.name', 'store.tagline', 'store.description'] } },
    });
    for (const s of settings) {
      if (s.key === 'store.name' && s.value) storeName = String(s.value);
      if ((s.key === 'store.tagline' || s.key === 'store.description') && s.value) tagline = String(s.value);
    }
  } catch {
    // fallback
  }

  return {
    title: `Home — ${storeName}`,
    description: stripHtml(tagline),
    alternates: {
      canonical: '/',
    },
  };
}

export default async function HomePage() {
  let featuredProducts: ProductCardProps[] = [];
  let dbCategories: Array<{ id: string; name: string; slug: string }> = [];
  const settingsMap: Record<string, string> = {};

  try {
    const rawSettings = await db.setting.findMany();
    for (const s of rawSettings) {
      settingsMap[s.key] = typeof s.value === 'string' ? s.value : (s.value != null ? String(s.value) : '');
    }

    const dbProds = await db.product.findMany({
      where: {
        deletedAt: null,
        status: ProductStatus.ACTIVE,
      },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
          take: 2,
        },
        variants: {
          take: 2,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    if (dbProds.length > 0) {
      featuredProducts = dbProds.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
        hasVariants: p.variants.length > 1,
        images: p.images.map((img) => ({ url: img.url, altText: img.altText })),
      }));
    }

    const cats = await db.category.findMany({
      where: { isActive: true },
      take: 4,
    });
    dbCategories = cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
  } catch {
    // Database fallback
  }

  const storeName = settingsMap['store.name'] || 'Official Store';
  const heroBadge = settingsMap['store.hero_badge'] || 'New Season Collection';
  const heroTitle = settingsMap['store.hero_title'] || 'Curated Design. Engineered Quality.';
  const heroSubtitle = settingsMap['store.hero_subtitle'] || 'Discover our latest premium releases with swift shipping and dedicated customer service.';
  const currency = settingsMap['store.currency'] || 'USD';
  const freeShippingThreshold = Number(settingsMap['shipping.free_threshold']) || 75;
  const guaranteeStat = settingsMap['store.trust_guarantee_stat'] || '100%';
  const guaranteeLabel = settingsMap['store.trust_guarantee_label'] || 'Original Guarantee';
  const deliveryStat = settingsMap['store.trust_delivery_stat'] || '2-3 Days';
  const deliveryLabel = settingsMap['store.trust_delivery_label'] || 'Express Shipping';
  const ratingStat = settingsMap['store.trust_rating_stat'] || '4.9/5';
  const ratingLabel = settingsMap['store.trust_rating_label'] || 'Customer Satisfaction';

  return (
    <div className="flex flex-col space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-card via-background to-background pt-12 sm:pt-20 pb-16 sm:pb-28 border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{heroBadge}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                {heroTitle}
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                {heroSubtitle}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98]"
                >
                  Explore Catalog
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>

              {/* Trust Badges from Settings */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/60 text-left">
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{guaranteeStat}</p>
                  <p className="text-xs text-muted-foreground">{guaranteeLabel}</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{deliveryStat}</p>
                  <p className="text-xs text-muted-foreground">{deliveryLabel}</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{ratingStat}</p>
                  <p className="text-xs text-muted-foreground">{ratingLabel}</p>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-sm lg:max-w-none">
                {/* Glow Backdrop */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-primary/30 to-primary/10 blur-2xl opacity-60" />
                
                {featuredProducts.length > 0 ? (
                  <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl p-6 space-y-4">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted/30">
                      {featuredProducts[0].images[0]?.url ? (
                        <Image
                          src={featuredProducts[0].images[0].url}
                          alt={featuredProducts[0].name}
                          fill
                          className="object-cover object-center"
                          priority
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <PackageOpen className="h-10 w-10 opacity-40" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 rounded-full bg-primary/90 backdrop-blur px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                        Featured Release
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground text-base">{featuredProducts[0].name}</h3>
                        <p className="text-xs text-muted-foreground">Premium Selection</p>
                      </div>
                      <span className="text-lg font-bold text-foreground">{formatCurrency(featuredProducts[0].price, currency)}</span>
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
                ) : (
                  <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl p-8 space-y-4 text-center">
                    <div className="flex h-32 w-full items-center justify-center rounded-2xl bg-muted/30">
                      <PackageOpen className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg">{storeName}</h3>
                    <p className="text-xs text-muted-foreground">Premium catalog is ready for products.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITION PILLARS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Worldwide Shipping</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Free standard shipping on all orders over {formatCurrency(freeShippingThreshold, currency)}.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Secure Checkout</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Encrypted transactions via Cards & COD.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Hassle-Free Returns</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Money-back guarantee and simple returns.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Dedicated Support</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Fast assistance from our support team.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CATEGORY GRID */}
      {dbCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Featured Collections</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Shop by Category</h2>
            </div>
            <Link href="/products" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
              Browse all <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {dbCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/50 p-6 flex flex-col justify-between min-h-[140px]"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mt-1">{cat.name}</h3>
                </div>
                <div className="flex items-center text-xs font-medium text-primary mt-4">
                  <span>Explore items</span>
                  <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. FEATURED PRODUCTS SHOWCASE */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                <Tag className="h-3.5 w-3.5" />
                <span>Trending Releases</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Featured Products</h2>
            </div>
            <Link href="/products" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
              See all products <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 5. PROMOTIONAL BANNER */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-8 sm:p-12 text-primary-foreground shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-block rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
              Special Welcome Offer
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Quality Guaranteed On Every Order
            </h2>
            <p className="text-sm sm:text-base text-primary-foreground/90">
              Discover curated products backed by comprehensive warranties, swift delivery, and responsive support.
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-xl bg-background px-6 py-3 text-sm font-semibold text-foreground shadow transition-transform hover:scale-105"
              >
                Shop the Catalog
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. NEWSLETTER SECTION */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Stay in the Loop
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Subscribe for exclusive product drops, updates, and special promotions.
          </p>
          <div className="max-w-md mx-auto pt-2">
            <NewsletterSignup />
          </div>
        </div>
      </section>
    </div>
  );
}

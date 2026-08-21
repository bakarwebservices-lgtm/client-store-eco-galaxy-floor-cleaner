export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { ProductStatus } from '@prisma/client';
import { ProductCard, ProductCardProps } from '@/components/storefront/ProductCard';
import { NewsletterSignup } from '@/components/storefront/NewsletterSignup';
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
  Layers, 
  ExternalLink 
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Home — AWStore SaaS eCommerce Platform',
  description: 'Discover premium products with curated design, high-performance catalog, secure checkout, and instant delivery.',
  alternates: {
    canonical: '/',
  },
};

// Fallback demo products for instant visual preview
const DEMO_FEATURED_PRODUCTS: ProductCardProps[] = [
  {
    id: 'demo-1',
    name: 'Aura Minimalist Smart Ring',
    slug: 'aura-smart-ring',
    price: 199.00,
    comparePrice: 249.00,
    hasVariants: true,
    images: [
      { url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80', altText: 'Smart Ring' },
      { url: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80', altText: 'Smart Ring Detail' },
    ],
  },
  {
    id: 'demo-2',
    name: 'Vortex Carbon Chronograph Watch',
    slug: 'vortex-chronograph',
    price: 349.00,
    comparePrice: 420.00,
    hasVariants: true,
    images: [
      { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', altText: 'Chronograph Watch' },
      { url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80', altText: 'Watch Detail' },
    ],
  },
  {
    id: 'demo-3',
    name: 'Titanium Ceramic Band Ring',
    slug: 'titanium-ceramic-ring',
    price: 129.00,
    comparePrice: null,
    hasVariants: true,
    images: [
      { url: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80', altText: 'Titanium Ring' },
    ],
  },
  {
    id: 'demo-4',
    name: 'Precision Wireless Audio Pods',
    slug: 'precision-wireless-audio',
    price: 179.00,
    comparePrice: 219.00,
    hasVariants: false,
    images: [
      { url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80', altText: 'Wireless Pods' },
    ],
  },
];

const DEMO_CATEGORIES = [
  { name: 'Smart Rings & Bands', slug: 'smart-rings', count: '14 items', img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80' },
  { name: 'Chronographs & Watches', slug: 'watches', count: '22 items', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80' },
  { name: 'Wireless & Audio', slug: 'audio', count: '18 items', img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80' },
  { name: 'Accessories & EDC', slug: 'accessories', count: '30 items', img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80' },
];

export default async function HomePage() {
  let featuredProducts: ProductCardProps[] = [];
  let dbCategories: Array<{ id: string; name: string; slug: string }> = [];

  try {
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
    // Database is offline/empty; fallback to rich preview data
  }

  const productsToShow = featuredProducts.length > 0 ? featuredProducts : DEMO_FEATURED_PRODUCTS;

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
                <span>Next-Generation SaaS Storefront</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                Curated Design. <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Engineered Performance.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                Explore a modern collection of smart accessories, precision timepieces, and high-end essentials with frictionless checkout and real-time inventory.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Explore Catalog
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Admin Portal
                  <ExternalLink className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/60 text-left">
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">100%</p>
                  <p className="text-xs text-muted-foreground">Original Guarantee</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">2-Day</p>
                  <p className="text-xs text-muted-foreground">Express Delivery</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">4.9/5</p>
                  <p className="text-xs text-muted-foreground">Customer Rating</p>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-sm lg:max-w-none">
                {/* Glow Backdrop */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-primary/30 to-primary/10 blur-2xl opacity-60" />
                
                <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl p-6 space-y-4">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted/30">
                    <Image
                      src="https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80"
                      alt="Featured Item"
                      fill
                      className="object-cover object-center"
                      priority
                    />
                    <div className="absolute top-3 left-3 rounded-full bg-primary/90 backdrop-blur px-3 py-1 text-xs font-semibold text-white shadow">
                      Trending Now
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-base">Aura Smart Ring Pro</h3>
                      <p className="text-xs text-muted-foreground">Titanium / Matte Black</p>
                    </div>
                    <span className="text-lg font-bold text-foreground">$199.00</span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-500 text-xs">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="text-muted-foreground ml-1">(128 reviews)</span>
                  </div>
                </div>
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
              <p className="text-xs text-muted-foreground mt-0.5">Free standard shipping on all orders over $75.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Secure Checkout</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Encrypted transactions via PayPal & Cards.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">30-Day Returns</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Hassle-free return policy with prepaid labels.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur transition-all hover:border-primary/40 hover:shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">24/7 Dedicated Support</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Prompt assistance from our customer care team.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED CATEGORIES BENTO GRID */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Browse by Category</h2>
            <p className="text-sm text-muted-foreground mt-1">Explore our product taxonomy and specialized collections.</p>
          </div>
          <Link href="/products" className="hidden sm:inline-flex items-center text-sm font-medium text-primary hover:underline">
            View all categories <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEMO_CATEGORIES.map((cat, idx) => (
            <Link
              key={idx}
              href={`/products?category=${cat.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/50"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40">
                <Image
                  src={cat.img}
                  alt={cat.name}
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/80">{cat.count}</p>
                <h3 className="text-base font-bold group-hover:text-primary transition-colors">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. FEATURED PRODUCTS SHOWCASE */}
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
          {productsToShow.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 5. PROMOTIONAL BANNER */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-8 sm:p-12 text-primary-foreground shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              Limited Time Welcome Offer
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Get 10% Off Your First Order
            </h2>
            <p className="text-sm sm:text-base text-primary-foreground/90">
              Apply coupon code <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">WELCOME10</span> at checkout for instant savings.
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-xl bg-background px-6 py-3 text-sm font-semibold text-foreground shadow transition-transform hover:scale-105"
              >
                Shop the Collection
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ADMIN & DEVELOPER QUICK HUB */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 sm:p-8 backdrop-blur">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Admin & Management Hub</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage inventory, restock alerts, coupons, blog posts, static pages, and theme branding.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/admin/login"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Admin Login
              </Link>
              <Link
                href="/faq"
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                FAQ Page
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                Contact Page
              </Link>
              <Link
                href="/blog"
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
              >
                Blog
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. NEWSLETTER SECTION */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Stay in the Loop
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Subscribe for exclusive product drops, early access sales, and seasonal discounts.
          </p>
          <div className="max-w-md mx-auto pt-2">
            <NewsletterSignup />
          </div>
        </div>
      </section>
    </div>
  );
}

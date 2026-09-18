export const dynamic = 'force-dynamic';
export const revalidate = 0;

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { ProductStatus } from '@prisma/client';
import { ProductCard, ProductCardProps } from '@/components/storefront/ProductCard';
import { HeroPackSelector } from '@/components/storefront/HeroPackSelector';
import { HeroMediaShowcase } from '@/components/storefront/HeroMediaShowcase';
import { UrgencyCountdown } from '@/components/storefront/UrgencyCountdown';
import { VideoShowcase } from '@/components/storefront/VideoShowcase';
import { HomeReviewsCarousel, HomeReviewItem } from '@/components/storefront/HomeReviewsCarousel';
import { HomeFaqAccordion, HomeFaqItem } from '@/components/storefront/HomeFaqAccordion';
import { stripHtml } from '@/lib/format';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  Banknote, 
  MessageCircle, 
  Droplets,
  Layers,
  Award,
  Clock,
  Sparkle
} from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  let storeName = 'Eco Galaxy';
  let description = 'Eco Galaxy Floor Cleaner — Free Delivery across Pakistan. Cash on Delivery.';
  let firstImageUrl: string | null = null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saas-product-website-seven.vercel.app';

  try {
    const [settings, products] = await Promise.all([
      db.setting.findMany({
        where: { key: { in: ['store.name', 'store.tagline', 'store.description'] } },
      }),
      db.product.findMany({
        where: { status: ProductStatus.ACTIVE, deletedAt: null },
        select: { name: true, price: true, comparePrice: true, images: { take: 1, select: { url: true } } },
        orderBy: { price: 'asc' },
        take: 10,
      }),
    ]);

    let taglineFromDb: string | null = null;
    for (const s of settings) {
      if (s.key === 'store.name' && s.value) storeName = String(s.value);
      if ((s.key === 'store.tagline' || s.key === 'store.description') && s.value)
        taglineFromDb = String(s.value);
    }

    if (products.length > 0) {
      // Pull the first product image for OpenGraph
      firstImageUrl = products[0]?.images[0]?.url ?? null;

      // Build a price-inclusive description
      const cheapest = products[0];
      const startingPrice = Number(cheapest.price);
      const currency = 'Rs.';

      // If there are multiple products, list a short pack summary
      const packSummary = products
        .slice(0, 3)
        .map((p) => `${p.name} — ${currency} ${Number(p.price).toLocaleString('en-PK')}`)
        .join(', ');

      description = taglineFromDb
        ? `${stripHtml(taglineFromDb)} | Starting from ${currency} ${startingPrice.toLocaleString('en-PK')}.`
        : `${storeName} Floor Cleaner — Starting from ${currency} ${startingPrice.toLocaleString('en-PK')}. ${packSummary}. Free Delivery & Cash on Delivery across Pakistan.`;
    } else if (taglineFromDb) {
      description = stripHtml(taglineFromDb);
    }
  } catch {
    // fallback to defaults
  }

  const ogImages = firstImageUrl
    ? [{ url: firstImageUrl, alt: `${storeName} Floor Cleaner` }]
    : [];

  return {
    title: `${storeName} | Premium Floor Cleaner — Free Delivery Across Pakistan`,
    description,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: `${storeName} | Premium Floor Cleaner`,
      description,
      url: baseUrl,
      siteName: storeName,
      images: ogImages,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${storeName} | Premium Floor Cleaner`,
      description,
      images: ogImages.map((i) => i.url),
    },
  };
}

export default async function HomePage() {
  let featuredProducts: ProductCardProps[] = [];
  const productMap: Record<string, { id: string; name: string; price: number; comparePrice?: number | null }> = {};
  let dbReviews: HomeReviewItem[] = [];
  let dbFaqs: HomeFaqItem[] = [];
  let storePhone = '0346 4815775';
  let primaryColor = '#042A1E';
  let heroMediaType: 'product' | 'image' | 'video' = 'product';
  let heroSlideInterval = 3000;
  let heroImages: { url: string; altText?: string; link?: string }[] = [];
  let heroVideoUrl = '';
  let heroVideoPoster = '';
  const heroImageMap: Record<string, { url?: string; alt?: string; link?: string }> = {};

  try {
    const [dbProds, reviews, faqs, settings] = await Promise.all([
      db.product.findMany({
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
        orderBy: { price: 'asc' },
      }),
      db.review.findMany({
        where: { isApproved: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
      db.faqItem.findMany({
        where: { isActive: true },
        take: 6,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      db.setting.findMany({
        where: {
          key: {
            in: [
              'store.name',
              'store.phone',
              'theme.primary_color',
              'hero.media_type',
              'hero.slide_interval',
              'hero.image_1_url',
              'hero.image_1_alt',
              'hero.image_1_link',
              'hero.image_2_url',
              'hero.image_2_alt',
              'hero.image_2_link',
              'hero.image_3_url',
              'hero.image_3_alt',
              'hero.image_3_link',
              'hero.video_url',
              'hero.video_poster',
            ],
          },
        },
      }),
    ]);

    for (const s of settings) {
      if (s.key === 'store.phone' && s.value) storePhone = String(s.value);
      if (s.key === 'theme.primary_color' && s.value) primaryColor = String(s.value);
      if (s.key === 'hero.media_type' && s.value) heroMediaType = s.value as any;
      if (s.key === 'hero.slide_interval' && s.value) heroSlideInterval = Number(s.value) || 3000;
      if (s.key === 'hero.video_url' && s.value) heroVideoUrl = String(s.value);
      if (s.key === 'hero.video_poster' && s.value) heroVideoPoster = String(s.value);

      for (let i = 1; i <= 3; i++) {
        if (!heroImageMap[i]) heroImageMap[i] = {};
        if (s.key === `hero.image_${i}_url` && s.value) heroImageMap[i].url = String(s.value);
        if (s.key === `hero.image_${i}_alt` && s.value) heroImageMap[i].alt = String(s.value);
        if (s.key === `hero.image_${i}_link` && s.value) heroImageMap[i].link = String(s.value);
      }
    }

    heroImages = [1, 2, 3]
      .filter((i) => heroImageMap[i]?.url)
      .map((i) => ({
        url: heroImageMap[i].url!,
        altText: heroImageMap[i].alt || 'Hero Showcase',
        link: heroImageMap[i].link || '',
      }));

    if (dbProds.length > 0) {
      featuredProducts = dbProds.map((p) => {
        productMap[p.slug] = {
          id: p.id,
          name: p.name,
          price: Number(p.price),
          comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
        };

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: Number(p.price),
          comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
          hasVariants: p.variants.length > 1,
          images: p.images.map((img) => ({ url: img.url, altText: img.altText })),
        };
      });
    }

    if (reviews.length > 0) {
      dbReviews = reviews.map((r) => ({
        id: r.id,
        author: r.reviewerName,
        city: 'Verified Customer',
        rating: r.rating,
        date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        title: r.title || 'Excellent Floor Cleaner',
        content: r.body || 'Amazing results, highly recommended.',
        verified: true,
      }));
    }

    if (faqs.length > 0) {
      dbFaqs = faqs.map((f) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
      }));
    }
  } catch {
    // Database fallback
  }

  const cleanPhone = storePhone.replace(/[^0-9]/g, '');
  const intlPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone.startsWith('92') ? cleanPhone : '92' + cleanPhone;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saas-product-website-seven.vercel.app';
  const storeName = 'Eco Galaxy';

  // Build JSON-LD structured data with live prices
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: storeName,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/products?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const itemListJsonLd = featuredProducts.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${storeName} — Floor Cleaner Packs`,
        url: baseUrl,
        numberOfItems: featuredProducts.length,
        itemListElement: featuredProducts.map((p, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          item: {
            '@type': 'Product',
            name: p.name,
            url: `${baseUrl}/products/${p.slug}`,
            image: p.images[0]?.url ?? undefined,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'PKR',
              price: p.price,
              availability: 'https://schema.org/InStock',
              url: `${baseUrl}/products/${p.slug}`,
              priceValidUntil: new Date(
                new Date().setFullYear(new Date().getFullYear() + 1)
              ).toISOString().split('T')[0],
            },
          },
        })),
      }
    : null;

  return (
    <>
      {/* JSON-LD Structured Data — always fresh because page is force-dynamic */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
    <div className="flex flex-col min-h-screen bg-background">
      {/* 1. HERO SECTION — Dynamic theme background with mobile bottle backdrop */}
      <section
        className="relative overflow-hidden pt-8 pb-16 lg:py-24 text-white transition-colors duration-300"
        style={{ backgroundColor: primaryColor || 'var(--primary, #042A1E)' }}
      >
        {/* Mobile Background Bottle Image */}
        <div className="absolute inset-0 block lg:hidden pointer-events-none -z-0">
          <Image
            src="/images/Plastic_bottle_on_wooden_table_202608270227.jpeg"
            alt="Eco Galaxy Floor Cleaner Bottle"
            fill
            priority
            className="object-cover object-top opacity-55 brightness-90 contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-black" />
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Left Content Column */}
            <div className="space-y-6 lg:col-span-7">
              {/* Kicker & Urdu Tagline */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/40 px-3 py-1 text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-white shadow-sm backdrop-blur">
                  <Sparkle className="h-3 w-3 fill-current text-emerald-400" />
                  Eco Galaxy • Premium Floor Care
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold text-white border border-white/20 backdrop-blur">
                  صاف فرش، خوشبودار گھر
                </span>
              </div>

              {/* Main Headline */}
              <div className="space-y-2">
                <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-tight drop-shadow-sm">
                  Make Every Floor <br />
                  <span className="italic" style={{ color: 'var(--accent, #10ACB7)' }}>Feel Brand New.</span>
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-white/90 leading-relaxed max-w-xl font-medium drop-shadow-sm">
                  Meet Eco Galaxy Floor Cleaner — a 1 Liter lavender-fragrance floor-care choice engineered for sparkling clean floors and long-lasting freshness.
                </p>
              </div>

              {/* Trust Micro-Row */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-bold text-white/90 pt-1">
                <span className="inline-flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-full border border-white/15 backdrop-blur">
                  <Truck className="h-3.5 w-3.5" style={{ color: 'var(--accent, #10ACB7)' }} /> Free Nationwide Delivery
                </span>
                <span className="inline-flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-full border border-white/15 backdrop-blur">
                  <Banknote className="h-3.5 w-3.5" style={{ color: 'var(--accent, #10ACB7)' }} /> Cash on Delivery (COD)
                </span>
                <span className="inline-flex items-center gap-1.5 bg-black/30 px-2.5 py-1 rounded-full border border-white/15 backdrop-blur">
                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--accent, #10ACB7)' }} /> 100% Original Formula
                </span>
              </div>

              {/* Interactive Hero Pack Selector */}
              <div className="pt-2 max-w-xl">
                <HeroPackSelector productMap={productMap} />
              </div>
            </div>

            {/* Right Visual Column (Studio Bottle Card or Dynamic Hero Showcase) */}
            <div className="hidden lg:flex relative lg:col-span-5 flex-col items-center justify-center">
              {heroMediaType !== 'product' && (heroImages.length > 0 || heroVideoUrl) ? (
                <div className="w-full max-w-md">
                  <HeroMediaShowcase
                    mediaType={heroMediaType}
                    images={heroImages}
                    videoUrl={heroVideoUrl}
                    videoPoster={heroVideoPoster}
                    slideInterval={heroSlideInterval}
                    storeName={storeName}
                  />
                </div>
              ) : (
                <>
              <div className="absolute inset-0 -m-6 rounded-3xl bg-gradient-to-tr from-emerald-600/20 to-purple-600/20 blur-2xl -z-10" />

              <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-black/40 p-3 shadow-2xl backdrop-blur-sm">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-black/40">
                  <Image
                    src="/images/Plastic_bottle_on_wooden_table_202608270227.jpeg"
                    alt="Eco Galaxy 1 Liter Floor Cleaner on wooden table"
                    fill
                    priority
                    sizes="500px"
                    className="object-cover object-center"
                  />
                  
                  {/* Floating benefit badges */}
                  <div className="absolute top-4 left-4 rounded-xl bg-black/70 backdrop-blur-md p-2.5 border border-white/20 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold text-white">Lavender Scent</p>
                        <p className="text-[9px] text-emerald-300">Fresh everyday aroma</p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-4 right-4 rounded-xl bg-black/70 backdrop-blur-md p-2.5 border border-white/20 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                        <Droplets className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold text-white">Deep Clean Power</p>
                        <p className="text-[9px] text-emerald-300">Streak-free gloss finish</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. URGENCY DISPATCH TIMER */}
      <UrgencyCountdown />

      {/* 3. TRUST STRIP */}
      <section className="border-b border-border bg-[#fafbf8] py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:gap-6 sm:pb-0">
            <div className="flex items-center gap-3 shrink-0 min-w-[190px] sm:min-w-0 bg-white sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-border/50 sm:border-0 shadow-sm sm:shadow-none">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Free Delivery</p>
                <p className="text-[11px] text-muted-foreground">All over Pakistan</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 min-w-[190px] sm:min-w-0 bg-white sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-border/50 sm:border-0 shadow-sm sm:shadow-none">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Cash on Delivery</p>
                <p className="text-[11px] text-muted-foreground">Pay upon receiving</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 min-w-[190px] sm:min-w-0 bg-white sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-border/50 sm:border-0 shadow-sm sm:shadow-none">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">1 Liter Bottle</p>
                <p className="text-[11px] text-muted-foreground">Standard size bottle</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 min-w-[190px] sm:min-w-0 bg-white sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-border/50 sm:border-0 shadow-sm sm:shadow-none">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">WhatsApp Help</p>
                <p className="text-[11px] text-muted-foreground">{storePhone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 min-w-[190px] sm:min-w-0 bg-white sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-border/50 sm:border-0 shadow-sm sm:shadow-none">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground uppercase tracking-wide">Safe On Surfaces</p>
                <p className="text-[11px] text-muted-foreground">Marble, Tile &amp; Wood</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT PACK OFFER GRID — 2 columns on mobile, 3 columns on desktop */}
      <section className="py-16 lg:py-20 bg-white" id="shop">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-10 lg:mb-14">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Limited-Time Direct Store Offers</span>
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              Choose Your Eco Galaxy Pack
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              Select from our 1-bottle starter pack or save more with 3-bottle and 5-bottle family value packs. Free Delivery &amp; COD across Pakistan.
            </p>
          </div>

          {/* 2-Columns grid on mobile, 3-Columns grid on desktop */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-8">
            {featuredProducts.map((product) => (
              <div key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. VIDEO SHOWCASE */}
      <VideoShowcase />

      {/* 6. WHY ECO GALAXY — Overlapping Glassmorphism Card Style */}
      <section className="py-16 lg:py-20 bg-[#fafbf8] border-t border-border" id="benefits">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-center">
            {/* Visual Bottle Presentation */}
            <div className="lg:col-span-6 relative">
              <div
                className="relative aspect-[4/5] sm:aspect-[4/5] lg:aspect-[4/5] rounded-3xl overflow-hidden shadow-xl border border-white/20 transition-colors duration-300"
                style={{ backgroundColor: primaryColor || 'var(--primary, #04242A)' }}
              >
                <Image
                  src="/images/WhatsApp Image 2026-08-25 at 4.58.09 PM.jpeg"
                  alt="Eco Galaxy Floor Cleaner — Simple Practical Floor Care"
                  fill
                  sizes="(max-width: 1024px) 100vw, 600px"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </div>
            </div>

            {/* Overlapping Glassmorphism Content Box */}
            <div className="lg:col-span-6 -mt-12 sm:-mt-16 lg:mt-0 z-10">
              <div className="rounded-3xl border border-border/80 bg-white/90 backdrop-blur-md p-6 sm:p-8 shadow-xl space-y-6">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
                  <Award className="h-3.5 w-3.5" />
                  <span>Why Eco Galaxy</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Simple, Practical Floor Care For Everyday Homes.
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Eco Galaxy is built around a straightforward cleaning routine, transparent pricing, and convenient ordering. Follow the directions printed on the bottle label for sparkling clean floors.
                </p>

                <div className="space-y-3.5 pt-1">
                  <div className="flex items-start gap-3 rounded-2xl bg-[#f4f6f0] p-3.5 border border-border/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Droplets className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-foreground">1 Liter Standard Bottle</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">One consistent 1L size across all available packs with measuring cap.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-[#f4f6f0] p-3.5 border border-border/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-foreground">Calming Lavender Fragrance</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Fresh aroma profile that keeps rooms smelling clean for hours.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-[#f4f6f0] p-3.5 border border-border/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-foreground">Safe On All Floor Surfaces</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Gentle on marble, tile, granite, and hardwood floors.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-[#f4f6f0] p-3.5 border border-border/50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-foreground">Value Pack Savings</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Save up to 35% with 3-bottle and 5-bottle bundles with Free Delivery.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. HOW IT WORKS */}
      <section className="py-16 lg:py-20 bg-white" id="how">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-10 lg:mb-14">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
              <Clock className="h-3.5 w-3.5" />
              <span>Easy Routine</span>
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              A Simple Three-Step Routine
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              Always follow the dilution and usage directions printed on your bottle.
            </p>
          </div>

          {/* Horizontally scrollable on mobile: exactly 100% width per card for 3 complete full swipes */}
          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-3 pb-4 md:grid md:grid-cols-3 md:gap-8 md:pb-0">
            {/* Step 1 */}
            <div className="w-full min-w-full snap-center shrink-0 md:min-w-0 md:w-auto md:shrink flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl bg-[#fafbf8] border border-border/80 relative shadow-sm">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-extrabold text-lg sm:text-xl mb-4 sm:mb-5 shadow-sm">
                1
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5">Prepare Solution</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs">
                Add 1 to 2 capfuls of Eco Galaxy into half a bucket of clean water (approx. 4–5 Liters).
              </p>
              <div className="mt-4 inline-flex md:hidden items-center text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                Step 1 of 3 • Swipe for Step 2 &rarr;
              </div>
            </div>

            {/* Step 2 */}
            <div className="w-full min-w-full snap-center shrink-0 md:min-w-0 md:w-auto md:shrink flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl bg-[#fafbf8] border border-border/80 relative shadow-sm">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-extrabold text-lg sm:text-xl mb-4 sm:mb-5 shadow-sm">
                2
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5">Clean The Surface</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs">
                Mop or wipe the floor using your normal cleaning method to lift dirt, grease, and spots easily.
              </p>
              <div className="mt-4 inline-flex md:hidden items-center text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                Step 2 of 3 • Swipe for Step 3 &rarr;
              </div>
            </div>

            {/* Step 3 */}
            <div className="w-full min-w-full snap-center shrink-0 md:min-w-0 md:w-auto md:shrink flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl bg-[#fafbf8] border border-border/80 relative shadow-sm">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-extrabold text-lg sm:text-xl mb-4 sm:mb-5 shadow-sm">
                3
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5">Dry &amp; Glow</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs">
                Allow the surface to air-dry naturally. No rinsing needed. Enjoy streak-free shine and lavender scent.
              </p>
              <div className="mt-4 inline-flex md:hidden items-center text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                Step 3 of 3 • Routine Complete
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CUSTOMER REVIEWS & RATINGS — Connected to Live Database */}
      <HomeReviewsCarousel reviews={dbReviews} />

      {/* 9. FAQ ACCORDION — Connected to Live Database */}
      <HomeFaqAccordion faqs={dbFaqs} />

      {/* 10. BOTTOM ORDER CTA BANNER */}
      <section
        className="text-white py-16 transition-colors duration-300"
        style={{ backgroundColor: primaryColor || 'var(--primary, #042A1E)' }}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 border border-white/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            <Truck className="h-3.5 w-3.5" />
            <span>Ready To Order?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Pick Your Pack &amp; Order in Minutes.
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-white/90 max-w-xl mx-auto leading-relaxed">
            Choose your bottle quantity, enter your delivery address, and pay via Cash on Delivery with 100% Free Shipping all over Pakistan.
          </p>
          <div className="pt-2 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="#shop"
              style={{ backgroundColor: 'var(--accent, #10ACB7)' }}
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg transition-all hover:brightness-110 hover:shadow-xl hover:scale-105 active:scale-95"
            >
              <span>Shop All Packs</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={`https://wa.me/${intlPhone}?text=${encodeURIComponent('Hi Eco Galaxy, I would like to order Eco Galaxy Floor Cleaner.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-6 py-3.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-white/20"
            >
              <MessageCircle className="h-4 w-4" style={{ color: 'var(--accent, #10ACB7)' }} />
              <span>Order on WhatsApp ({storePhone})</span>
            </a>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}

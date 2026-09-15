export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ProductStatus } from '@prisma/client';
import { getSetting } from '@/lib/settings';
import { stripHtml } from '@/lib/format';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';
import { ProductDetailClient } from './ProductDetailClient';
import { ProductReviews } from '@/components/storefront/ProductReviews';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saas-product-website-seven.vercel.app';

  const product = await db.product.findFirst({
    where: { slug, status: ProductStatus.ACTIVE, deletedAt: null },
    include: { images: { take: 1 } },
  });

  if (!product) return { title: 'Product Not Found' };

  const productPrice = Number(product.price);
  const priceStr = `Rs. ${productPrice.toLocaleString('en-PK')}`;

  const baseDescription = product.seoDescription || stripHtml(product.description).slice(0, 120);
  const description = baseDescription
    ? `${baseDescription} Buy now for ${priceStr}. Free Delivery & Cash on Delivery across Pakistan.`
    : `${product.name} — ${priceStr}. Free Delivery & Cash on Delivery across Pakistan.`;

  const title = product.seoTitle || `${product.name} | Store`;
  const imageUrl = product.images[0]?.url;
  const ogImages = imageUrl ? [{ url: imageUrl, alt: product.name }] : [];

  return {
    title,
    description,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/products/${product.slug}`,
      type: 'website',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages.map((i) => i.url),
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await db.product.findFirst({
    where: {
      slug,
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    },
    include: {
      images: {
        orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
      },
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      },
      categories: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const primaryCategory = product.categories[0]?.category;
  const currency = await getSetting<string>('store.currency', 'PKR');

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Catalog', href: '/products' },
          ...(primaryCategory ? [{ label: primaryCategory.name, href: `/products?category=${primaryCategory.slug}` }] : []),
          { label: product.name },
        ]}
      />

      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org/',
            '@type': 'Product',
            name: product.name,
            image: product.images.map((i) => i.url),
            description: product.seoDescription || stripHtml(product.description),
            sku: product.variants[0]?.sku || product.slug,
            brand: {
              '@type': 'Brand',
              name: 'Eco Galaxy',
            },
            offers: {
              '@type': 'Offer',
              priceCurrency: currency,
              price: Number(product.price),
              availability: 'https://schema.org/InStock',
              url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://saas-product-website-seven.vercel.app'}/products/${product.slug}`,
              priceValidUntil: new Date(
                new Date().setFullYear(new Date().getFullYear() + 1)
              ).toISOString().split('T')[0],
              seller: {
                '@type': 'Organization',
                name: 'Eco Galaxy Store',
              },
            },
          }),
        }}
      />

      {/* Client Component containing Gallery & Interactive Variant Selector */}
      <ProductDetailClient product={product} />

      {/* Customer Reviews & Ratings Section */}
      <ProductReviews productId={product.id} productName={product.name} />
    </main>
  );
}

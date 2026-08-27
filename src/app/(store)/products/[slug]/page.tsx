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
  const product = await db.product.findFirst({
    where: { slug, status: ProductStatus.ACTIVE, deletedAt: null },
    include: { images: { take: 1 } },
  });

  if (!product) return { title: 'Product Not Found' };

  const title = product.seoTitle || `${product.name} | Store`;
  const description = product.seoDescription || stripHtml(product.description).slice(0, 160);
  const imageUrl = product.images[0]?.url;

  return {
    title,
    description,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      images: imageUrl ? [{ url: imageUrl, alt: product.name }] : [],
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
            offers: {
              '@type': 'Offer',
              priceCurrency: currency,
              price: product.price,
              availability: 'https://schema.org/InStock',
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

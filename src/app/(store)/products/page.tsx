export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ProductStatus } from '@prisma/client';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';

export const metadata: Metadata = {
  title: 'All Products | Eco Galaxy Floor Cleaner',
  description: 'Explore our complete collection of Eco Galaxy Floor Cleaner packs with Free Delivery across Pakistan.',
  alternates: {
    canonical: '/products',
  },
};

export default async function ProductsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt((resolvedParams.page as string) || '1', 10));
  const limit = 12;
  const skip = (page - 1) * limit;

  const categorySlug = (resolvedParams.category as string) || undefined;
  const featured = resolvedParams.featured === 'true';

  const where = {
    deletedAt: null,
    status: ProductStatus.ACTIVE,
    ...(featured ? { featured: true } : {}),
    ...(categorySlug
      ? {
          categories: {
            some: {
              category: {
                slug: categorySlug,
                isActive: true,
              },
            },
          },
        }
      : {}),
  };

  let products: any[] = [];
  let total = 0;
  let categories: any[] = [];
  let dbError = false;

  try {
    const [fetchedProducts, fetchedTotal, fetchedCategories] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { price: 'asc' },
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
          },
          variants: {
            take: 2,
          },
        },
      }),
      db.product.count({ where }),
      db.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
    ]);

    products = fetchedProducts;
    total = fetchedTotal;
    categories = fetchedCategories;
  } catch (err) {
    console.error('Failed to load products from database:', err);
    dbError = true;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Breadcrumbs items={[{ label: 'All Products', href: '/products' }]} />

      {/* Header & Title Hierarchy */}
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {categorySlug ? `${categorySlug.replace('-', ' ').toUpperCase()} Products` : 'All Eco Galaxy Packs'}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Showing {products.length} of {total} available packs with Free Delivery &amp; Cash on Delivery across Pakistan.
        </p>
      </div>

      {/* Category Pills Filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 text-xs no-scrollbar">
          <Link
            href="/products"
            className={`rounded-full px-4 py-1.5 font-medium transition-all ${
              !categorySlug
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            All Products
          </Link>
          {categories.map((c) => {
            const isSelected = categorySlug === c.slug;
            return (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                className={`rounded-full px-4 py-1.5 font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* Product Grid: 2-column on mobile, 3-column on tablet, 3-column on desktop */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: Number(product.price),
                comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
                hasVariants: product.variants?.length > 1,
                images: product.images.map((img: any) => ({ url: img.url, altText: img.altText })),
              }}
            />
          ))}
        </div>
      ) : dbError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">Catalog is temporarily offline for maintenance.</p>
          <p className="text-xs text-muted-foreground">Please check back in a few moments.</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow"
          >
            Return to Home
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No products found matching the selected filters.</p>
          <Link
            href="/products"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow"
          >
            Clear Filters
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8">
          {page > 1 && (
            <Link
              href={`/products?page=${page - 1}${categorySlug ? `&category=${categorySlug}` : ''}`}
              className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              Previous
            </Link>
          )}
          <span className="text-xs text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/products?page=${page + 1}${categorySlug ? `&category=${categorySlug}` : ''}`}
              className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </main>
  );
}

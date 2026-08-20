export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ProductStatus } from '@prisma/client';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Catalog | All Products',
  description: 'Explore our complete collection of products with premium quality and reliable delivery.',
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
  const sort = (resolvedParams.sort as string) || 'newest';
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

  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'price-asc') orderBy = { price: 'asc' };
  else if (sort === 'price-desc') orderBy = { price: 'desc' };
  else if (sort === 'name-asc') orderBy = { name: 'asc' };
  else if (sort === 'name-desc') orderBy = { name: 'desc' };

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
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

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Catalog', href: '/products' }]} />

      {/* Header & Title Hierarchy (Single H1) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {categorySlug ? `${categorySlug.replace('-', ' ').toUpperCase()} Products` : 'All Products'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Showing {products.length} of {total} items
          </p>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Sort by:</span>
          <div className="flex gap-1 bg-muted/40 p-1 rounded-lg border border-border text-xs">
            <Link
              href={`/products?${new URLSearchParams({ ...(categorySlug ? { category: categorySlug } : {}), sort: 'newest' }).toString()}`}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                sort === 'newest' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Newest
            </Link>
            <Link
              href={`/products?${new URLSearchParams({ ...(categorySlug ? { category: categorySlug } : {}), sort: 'price-asc' }).toString()}`}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                sort === 'price-asc' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Price: Low
            </Link>
            <Link
              href={`/products?${new URLSearchParams({ ...(categorySlug ? { category: categorySlug } : {}), sort: 'price-desc' }).toString()}`}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                sort === 'price-desc' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Price: High
            </Link>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 text-xs">
          <Link
            href="/products"
            className={`rounded-full px-4 py-1.5 font-medium transition-all ${
              !categorySlug
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            All Categories
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

      {/* Product Grid: 2-column on mobile, 3-column on tablet, 4-column on desktop */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
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
              href={`/products?page=${page - 1}${categorySlug ? `&category=${categorySlug}` : ''}${sort ? `&sort=${sort}` : ''}`}
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
              href={`/products?page=${page + 1}${categorySlug ? `&category=${categorySlug}` : ''}${sort ? `&sort=${sort}` : ''}`}
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

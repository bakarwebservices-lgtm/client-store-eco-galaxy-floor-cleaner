export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ProductStatus } from '@prisma/client';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findFirst({
    where: { slug, isActive: true },
  });

  if (!category) return { title: 'Category Not Found' };

  const title = category.seoTitle || `${category.name} | Store`;
  const description = category.seoDescription || category.description || `Browse all products in ${category.name}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/categories/${category.slug}`,
    },
    openGraph: {
      title,
      description,
      images: category.imageUrl ? [{ url: category.imageUrl, alt: category.imageAlt || category.name }] : [],
    },
  };
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt((resolvedParams.page as string) || '1', 10));
  const limit = 12;
  const skip = (page - 1) * limit;

  let category;
  let categoryProducts: any[] = [];
  let total = 0;

  try {
    category = await db.category.findFirst({
      where: { slug, isActive: true },
    });

    if (!category) {
      notFound();
    }

    [categoryProducts, total] = await Promise.all([
      db.categoryProduct.findMany({
        where: {
          categoryId: category.id,
          product: {
            deletedAt: null,
            status: ProductStatus.ACTIVE,
          },
        },
        orderBy: { position: 'asc' },
        skip,
        take: limit,
        include: {
          product: {
            include: {
              images: {
                orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
              },
            },
          },
        },
      }),
      db.categoryProduct.count({
        where: {
          categoryId: category.id,
          product: {
            deletedAt: null,
            status: ProductStatus.ACTIVE,
          },
        },
      }),
    ]);
  } catch (err) {
    console.error('Error fetching category:', err);
    if (!category) notFound();
  }

  const products = categoryProducts.map((cp) => cp.product);
  const totalPages = Math.ceil(total / limit);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Catalog', href: '/products' },
          { label: 'Categories', href: '/products' },
          { label: category.name },
        ]}
      />

      {/* Hero Banner / Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
        {category.imageUrl && (
          <div className="relative mb-6 h-48 sm:h-64 w-full overflow-hidden rounded-xl bg-muted">
            <Image
              src={category.imageUrl}
              alt={category.imageAlt || category.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {category.description}
            </p>
          )}
          <p className="text-xs font-semibold text-primary pt-1">
            {total} {total === 1 ? 'Product Available' : 'Products Available'}
          </p>
        </div>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-4">
          <h2 className="text-base font-bold text-foreground">No products found</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            There are currently no active products in this category. Check back soon or browse the full catalog.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover"
          >
            Explore Full Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
              <Link
                href={`/categories/${category.slug}?page=${page - 1}`}
                className={`rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted ${
                  page <= 1 ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                Previous
              </Link>
              <span>
                Page {page} of {totalPages}
              </span>
              <Link
                href={`/categories/${category.slug}?page=${page + 1}`}
                className={`rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted ${
                  page >= totalPages ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                Next
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

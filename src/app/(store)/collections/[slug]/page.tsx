export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ProductStatus, Prisma } from '@prisma/client';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';
import { resolveSmartCollectionWhere } from '@/lib/taxonomy/smartCollection';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await db.collection.findFirst({
    where: { slug, isActive: true },
  });

  if (!collection) return { title: 'Collection Not Found' };

  const title = collection.seoTitle || `${collection.name} | Collection`;
  const description = collection.seoDescription || collection.description || `Explore our ${collection.name} collection`;

  return {
    title,
    description,
    alternates: {
      canonical: `/collections/${collection.slug}`,
    },
    openGraph: {
      title,
      description,
      images: collection.imageUrl ? [{ url: collection.imageUrl, alt: collection.imageAlt || collection.name }] : [],
    },
  };
}

export default async function CollectionDetailPage({
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

  let collection;
  let products: any[] = [];
  let total = 0;

  try {
    collection = await db.collection.findFirst({
      where: { slug, isActive: true },
    });

    if (!collection) {
      notFound();
    }

    if (collection.type === 'SMART') {
      // Dynamic Smart Collection Query (evaluates effective variant price, tags, vendor, type, etc.)
      const ruleWhere = resolveSmartCollectionWhere({
        ruleField: collection.ruleField,
        ruleOperator: collection.ruleOperator,
        ruleValue: collection.ruleValue,
      });

      const baseWhere: Prisma.ProductWhereInput = {
        deletedAt: null,
        status: ProductStatus.ACTIVE,
        ...ruleWhere,
      };

      [products, total] = await Promise.all([
        db.product.findMany({
          where: baseWhere,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            },
          },
        }),
        db.product.count({ where: baseWhere }),
      ]);
    } else {
      // Manual Collection Query (uses CollectionProduct join table with position ordering)
      const [colProducts, totalCount] = await Promise.all([
        db.collectionProduct.findMany({
          where: {
            collectionId: collection.id,
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
        db.collectionProduct.count({
          where: {
            collectionId: collection.id,
            product: {
              deletedAt: null,
              status: ProductStatus.ACTIVE,
            },
          },
        }),
      ]);

      products = colProducts.map((cp) => cp.product);
      total = totalCount;
    }
  } catch (err) {
    console.error('Error loading collection:', err);
    if (!collection) notFound();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Catalog', href: '/products' },
          { label: 'Collections', href: '/products' },
          { label: collection.name },
        ]}
      />

      {/* Hero Banner / Collection Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
        {collection.imageUrl && (
          <div className="relative mb-6 h-48 sm:h-64 w-full overflow-hidden rounded-xl bg-muted">
            <Image
              src={collection.imageUrl}
              alt={collection.imageAlt || collection.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {collection.name}
            </h1>
            {collection.type === 'SMART' && (
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                Smart Collection
              </span>
            )}
          </div>
          {collection.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {collection.description}
            </p>
          )}
          <p className="text-xs font-semibold text-primary pt-1">
            {total} {total === 1 ? 'Curated Item' : 'Curated Items'}
          </p>
        </div>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-4">
          <h2 className="text-base font-bold text-foreground">No items in this collection</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            This collection currently has no active matching products. Explore our full catalog to discover more.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover"
          >
            Browse All Products
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
                href={`/collections/${collection.slug}?page=${page - 1}`}
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
                href={`/collections/${collection.slug}?page=${page + 1}`}
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

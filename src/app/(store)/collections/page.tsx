export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ProductStatus } from '@prisma/client';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';
import { resolveSmartCollectionWhere } from '@/lib/taxonomy/smartCollection';
import { ArrowRight, Layers, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Collections | Explore Curated Styles & Sets',
  description:
    'Discover our hand-picked and seasonal collections crafted for elevated style and performance.',
  alternates: {
    canonical: '/collections',
  },
  openGraph: {
    title: 'Collections | Explore Curated Styles & Sets',
    description:
      'Discover our hand-picked and seasonal collections crafted for elevated style and performance.',
  },
};

interface CollectionWithCount {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  type: string;
  productCount: number;
}

export default async function CollectionsIndexPage() {
  let collectionsWithCount: CollectionWithCount[] = [];

  try {
    const activeCollections = await db.collection.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        products: {
          where: {
            product: {
              status: ProductStatus.ACTIVE,
              deletedAt: null,
            },
          },
          select: { productId: true },
        },
      },
    });

    // Calculate product counts for both MANUAL and SMART collections
    collectionsWithCount = await Promise.all(
      activeCollections.map(async (col) => {
        let count = col.products.length;

        if (col.type === 'SMART') {
          try {
            const smartWhere = resolveSmartCollectionWhere({
              ruleField: col.ruleField,
              ruleOperator: col.ruleOperator,
              ruleValue: col.ruleValue,
            });
            count = await db.product.count({
              where: {
                status: ProductStatus.ACTIVE,
                deletedAt: null,
                ...smartWhere,
              },
            });
          } catch (e) {
            console.warn(`Could not compute smart collection count for ${col.slug}:`, e);
          }
        }

        return {
          id: col.id,
          name: col.name,
          slug: col.slug,
          description: col.description,
          imageUrl: col.imageUrl,
          imageAlt: col.imageAlt,
          type: col.type,
          productCount: count,
        };
      })
    );
  } catch (err) {
    console.warn('Could not load collections during build prerender:', err);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Collections', href: '/collections' },
        ]}
      />

      {/* Page Header */}
      <div className="border-b border-border pb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Curated Selections</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Curated Collections
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Browse through our curated themes, seasonal edits, and exclusive product suites.
        </p>
      </div>

      {/* Collections Grid */}
      {collectionsWithCount.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border py-16 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Layers className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">No Collections Available</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Check back soon for new seasonal edits and curated lineups.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            <span>Browse All Products</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collectionsWithCount.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300"
            >
              {/* Cover Image Container */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                {col.imageUrl ? (
                  <Image
                    src={col.imageUrl}
                    alt={col.imageAlt || col.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40 text-muted-foreground">
                    <Layers className="h-10 w-10 opacity-30" />
                  </div>
                )}

                {/* Badge Overlay */}
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center rounded-full bg-card/90 backdrop-blur border border-border/50 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-sm">
                    {col.productCount} {col.productCount === 1 ? 'Product' : 'Products'}
                  </span>
                </div>
              </div>

              {/* Card Details */}
              <div className="flex flex-1 flex-col justify-between p-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>{col.name}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h2>
                  {col.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {col.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-2 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Explore Collection</span>
                  <span className="text-muted-foreground text-[11px]">View all &rarr;</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { BlogStatus } from '@prisma/client';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';
import { Calendar, User, Clock, ArrowRight, BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog & Journal | Stories, Insights & Guides',
  description: 'Explore curated articles, brand stories, product styling guides, and industry news.',
  alternates: {
    canonical: '/blog',
  },
};

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt((resolvedParams.page as string) || '1', 10));
  const tag = (resolvedParams.tag as string) || undefined;
  const limit = 9;
  const skip = (page - 1) * limit;

  const where = {
    status: BlogStatus.PUBLISHED,
    ...(tag ? { tags: { has: tag } } : {}),
  };

  let articles: any[] = [];
  let total = 0;

  try {
    [articles, total] = await Promise.all([
      db.blogArticle.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      db.blogArticle.count({ where }),
    ]);
  } catch (err) {
    console.error('Error fetching blog articles:', err);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Blog & Stories' }]} />

      {/* Header Banner */}
      <div className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-sm space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <BookOpen className="h-3.5 w-3.5" />
          <span>The Journal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Stories, Craft & Insights
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Behind-the-scenes perspectives, styling advice, product maintenance guides, and design philosophies.
        </p>
      </div>

      {/* Articles Grid */}
      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center space-y-3">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
          <h2 className="text-sm font-bold text-foreground">No articles published yet</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Our editorial journal is currently being prepared. Check back shortly for new updates.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover"
          >
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => {
              // Estimate reading time (~200 words per minute)
              const wordCount = article.bodyHtml.replace(/<[^>]*>/g, '').split(/\s+/).length;
              const readTime = Math.max(1, Math.ceil(wordCount / 200));

              return (
                <article
                  key={article.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:border-primary/40 transition-all"
                >
                  {/* Article Thumbnail */}
                  <Link href={`/blog/${article.slug}`} className="relative h-52 w-full overflow-hidden bg-muted">
                    {article.featuredImageUrl ? (
                      <Image
                        src={article.featuredImageUrl}
                        alt={article.featuredImageAlt || article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                        <BookOpen className="h-10 w-10 opacity-40" />
                      </div>
                    )}
                  </Link>

                  {/* Body & Meta */}
                  <div className="flex flex-1 flex-col justify-between p-6 space-y-4">
                    <div className="space-y-2.5">
                      {/* Tags */}
                      {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {article.tags.slice(0, 2).map((t: string) => (
                            <span
                              key={t}
                              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      <h2 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        <Link href={`/blog/${article.slug}`}>{article.title}</Link>
                      </h2>

                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {article.excerpt}
                        </p>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="border-t border-border pt-4 text-[11px] text-muted-foreground flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {article.publishedAt
                            ? new Date(article.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Recently'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {readTime} min read
                        </span>
                      </div>

                      <Link
                        href={`/blog/${article.slug}`}
                        className="font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>Read</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
              <Link
                href={`/blog?page=${page - 1}${tag ? `&tag=${tag}` : ''}`}
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
                href={`/blog?page=${page + 1}${tag ? `&tag=${tag}` : ''}`}
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

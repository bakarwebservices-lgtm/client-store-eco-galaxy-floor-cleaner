export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/db';
import { BlogStatus } from '@prisma/client';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';
import { Calendar, User, Clock, ArrowLeft, Tag } from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await db.blogArticle.findFirst({
    where: { slug, status: BlogStatus.PUBLISHED },
  });

  if (!article) return { title: 'Article Not Found' };

  const title = article.seoTitle || `${article.title} | Journal`;
  const description = article.seoDescription || article.excerpt || `Read ${article.title} on our store journal.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/blog/${article.slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: article.publishedAt ? article.publishedAt.toISOString() : undefined,
      authors: article.author ? [article.author] : undefined,
      images: article.featuredImageUrl
        ? [{ url: article.featuredImageUrl, alt: article.featuredImageAlt || article.title }]
        : [],
    },
  };
}

export default async function BlogArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let article;
  try {
    article = await db.blogArticle.findFirst({
      where: { slug, status: BlogStatus.PUBLISHED },
    });
  } catch (err) {
    console.error('Error fetching article detail:', err);
  }

  if (!article) {
    notFound();
  }

  const wordCount = article.bodyHtml.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Journal', href: '/blog' },
          { label: article.title },
        ]}
      />

      {/* Article Header */}
      <header className="space-y-4">
        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {article.tags.map((t: string) => (
              <Link
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          {article.title}
        </h1>

        {/* Metadata Bar */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-y border-border py-3">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <User className="h-3.5 w-3.5 text-primary" />
            {article.author || 'Editorial Team'}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Recently'}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {readTime} min read
          </span>
        </div>
      </header>

      {/* Featured Hero Banner */}
      {article.featuredImageUrl && (
        <div className="relative h-64 sm:h-96 w-full overflow-hidden rounded-3xl border border-border bg-muted shadow-sm">
          <Image
            src={article.featuredImageUrl}
            alt={article.featuredImageAlt || article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Article HTML Content */}
      <div
        className="prose prose-neutral dark:prose-invert max-w-none text-foreground leading-relaxed space-y-4 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:tracking-tight [&>h2]:mt-8 [&>h2]:mb-3 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mt-6 [&>h3]:mb-2 [&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-muted-foreground [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-1 [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-foreground [&>a]:text-primary [&>a]:underline hover:[&>a]:text-primary-hover [&>img]:rounded-2xl [&>img]:border [&>img]:border-border"
        dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
      />

      {/* Article Footer & Return Link */}
      <footer className="border-t border-border pt-8 mt-12 flex items-center justify-between">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Journal</span>
        </Link>
      </footer>
    </article>
  );
}

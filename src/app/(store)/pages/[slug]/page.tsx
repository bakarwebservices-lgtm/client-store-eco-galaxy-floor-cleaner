export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { PageStatus } from '@prisma/client';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await db.page.findFirst({
    where: { slug, status: PageStatus.ACTIVE },
  });

  if (!page) return { title: 'Page Not Found' };

  const title = page.seoTitle || `${page.title} | Store`;
  const description = page.seoDescription || `Read ${page.title} on our store.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/pages/${page.slug}`,
    },
  };
}

export default async function CMSPageDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let page;
  try {
    page = await db.page.findFirst({
      where: { slug, status: PageStatus.ACTIVE },
    });
  } catch (err) {
    console.error('Error fetching CMS page:', err);
  }

  if (!page) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: page.title }]} />

      {/* Page Content Card */}
      <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-sm space-y-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          {page.title}
        </h1>

        <div className="h-px bg-border w-full" />

        {/* Sanitized HTML Body */}
        <div
          className="prose prose-neutral dark:prose-invert max-w-none text-foreground leading-relaxed space-y-4 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:tracking-tight [&>h2]:mt-6 [&>h2]:mb-2 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mt-4 [&>h3]:mb-1.5 [&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-muted-foreground [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-1 [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-4 [&>blockquote]:italic [&>a]:text-primary [&>a]:underline hover:[&>a]:text-primary-hover"
          dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
        />
      </div>
    </main>
  );
}

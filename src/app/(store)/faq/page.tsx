export const revalidate = 60;

import React from 'react';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { FaqClient } from '@/components/storefront/FaqClient';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | Help & Knowledge Base',
  description: 'Quick answers to common questions about shipping, orders, payments, warranties, and return policies.',
  alternates: {
    canonical: '/faq',
  },
};

export default async function StorefrontFaqPage() {
  let faqs: any[] = [];
  let supportHours = 'Mon – Sat: 10:00 AM – 8:00 PM PKT';

  try {
    const [dbFaqs, hoursSetting] = await Promise.all([
      db.faqItem.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      getSetting<string>('store.hours', 'Mon – Sat: 10:00 AM – 8:00 PM PKT'),
    ]);
    faqs = dbFaqs;
    supportHours = hoursSetting;
  } catch (err) {
    console.warn('Could not load FAQs from DB during prerender:', err);
  }

  // Extract unique non-null categories
  const categories = Array.from(
    new Set(faqs.map((f) => f.category).filter((c): c is string => Boolean(c)))
  );

  return (
    <FaqClient
      initialFaqs={faqs}
      initialCategories={categories}
      supportHours={supportHours}
    />
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';
import {
  HelpCircle,
  Search,
  ChevronDown,
  Mail,
} from 'lucide-react';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  sortOrder: number;
}

export interface FaqClientProps {
  initialFaqs: FAQ[];
  initialCategories: string[];
  supportHours?: string;
}

export function FaqClient({ initialFaqs, initialCategories, supportHours }: FaqClientProps) {
  const [faqs] = useState<FAQ[]>(initialFaqs || []);
  const [categories] = useState<string[]>(initialCategories || []);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>(() => {
    if (initialFaqs && initialFaqs.length > 0) {
      return {
        [initialFaqs[0].id]: true,
        ...(initialFaqs[1] ? { [initialFaqs[1].id]: true } : {}),
      };
    }
    return {};
  });

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory =
      activeCategory === 'all' || (faq.category && faq.category.toLowerCase() === activeCategory.toLowerCase());
    const matchesSearch =
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Help & FAQ' }]} />

      {/* Header Banner */}
      <div className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-sm space-y-4 text-center max-w-2xl mx-auto">
        <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Knowledge Base</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Quick answers to common questions about shipping, orders, payments, warranties, and return policies.
        </p>

        {/* Real-time Search Box */}
        <div className="relative max-w-md mx-auto pt-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions (e.g. shipping time, COD)..."
            className="w-full rounded-2xl border border-input bg-background pl-10 pr-4 py-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
        </div>
      </div>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              activeCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            All Topics
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                activeCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* FAQ Accordion List */}
      {filteredFaqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <h2 className="text-sm font-bold text-foreground">No matching questions found</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search terms or contact our support team directly.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = Boolean(openIds[faq.id]);
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(faq.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="space-y-1 pr-4">
                    {faq.category && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                        {faq.category}
                      </span>
                    )}
                    <span className="text-sm font-bold text-foreground block">
                      {faq.question}
                    </span>
                  </div>

                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 bg-primary/10 text-primary' : ''
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground leading-relaxed bg-muted/10 animate-in fade-in duration-150">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-2 [&>a]:text-primary [&>a]:underline"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Need More Help Footer */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8 text-center space-y-3">
        <h2 className="text-base font-bold text-foreground">Still have questions?</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Our friendly customer support team is available during business hours ({supportHours || 'Mon – Sat: 10:00 AM – 8:00 PM PKT'}) to help with order tracking, sizing, and inquiries.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span>Contact Support</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

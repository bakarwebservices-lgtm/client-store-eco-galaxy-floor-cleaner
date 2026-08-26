'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaqItemSchema } from '@/lib/validation/cms';
import { safeFetch } from '@/lib/apiClient';
import { RichTextEditor } from './RichTextEditor';
import { Loader2, AlertCircle, HelpCircle } from 'lucide-react';

interface FaqFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export function FaqForm({ initialData, isEditing = false }: FaqFormProps) {
  const router = useRouter();

  const [question, setQuestion] = useState(initialData?.question || '');
  const [answer, setAnswer] = useState(initialData?.answer || '');
  const [category, setCategory] = useState(initialData?.category || 'General');
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder?.toString() || '0');
  const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const payload = {
      question,
      answer,
      category: category || undefined,
      sortOrder: parseInt(sortOrder, 10) || 0,
      isActive,
    };

    const parsed = FaqItemSchema.safeParse(payload);
    if (!parsed.success) {
      const firstErr = parsed.error.errors[0]?.message || 'Validation failed';
      setErrorMessage(firstErr);
      setSubmitting(false);
      return;
    }

    try {
      const endpoint = isEditing ? `/api/faq/${initialData.id}` : '/api/faq';
      const method = isEditing ? 'PUT' : 'POST';

      const { ok, data, error } = await safeFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!ok) {
        setErrorMessage(error || 'Failed to save FAQ item');
        setSubmitting(false);
        return;
      }

      router.push('/admin/faq');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while saving FAQ item');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Question & Answer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">FAQ Content</h2>

            {/* Question */}
            <div className="space-y-1.5">
              <label htmlFor="faq-question" className="block text-xs font-semibold text-foreground">
                Question *
              </label>
              <input
                id="faq-question"
                type="text"
                required
                aria-required="true"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. How long does standard delivery take in Pakistan?"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Answer */}
            <div className="space-y-1.5">
              <label htmlFor="faq-answer" className="block text-xs font-semibold text-foreground">
                Answer *
              </label>
              <RichTextEditor
                id="faq-answer"
                value={answer}
                onChange={setAnswer}
                placeholder="Write clear, comprehensive answer..."
                rows={8}
              />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Category & Organization */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Organization & Priority</h2>

            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="faq-cat" className="block text-xs font-semibold text-foreground">
                Category Grouping
              </label>
              <input
                id="faq-cat"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Shipping, Orders, Payments, Returns"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground">Used for tab grouping on the storefront</p>
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <label htmlFor="faq-sort" className="block text-xs font-semibold text-foreground">
                Display Sort Order
              </label>
              <input
                id="faq-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground">Lower numbers appear first within category</p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <span className="text-xs font-bold text-foreground block">Active Visibility</span>
                <span className="text-[11px] text-muted-foreground">Visible on /faq page</span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isEditing ? 'Save FAQ Changes' : 'Create FAQ Item'}</span>
            </button>

            <Link
              href="/admin/faq"
              className="flex items-center justify-center rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageStatus } from '@prisma/client';
import { PageSchema } from '@/lib/validation/cms';
import { RichTextEditor } from './RichTextEditor';
import { Loader2, AlertCircle, FileText } from 'lucide-react';

interface PageFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export function PageForm({ initialData, isEditing = false }: PageFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [bodyHtml, setBodyHtml] = useState(initialData?.bodyHtml || '');
  const [status, setStatus] = useState<PageStatus>(initialData?.status || PageStatus.ACTIVE);

  // SEO fields
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || '');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing && !slug) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const payload = {
      title,
      slug,
      bodyHtml,
      status,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
    };

    const parsed = PageSchema.safeParse(payload);
    if (!parsed.success) {
      const firstErr = parsed.error.errors[0]?.message || 'Validation failed';
      setErrorMessage(firstErr);
      setSubmitting(false);
      return;
    }

    try {
      const endpoint = isEditing ? `/api/pages/${initialData.id}` : '/api/pages';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save page');
      }

      router.push('/admin/pages');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
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
        {/* Left 2 Cols: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Page Information</h2>

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="page-title" className="block text-xs font-semibold text-foreground">
                Page Title *
              </label>
              <input
                id="page-title"
                type="text"
                required
                aria-required="true"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Shipping Policy, About Us, Privacy Policy"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label htmlFor="page-slug" className="block text-xs font-semibold text-foreground">
                URL Slug *
              </label>
              <input
                id="page-slug"
                type="text"
                required
                aria-required="true"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. shipping-policy"
                className="w-full rounded-lg border border-input bg-background p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[11px] text-muted-foreground">
                Live URL: <code className="text-foreground">/pages/{slug || '...'}</code>
              </p>
            </div>
          </div>

          {/* Body Content with RichTextEditor */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Page Body (HTML)</h2>
              <p className="text-[11px] text-muted-foreground">
                Format the page contents. All HTML is sanitized server-side.
              </p>
            </div>

            <RichTextEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Write page content (headings, paragraphs, policy terms)..."
              rows={16}
            />
          </div>

          {/* SEO Metadata Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Search Engine Optimization (SEO)</h2>

            <div className="space-y-1.5">
              <label htmlFor="page-seo-title" className="block text-xs font-semibold text-foreground">
                Page Title Tag
              </label>
              <input
                id="page-seo-title"
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title ? `${title} | Store` : 'Page SEO Title'}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="page-seo-desc" className="block text-xs font-semibold text-foreground">
                Meta Description
              </label>
              <textarea
                id="page-seo-desc"
                rows={2}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Search engine snippet description..."
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Status & Controls */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Page Status</h2>

            <div className="space-y-1.5">
              <label htmlFor="page-status" className="block text-xs font-semibold text-foreground">
                Visibility
              </label>
              <select
                id="page-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PageStatus)}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-bold text-foreground focus:outline-none"
              >
                <option value={PageStatus.ACTIVE}>Active (Visible on /pages/{slug || '...'})</option>
                <option value={PageStatus.HIDDEN}>Hidden (Draft)</option>
              </select>
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
              <span>{isEditing ? 'Save Page Changes' : 'Create Custom Page'}</span>
            </button>

            <Link
              href="/admin/pages"
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

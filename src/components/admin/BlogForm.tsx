'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BlogStatus } from '@prisma/client';
import { BlogArticleSchema } from '@/lib/validation/cms';
import { MediaUploadModal } from './MediaUploadModal';
import { RichTextEditor } from './RichTextEditor';
import {
  Loader2,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  BookOpen,
  Calendar,
} from 'lucide-react';

interface BlogFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export function BlogForm({ initialData, isEditing = false }: BlogFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [bodyHtml, setBodyHtml] = useState(initialData?.bodyHtml || '');
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');
  const [author, setAuthor] = useState(initialData?.author || '');
  const [featuredImageUrl, setFeaturedImageUrl] = useState(initialData?.featuredImageUrl || '');
  const [featuredImageAlt, setFeaturedImageAlt] = useState(initialData?.featuredImageAlt || '');
  const [status, setStatus] = useState<BlogStatus>(initialData?.status || BlogStatus.DRAFT);
  const [tagsInput, setTagsInput] = useState(initialData?.tags ? initialData.tags.join(', ') : '');

  // SEO fields
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || '');

  // UI state
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
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

  const handleMediaSelected = (asset: { url: string; altText: string }) => {
    if (!asset || !asset.url) {
      setErrorMessage('Failed to attach media: No valid image URL received from upload.');
      return;
    }
    setFeaturedImageUrl(asset.url);
    setFeaturedImageAlt(asset.altText || title || 'Featured Article Image');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => Boolean(t));

    const payload = {
      title,
      slug,
      bodyHtml,
      excerpt: excerpt || undefined,
      author: author || undefined,
      featuredImageUrl: featuredImageUrl || undefined,
      featuredImageAlt: featuredImageAlt || undefined,
      status,
      tags,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
    };

    const parsed = BlogArticleSchema.safeParse(payload);
    if (!parsed.success) {
      const firstErr = parsed.error.errors[0]?.message || 'Validation failed';
      setErrorMessage(firstErr);
      setSubmitting(false);
      return;
    }

    try {
      const endpoint = isEditing ? `/api/blog/${initialData.id}` : '/api/blog';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save article');
      }

      router.push('/admin/blog');
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
        {/* Left 2 Cols: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Article Identity Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Article Details</h2>

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="article-title" className="block text-xs font-semibold text-foreground">
                Article Title *
              </label>
              <input
                id="article-title"
                type="text"
                required
                aria-required="true"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. The Art of Handcrafted Leather Care"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label htmlFor="article-slug" className="block text-xs font-semibold text-foreground">
                URL Slug *
              </label>
              <input
                id="article-slug"
                type="text"
                required
                aria-required="true"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. art-of-handcrafted-leather-care"
                className="w-full rounded-lg border border-input bg-background p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[11px] text-muted-foreground">
                Live URL: <code className="text-foreground">/blog/{slug || '...'}</code>
              </p>
            </div>

            {/* Excerpt */}
            <div className="space-y-1.5">
              <label htmlFor="article-excerpt" className="block text-xs font-semibold text-foreground">
                Summary Excerpt
              </label>
              <textarea
                id="article-excerpt"
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief 1-2 sentence preview for search and article cards..."
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Rich Body Content */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Article Body (HTML)</h2>
              <p className="text-[11px] text-muted-foreground">
                Use the formatting toolbar or raw HTML tags. Content is sanitized server-side.
              </p>
            </div>

            <RichTextEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Write comprehensive article content..."
              rows={14}
            />
          </div>

          {/* Featured Image Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Featured Hero Image</h2>
                <p className="text-[11px] text-muted-foreground">Appears at the top of the article and on social cards</p>
              </div>

              <button
                type="button"
                onClick={() => setMediaModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{featuredImageUrl ? 'Change Image' : 'Select Image'}</span>
              </button>
            </div>

            {featuredImageUrl ? (
              <div className="space-y-3">
                <div className="relative h-44 w-full overflow-hidden rounded-xl border border-border bg-muted">
                  <Image src={featuredImageUrl} alt={featuredImageAlt || title} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setFeaturedImageUrl('');
                      setFeaturedImageAlt('');
                    }}
                    className="absolute top-2 right-2 rounded-lg bg-black/70 p-1.5 text-white hover:bg-black/90 transition-colors"
                    aria-label="Remove featured image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label htmlFor="article-alt" className="block text-xs font-semibold text-foreground">
                    Image Alt Description (Mandatory for Accessibility) *
                  </label>
                  <input
                    id="article-alt"
                    type="text"
                    value={featuredImageAlt}
                    onChange={(e) => setFeaturedImageAlt(e.target.value)}
                    placeholder="e.g. Master craftsman conditioning leather boots in workshop"
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div
                onClick={() => setMediaModalOpen(true)}
                className="cursor-pointer rounded-xl border border-dashed border-border p-8 text-center hover:bg-muted/20 transition-colors space-y-2"
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-semibold text-foreground">No hero image attached</p>
                <p className="text-[11px] text-muted-foreground">
                  Choose a high-resolution banner from the Media Library
                </p>
              </div>
            )}
          </div>

          {/* SEO Metadata Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Search Engine Optimization (SEO)</h2>

            <div className="space-y-1.5">
              <label htmlFor="article-seo-title" className="block text-xs font-semibold text-foreground">
                Page Title Tag
              </label>
              <input
                id="article-seo-title"
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title ? `${title} | Journal` : 'Article SEO Title'}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="article-seo-desc" className="block text-xs font-semibold text-foreground">
                Meta Description
              </label>
              <textarea
                id="article-seo-desc"
                rows={2}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Search engine snippet description..."
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Publishing & Author Controls */}
        <div className="space-y-6">
          {/* Publishing Status Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Publishing Workflow</h2>

            <div className="space-y-1.5">
              <label htmlFor="article-status" className="block text-xs font-semibold text-foreground">
                Status
              </label>
              <select
                id="article-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as BlogStatus)}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-bold text-foreground focus:outline-none"
              >
                <option value={BlogStatus.DRAFT}>Draft (Internal Only)</option>
                <option value={BlogStatus.PUBLISHED}>Published (Live on /blog)</option>
              </select>
            </div>

            {initialData?.publishedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Published: {new Date(initialData.publishedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Author & Organization Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Author & Taxonomy</h2>

            {/* Author */}
            <div className="space-y-1.5">
              <label htmlFor="article-author" className="block text-xs font-semibold text-foreground">
                Author Display Name
              </label>
              <input
                id="article-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Editorial Staff"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label htmlFor="article-tags" className="block text-xs font-semibold text-foreground">
                Tags (Comma-separated)
              </label>
              <input
                id="article-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="guide, leather, styling"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isEditing ? 'Save Article Changes' : 'Create Blog Article'}</span>
            </button>

            <Link
              href="/admin/blog"
              className="flex items-center justify-center rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>

      {/* Media Upload Modal */}
      {mediaModalOpen && (
        <MediaUploadModal
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          onSelect={handleMediaSelected}
          allowMultiple={false}
          title="Select or Upload Featured Hero Image"
        />
      )}
    </form>
  );
}

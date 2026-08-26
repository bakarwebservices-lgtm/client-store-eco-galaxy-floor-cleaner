'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MediaUploadModal } from './MediaUploadModal';
import { CategorySchema, type CategoryInput } from '@/lib/validation/taxonomy';
import { safeFetch } from '@/lib/apiClient';
import {
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  CheckCircle,
  FolderTree,
} from 'lucide-react';

interface CategoryFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export function CategoryForm({ initialData, isEditing = false }: CategoryFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [imageAlt, setImageAlt] = useState(initialData?.imageAlt || '');
  const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true);
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder?.toString() || '0');

  // SEO Fields
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || '');

  // UI state
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
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
    setImageUrl(asset.url);
    setImageAlt(asset.altText || name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const payload = {
      name,
      slug,
      description: description || undefined,
      imageUrl: imageUrl || undefined,
      imageAlt: imageAlt || undefined,
      isActive,
      sortOrder: parseInt(sortOrder, 10) || 0,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
    };

    const parsed = CategorySchema.safeParse(payload);
    if (!parsed.success) {
      const firstErr = parsed.error.errors[0]?.message || 'Validation failed';
      setErrorMessage(firstErr);
      setSubmitting(false);
      return;
    }

    try {
      const endpoint = isEditing ? `/api/categories/${initialData.id}` : '/api/categories';
      const method = isEditing ? 'PUT' : 'POST';

      const { ok, data, error } = await safeFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!ok) {
        setErrorMessage(error || 'Failed to save category');
        setSubmitting(false);
        return;
      }

      router.push('/admin/categories');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while saving category');
      setSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Core Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">General Details</h2>

            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="cat-name" className="block text-xs font-semibold text-foreground">
                Category Name *
              </label>
              <input
                id="cat-name"
                type="text"
                required
                aria-required="true"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Footwear & Boots"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label htmlFor="cat-slug" className="block text-xs font-semibold text-foreground">
                URL Slug *
              </label>
              <input
                id="cat-slug"
                type="text"
                required
                aria-required="true"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. footwear-boots"
                className="w-full rounded-lg border border-input bg-background p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[11px] text-muted-foreground">
                Live URL: <code className="text-foreground">/categories/{slug || '...'}</code>
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="cat-desc" className="block text-xs font-semibold text-foreground">
                Description
              </label>
              <textarea
                id="cat-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of products in this category..."
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Hero Banner Image Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Category Image / Banner</h2>
                <p className="text-[11px] text-muted-foreground">Appears on the category storefront page</p>
              </div>

              <button
                type="button"
                onClick={() => setMediaModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{imageUrl ? 'Change Image' : 'Select Image'}</span>
              </button>
            </div>

            {imageUrl ? (
              <div className="space-y-3">
                <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border bg-muted">
                  <Image src={imageUrl} alt={imageAlt || name} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setImageAlt('');
                    }}
                    className="absolute top-2 right-2 rounded-lg bg-black/70 p-1.5 text-white hover:bg-black/90 transition-colors"
                    aria-label="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label htmlFor="cat-alt" className="block text-xs font-semibold text-foreground">
                    Image Alt Description (Mandatory for Accessibility) *
                  </label>
                  <input
                    id="cat-alt"
                    type="text"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="e.g. Models wearing artisan leather boots"
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
                <p className="text-xs font-semibold text-foreground">No image attached</p>
                <p className="text-[11px] text-muted-foreground">
                  Click to choose a banner asset from the Media Library
                </p>
              </div>
            )}
          </div>

          {/* SEO Metadata Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Search Engine Optimization (SEO)</h2>

            <div className="space-y-1.5">
              <label htmlFor="cat-seo-title" className="block text-xs font-semibold text-foreground">
                Page Title Tag
              </label>
              <input
                id="cat-seo-title"
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={name ? `${name} | Store` : 'Category SEO Title'}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cat-seo-desc" className="block text-xs font-semibold text-foreground">
                Meta Description
              </label>
              <textarea
                id="cat-seo-desc"
                rows={2}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Search engine snippet description..."
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Actions */}
        <div className="space-y-6">
          {/* Status & Ordering Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Status & Priority</h2>

            {/* Active Visibility Toggle */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-xs font-bold text-foreground block">Active Visibility</span>
                <span className="text-[11px] text-muted-foreground">Visible on storefront navigation</span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <label htmlFor="cat-sort" className="block text-xs font-semibold text-foreground">
                Navigation Sort Order
              </label>
              <input
                id="cat-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground">Lower numbers appear first in the menu</p>
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
              <span>{isEditing ? 'Save Category Changes' : 'Create Category'}</span>
            </button>

            <Link
              href="/admin/categories"
              className="flex items-center justify-center rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </form>

    {/* Media Upload Modal */}
    {mediaModalOpen && (
      <MediaUploadModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={handleMediaSelected}
        allowMultiple={false}
        title="Select or Upload Category Image"
      />
    )}
  </>
  );
}

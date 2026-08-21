'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MediaUploadModal } from './MediaUploadModal';
import { CollectionSchema, type CollectionInput } from '@/lib/validation/taxonomy';
import {
  Loader2,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  Sparkles,
  ListOrdered,
  Search,
  Check,
} from 'lucide-react';

interface CollectionFormProps {
  initialData?: any;
  isEditing?: boolean;
}

interface ProductPickerItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: { url: string; altText?: string | null }[];
}

export function CollectionForm({ initialData, isEditing = false }: CollectionFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [imageAlt, setImageAlt] = useState(initialData?.imageAlt || '');
  const [type, setType] = useState<'MANUAL' | 'SMART'>(initialData?.type || 'MANUAL');

  // Smart Rule Fields
  const [ruleField, setRuleField] = useState(initialData?.ruleField || 'tags');
  const [ruleOperator, setRuleOperator] = useState(initialData?.ruleOperator || 'contains');
  const [ruleValue, setRuleValue] = useState(initialData?.ruleValue || '');

  // Manual Product Selection
  const [availableProducts, setAvailableProducts] = useState<ProductPickerItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initialData?.products?.map((p: any) => p.productId || p.id) || []
  );
  const [productSearch, setProductSearch] = useState('');

  // Settings
  const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true);
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder?.toString() || '0');

  // SEO Fields
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || '');

  // UI state
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load catalog products for manual selection
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/products?admin=true&limit=50');
        if (res.ok) {
          const data = await res.json();
          setAvailableProducts(data.products || []);
        }
      } catch (err) {
        console.error('Failed to load products for manual picker', err);
      }
    }
    loadProducts();
  }, []);

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

  const toggleProductSelection = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter((id) => id !== productId));
    } else {
      setSelectedProductIds([...selectedProductIds, productId]);
    }
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
      type,
      ruleField: type === 'SMART' ? ruleField : undefined,
      ruleOperator: type === 'SMART' ? ruleOperator : undefined,
      ruleValue: type === 'SMART' ? ruleValue : undefined,
      isActive,
      sortOrder: parseInt(sortOrder, 10) || 0,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      productIds: type === 'MANUAL' ? selectedProductIds : [],
    };

    const parsed = CollectionSchema.safeParse(payload);
    if (!parsed.success) {
      const firstErr = parsed.error.errors[0]?.message || 'Validation failed';
      setErrorMessage(firstErr);
      setSubmitting(false);
      return;
    }

    try {
      const endpoint = isEditing ? `/api/collections/${initialData.id}` : '/api/collections';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save collection');
      }

      router.push('/admin/collections');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
      setSubmitting(false);
    }
  };

  const filteredProducts = availableProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Core Details & Type Engine */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Details Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">General Details</h2>

            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="col-name" className="block text-xs font-semibold text-foreground">
                Collection Name *
              </label>
              <input
                id="col-name"
                type="text"
                required
                aria-required="true"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Summer Essentials"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label htmlFor="col-slug" className="block text-xs font-semibold text-foreground">
                URL Slug *
              </label>
              <input
                id="col-slug"
                type="text"
                required
                aria-required="true"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. summer-essentials"
                className="w-full rounded-lg border border-input bg-background p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[11px] text-muted-foreground">
                Live URL: <code className="text-foreground">/collections/{slug || '...'}</code>
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="col-desc" className="block text-xs font-semibold text-foreground">
                Description
              </label>
              <textarea
                id="col-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of items in this collection..."
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Collection Type & Matching Engine Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">Collection Type & Product Inclusion</h2>
              <p className="text-[11px] text-muted-foreground">
                Choose how products are assigned to this collection
              </p>
            </div>

            {/* Type Toggle Pills */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('MANUAL')}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  type === 'MANUAL'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <ListOrdered className="h-5 w-5 text-primary" />
                <div>
                  <span className="text-xs font-bold text-foreground block">Manual Collection</span>
                  <span className="text-[11px] text-muted-foreground">Manually choose and order products</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('SMART')}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  type === 'SMART'
                    ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <Sparkles className="h-5 w-5 text-purple-600" />
                <div>
                  <span className="text-xs font-bold text-foreground block">Smart Collection</span>
                  <span className="text-[11px] text-muted-foreground">Automatically match products by rule</span>
                </div>
              </button>
            </div>

            {/* SMART Rule Builder */}
            {type === 'SMART' && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
                  <Sparkles className="h-4 w-4" />
                  <span>Smart Automated Rule Configuration</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Field */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-foreground">Rule Field</label>
                    <select
                      value={ruleField}
                      onChange={(e) => setRuleField(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none"
                    >
                      <option value="tags">Product Tag</option>
                      <option value="vendor">Vendor / Brand</option>
                      <option value="type">Product Type</option>
                      <option value="price">Effective Price (PKR)</option>
                      <option value="featured">Featured Status</option>
                    </select>
                  </div>

                  {/* Operator */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-foreground">Condition</label>
                    <select
                      value={ruleOperator}
                      onChange={(e) => setRuleOperator(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none"
                    >
                      {ruleField === 'price' ? (
                        <>
                          <option value="less_than">is less than or equal to (&lt;=)</option>
                          <option value="greater_than">is greater than or equal to (&gt;=)</option>
                          <option value="equals">equals</option>
                        </>
                      ) : (
                        <>
                          <option value="contains">contains</option>
                          <option value="equals">equals</option>
                          <option value="not_equals">does not equal</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Value */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-foreground">Target Value</label>
                    <input
                      type={ruleField === 'price' ? 'number' : 'text'}
                      value={ruleValue}
                      onChange={(e) => setRuleValue(e.target.value)}
                      placeholder={ruleField === 'price' ? '15000' : 'e.g. sale, leather'}
                      className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  {ruleField === 'price' &&
                    '✓ Checks effective price across base product pricing and individual active variant overrides.'}
                  {ruleField === 'tags' && '✓ Automatically pulls all products tagged with this keyword.'}
                  {ruleField === 'featured' && '✓ Enter "true" or "1" to pull all featured items.'}
                </p>
              </div>
            )}

            {/* MANUAL Product Picker */}
            {type === 'MANUAL' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Selected Products ({selectedProductIds.length})
                  </span>
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search catalog..."
                      className="w-full rounded-lg border border-input bg-background pl-8 pr-2 py-1 text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-background divide-y divide-border">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No products found in catalog
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProductSelection(p.id)}
                          className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-muted/40 transition-colors ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded border ${
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/40'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>

                            {p.images[0]?.url ? (
                              <div className="relative h-8 w-8 rounded overflow-hidden border border-border bg-muted shrink-0">
                                <Image
                                  src={p.images[0].url}
                                  alt={p.images[0].altText || p.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded border border-border bg-muted flex items-center justify-center text-[10px] font-bold">
                                PKG
                              </div>
                            )}

                            <div>
                              <span className="text-xs font-semibold text-foreground block">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                /products/{p.slug}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hero Banner Image Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Collection Hero Banner</h2>
                <p className="text-[11px] text-muted-foreground">Appears at top of the collection page</p>
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
                    aria-label="Remove banner image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label htmlFor="col-alt" className="block text-xs font-semibold text-foreground">
                    Image Alt Description (Mandatory for Accessibility) *
                  </label>
                  <input
                    id="col-alt"
                    type="text"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="e.g. Summer collection clothing line preview"
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
                <p className="text-xs font-semibold text-foreground">No hero banner attached</p>
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
              <label htmlFor="col-seo-title" className="block text-xs font-semibold text-foreground">
                Page Title Tag
              </label>
              <input
                id="col-seo-title"
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={name ? `${name} | Store Collection` : 'Collection SEO Title'}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="col-seo-desc" className="block text-xs font-semibold text-foreground">
                Meta Description
              </label>
              <textarea
                id="col-seo-desc"
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
                <span className="text-[11px] text-muted-foreground">Visible on storefront</span>
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
              <label htmlFor="col-sort" className="block text-xs font-semibold text-foreground">
                Display Sort Order
              </label>
              <input
                id="col-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground">Lower numbers appear first in lists</p>
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
              <span>{isEditing ? 'Save Collection Changes' : 'Create Collection'}</span>
            </button>

            <Link
              href="/admin/collections"
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
        />
      )}
    </form>
  );
}

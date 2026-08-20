'use client';
import { formatCurrency } from '@/lib/format';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2, ArrowLeft, AlertCircle, ImagePlus, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { MediaUploadModal } from './MediaUploadModal';

export function ProductForm({
  initialData,
  categories = [],
}: {
  initialData?: any;
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [comparePrice, setComparePrice] = useState(initialData?.comparePrice?.toString() || '');
  const [status, setStatus] = useState(initialData?.status || 'ACTIVE');
  const [vendor, setVendor] = useState(initialData?.vendor || '');
  const [featured, setFeatured] = useState(initialData?.featured || false);
  const [hasVariants, setHasVariants] = useState(initialData?.hasVariants || false);
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || '');

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    initialData?.categories?.map((c: any) => c.categoryId || c.category?.id) || []
  );

  // Images state tied to Media Library assets
  const [images, setImages] = useState<Array<{ url: string; altText: string; isPrimary: boolean }>>(
    initialData?.images?.map((img: any) => ({
      url: img.url,
      altText: img.altText || '',
      isPrimary: img.isPrimary || false,
    })) || []
  );

  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  // Variants state
  const [variants, setVariants] = useState<Array<{ title: string; sku: string; price: string; inventoryQty: string }>>(
    initialData?.variants?.map((v: any) => ({
      title: v.title,
      sku: v.sku,
      price: v.price?.toString() || '',
      inventoryQty: v.inventoryQty?.toString() || '0',
    })) || []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto slug generation from name if empty
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
    setImages((prev) => [
      ...prev,
      {
        url: asset.url,
        altText: asset.altText || name,
        isPrimary: prev.length === 0,
      },
    ]);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Ensure there is always a primary image if images remain
      if (next.length > 0 && !next.some((img) => img.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
  };

  const handleUpdateImageAlt = (index: number, newAlt: string) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, altText: newAlt } : img))
    );
  };

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        title: '',
        sku: `${slug || 'sku'}-${prev.length + 1}`,
        price: '',
        inventoryQty: '10',
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      price: parseFloat(price) || 0,
      comparePrice: comparePrice ? parseFloat(comparePrice) : null,
      status,
      vendor: vendor.trim() || null,
      featured,
      hasVariants,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
      categoryIds: selectedCategoryIds,
      images: images.map((img, idx) => ({
        url: img.url,
        altText: img.altText || name,
        position: idx,
        isPrimary: img.isPrimary,
      })),
      variants: hasVariants
        ? variants.map((v) => ({
            title: v.title.trim(),
            sku: v.sku.trim(),
            price: v.price ? parseFloat(v.price) : null,
            inventoryQty: parseInt(v.inventoryQty, 10) || 0,
            isActive: true,
          }))
        : [],
    };

    try {
      const url = isEditing ? `/api/products/${initialData.id}` : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to save product');
        setIsLoading(false);
        return;
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err) {
      console.error('Product save error:', err);
      setErrorMessage('Network error occurred while saving product');
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Top action bar */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <Link
            href="/admin/products"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Products</span>
          </Link>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{isEditing ? 'Save Changes' : 'Publish Product'}</span>
          </button>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2 Cols: Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Information */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Basic Information</h2>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Classic Oxford Leather Shoes"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground">Slug (URL Handle) *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="classic-oxford-leather-shoes"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground">Description *</label>
                <textarea
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed specifications, materials, and features..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Pricing & Valuation</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground">Retail Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="4500"
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground">Compare Price (Original / Strike-through)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={comparePrice}
                    onChange={(e) => setComparePrice(e.target.value)}
                    placeholder="5500"
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            {/* Retofitted Image Manager with Media Library & Required Alt Text */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Media Gallery (ProductImage)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Managed through Media Library. Alt text is mandatory for accessibility & SEO.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMediaModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span>Add from Library</span>
                </button>
              </div>

              {/* Images Grid */}
              {images.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`relative flex gap-3 rounded-xl border p-3 bg-muted/10 transition-all ${
                        img.isPrimary ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                      }`}
                    >
                      {/* Image Thumbnail with Explicit Dimensions to Prevent CLS */}
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                        <Image
                          src={img.url}
                          alt={img.altText || name}
                          width={80}
                          height={80}
                          className="h-full w-full object-cover object-center"
                        />
                        {img.isPrimary && (
                          <div className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground shadow">
                            Cover
                          </div>
                        )}
                      </div>

                      {/* Alt text field & controls */}
                      <div className="flex flex-1 flex-col justify-between space-y-1.5">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-semibold text-muted-foreground">
                            Alt Text (Required) *
                          </label>
                          <input
                            type="text"
                            required
                            value={img.altText}
                            onChange={(e) => handleUpdateImageAlt(idx, e.target.value)}
                            placeholder="Descriptive alt text"
                            className="w-full rounded border border-input bg-background p-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          {!img.isPrimary ? (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary"
                            >
                              <Star className="h-3 w-3" />
                              <span>Set as cover</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                              <Star className="h-3 w-3 fill-primary" />
                              <span>Cover Image</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            title="Remove image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => setMediaModalOpen(true)}
                  className="rounded-xl border-2 border-dashed border-border py-8 text-center cursor-pointer hover:bg-muted/10 transition-colors space-y-2"
                >
                  <ImagePlus className="mx-auto h-7 w-7 text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground">No images attached yet.</p>
                  <span className="text-xs font-semibold text-primary">Click to select or upload images</span>
                </div>
              )}
            </div>

            {/* Variants Matrix */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Variants & Inventory</h2>
                  <p className="text-xs text-muted-foreground">Manage sizes, colors, and stock per SKU.</p>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Enable Variants</span>
                </label>
              </div>

              {hasVariants && (
                <div className="space-y-3 pt-2">
                  {variants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 rounded-lg border border-border p-3 bg-muted/10">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground">Title (e.g. Black / L)</label>
                        <input
                          type="text"
                          required
                          value={v.title}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].title = e.target.value;
                            setVariants(updated);
                          }}
                          className="w-full rounded border border-input bg-background p-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground">SKU *</label>
                        <input
                          type="text"
                          required
                          value={v.sku}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].sku = e.target.value;
                            setVariants(updated);
                          }}
                          className="w-full rounded border border-input bg-background p-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground">Price (optional override)</label>
                        <input
                          type="number"
                          value={v.price}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].price = e.target.value;
                            setVariants(updated);
                          }}
                          className="w-full rounded border border-input bg-background p-1.5 text-xs"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-semibold text-muted-foreground">Stock Qty</label>
                          <input
                            type="number"
                            value={v.inventoryQty}
                            onChange={(e) => {
                              const updated = [...variants];
                              updated[idx].inventoryQty = e.target.value;
                              setVariants(updated);
                            }}
                            className="w-full rounded border border-input bg-background p-1.5 text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="p-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted w-full justify-center"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Variant</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right 1 Col: Metadata & Organization */}
          <div className="space-y-6">
            {/* Status & Visibility */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Publishing Status</h2>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="ACTIVE">Active (Visible on Storefront)</option>
                  <option value="DRAFT">Draft (Hidden)</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-foreground pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Featured on Homepage</span>
              </label>
            </div>

            {/* Categories */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Category Assignment</h2>
              {categories.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories.map((c) => {
                    const isChecked = selectedCategoryIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds((prev) => [...prev, c.id]);
                            } else {
                              setSelectedCategoryIds((prev) => prev.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No categories created yet.</p>
              )}
            </div>

            {/* SEO Metadata per BUILD_STANDARDS 2.10 */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">SEO Metadata</h2>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground">SEO Title Tag</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Custom Page Title | Brand"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground">Meta Description</label>
                <textarea
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Brief snippet for search engine previews..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Media Picker Modal */}
      <MediaUploadModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={handleMediaSelected}
      />
    </>
  );
}

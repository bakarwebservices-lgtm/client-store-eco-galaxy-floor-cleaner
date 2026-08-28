'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ProductStatus } from '@prisma/client';
import { MediaUploadModal, SelectedMediaItem } from '@/components/admin/MediaUploadModal';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { safeFetch } from '@/lib/apiClient';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  ImagePlus,
  Star,
  Film,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
} from 'lucide-react';

interface ProductFormProps {
  initialData?: any;
  categories?: Array<{ id: string; name: string }>;
  initialCategories?: Array<{ id: string; name: string }>;
  isEditing?: boolean;
}

export interface GalleryMediaItem {
  id?: string;
  url: string;
  altText: string;
  isPrimary: boolean;
  variantId?: string | null;
}

export function ProductForm({
  initialData,
  categories = [],
  initialCategories = [],
  isEditing = false,
}: ProductFormProps) {
  const router = useRouter();
  const passedCategories = categories.length > 0 ? categories : initialCategories;
  const effectiveIsEditing = isEditing || Boolean(initialData?.id);

  // Basic Info state
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [comparePrice, setComparePrice] = useState(initialData?.comparePrice?.toString() || '');
  const [status, setStatus] = useState<ProductStatus>(initialData?.status || ProductStatus.ACTIVE);
  const [vendor, setVendor] = useState(initialData?.vendor || '');
  const [featured, setFeatured] = useState(initialData?.featured || false);
  const [hasVariants, setHasVariants] = useState(initialData?.hasVariants || false);
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription || '');

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    initialData?.categories?.map((c: any) => c.categoryId || c.category?.id) || []
  );

  // Main product gallery media (Images & Videos - Up to 20 slots)
  const [images, setImages] = useState<GalleryMediaItem[]>(
    initialData?.images?.map((img: any) => ({
      id: img.id,
      url: img.url,
      altText: img.altText || '',
      isPrimary: img.isPrimary || false,
      variantId: img.variantId || null,
    })) || []
  );

  // Modal states for main gallery vs variant media
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [variantMediaModalIndex, setVariantMediaModalIndex] = useState<number | null>(null);

  // Variants state (supports up to 10+ media slots per variant)
  const [variants, setVariants] = useState<
    Array<{
      id?: string;
      title: string;
      sku: string;
      price: string;
      inventoryQty: string;
      mediaUrls?: string[];
    }>
  >(
    initialData?.variants?.map((v: any) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: v.price?.toString() || '',
      inventoryQty: v.inventoryQty?.toString() || '0',
      mediaUrls: initialData?.images
        ?.filter((img: any) => img.variantId === v.id)
        ?.map((img: any) => img.url) || [],
    })) || []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: string; name: string }>>(passedCategories);

  // Load available categories on mount if not provided in props
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories?admin=true');
        if (res.ok) {
          const data = await res.json();
          setAvailableCategories(data.categories || []);
        }
      } catch (err) {
        console.error('Failed to load categories in ProductForm', err);
      }
    }
    if (passedCategories.length === 0) {
      loadCategories();
    }
  }, [passedCategories.length]);

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

  const isVideoUrl = (url: string) => {
    return url.match(/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i) !== null;
  };

  // Main Gallery Multi-Media Selection Handler
  const handleMainMediaSelected = (assets: SelectedMediaItem[]) => {
    setImages((prev) => {
      const remainingSlots = 20 - prev.length;
      if (remainingSlots <= 0) return prev;

      const newItems: GalleryMediaItem[] = assets.slice(0, remainingSlots).map((a, idx) => ({
        url: a.url,
        altText: a.altText || name || 'Product Media Asset',
        isPrimary: prev.length === 0 && idx === 0,
        variantId: null,
      }));

      return [...prev, ...newItems];
    });
  };

  // Single media fallback
  const handleSingleMainMediaSelected = (asset: SelectedMediaItem) => {
    handleMainMediaSelected([asset]);
  };

  // Variant Media Selection Handler
  const handleVariantMediaSelected = (assets: SelectedMediaItem[]) => {
    if (variantMediaModalIndex === null) return;

    const vIdx = variantMediaModalIndex;
    const urlsToAdd = assets.map((a) => a.url);

    setVariants((prev) => {
      const copy = [...prev];
      const currentUrls = copy[vIdx].mediaUrls || [];
      const updatedUrls = Array.from(new Set([...currentUrls, ...urlsToAdd])).slice(0, 10);
      copy[vIdx].mediaUrls = updatedUrls;
      return copy;
    });

    // Also ensure these assets exist in main gallery so they are persisted to ProductImage table
    setImages((prev) => {
      const existingUrls = new Set(prev.map((p) => p.url));
      const toAdd: GalleryMediaItem[] = assets
        .filter((a) => !existingUrls.has(a.url))
        .map((a) => ({
          url: a.url,
          altText: a.altText || `${name} - ${variants[vIdx]?.title || 'Variant'}`,
          isPrimary: prev.length === 0,
          variantId: variants[vIdx]?.id || null,
        }));
      return [...prev, ...toAdd];
    });

    setVariantMediaModalIndex(null);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((img) => img.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    setImages((prev) => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
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
        mediaUrls: [],
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveVariantMediaUrl = (vIdx: number, urlToRemove: string) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[vIdx].mediaUrls = (copy[vIdx].mediaUrls || []).filter((u) => u !== urlToRemove);
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Product name is required');
      return;
    }
    if (!slug.trim()) {
      setErrorMessage('Slug is required');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      setErrorMessage('Price must be greater than 0');
      return;
    }

    if (hasVariants) {
      if (variants.length === 0) {
        setErrorMessage('You must add at least one variant when variants are enabled');
        return;
      }
      for (let i = 0; i < variants.length; i++) {
        if (!variants[i].title.trim()) {
          setErrorMessage(`Variant #${i + 1} is missing a title`);
          return;
        }
        if (!variants[i].sku.trim()) {
          setErrorMessage(`Variant #${i + 1} is missing a SKU`);
          return;
        }
      }
    }

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
        variantId: img.variantId || null,
      })),
      variants: hasVariants
        ? variants.map((v) => ({
            id: v.id,
            title: v.title.trim(),
            sku: v.sku.trim(),
            price: v.price ? parseFloat(v.price) : null,
            inventoryQty: parseInt(v.inventoryQty, 10) || 0,
            isActive: true,
          }))
        : [],
    };

    try {
      const url = effectiveIsEditing ? `/api/products/${initialData.id}` : '/api/products';
      const method = effectiveIsEditing ? 'PUT' : 'POST';

      const { ok, data, error } = await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!ok) {
        setErrorMessage(error || 'Failed to save product');
        setIsLoading(false);
        return;
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err: any) {
      console.error('Product save error:', err);
      setErrorMessage(err?.message || 'Network error occurred while saving product');
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
            <span>{effectiveIsEditing ? 'Save Changes' : 'Publish Product'}</span>
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
                <label htmlFor="prod-name" className="block text-xs font-semibold text-muted-foreground">
                  Product Name *
                </label>
                <input
                  id="prod-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Aura Minimalist Titanium Smart Ring"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prod-slug" className="block text-xs font-semibold text-muted-foreground">
                  Slug (URL Handle) *
                </label>
                <input
                  id="prod-slug"
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="aura-minimalist-titanium-smart-ring"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prod-description" className="block text-xs font-semibold text-muted-foreground">
                  Description *
                </label>
                <RichTextEditor
                  id="prod-description"
                  value={description}
                  onChange={setDescription}
                  placeholder="Detailed specifications, materials, sizing, and features..."
                  rows={6}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Pricing & Valuation</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="prod-price" className="block text-xs font-semibold text-muted-foreground">
                    Retail Price *
                  </label>
                  <input
                    id="prod-price"
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="199.00"
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="prod-compare-price" className="block text-xs font-semibold text-muted-foreground">
                    Compare Price (Original / Strike-through)
                  </label>
                  <input
                    id="prod-compare-price"
                    type="number"
                    step="0.01"
                    value={comparePrice}
                    onChange={(e) => setComparePrice(e.target.value)}
                    placeholder="249.00"
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            {/* 10+ Media Slots Gallery (Images & Videos) */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                      Product Media Gallery
                    </h2>
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                      {images.length}/20 Slots Used
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upload multiple images & videos (MP4, WebM, MOV, JPG, PNG). At least 10 slots supported.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setVariantMediaModalIndex(null);
                    setMediaModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors shrink-0"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span>Add Images / Videos</span>
                </button>
              </div>

              {/* Media Grid */}
              {images.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {images.map((img, idx) => {
                    const isVideo = isVideoUrl(img.url);

                    return (
                      <div
                        key={idx}
                        className={`relative flex gap-3 rounded-xl border p-3 bg-muted/10 transition-all ${
                          img.isPrimary ? 'border-primary ring-2 ring-primary/30 shadow-sm' : 'border-border'
                        }`}
                      >
                        {/* Media Thumbnail with Video/Image Player */}
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-black/5 flex items-center justify-center">
                          {isVideo ? (
                            <div className="relative h-full w-full bg-slate-950 flex flex-col items-center justify-center text-white">
                              <video
                                src={img.url}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                                <Film className="h-6 w-6 text-white drop-shadow" />
                              </div>
                              <div className="absolute top-1 left-1 rounded bg-primary/90 px-1 py-0.5 text-[8px] font-bold text-white uppercase">
                                Video
                              </div>
                            </div>
                          ) : (
                            <Image
                              src={img.url}
                              alt={img.altText || name}
                              width={96}
                              height={96}
                              className="h-full w-full object-cover object-center"
                            />
                          )}

                          {img.isPrimary && (
                            <div className="absolute top-1 right-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground shadow">
                              Cover
                            </div>
                          )}
                        </div>

                        {/* Alt text field & controls */}
                        <div className="flex flex-1 flex-col justify-between space-y-2">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-muted-foreground">
                              Alt Text / Caption *
                            </label>
                            <input
                              type="text"
                              required
                              value={img.altText}
                              onChange={(e) => handleUpdateImageAlt(idx, e.target.value)}
                              placeholder="Describe this media item..."
                              className="w-full rounded-md border border-input bg-background p-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          {/* Action Toolbar */}
                          <div className="flex items-center justify-between pt-1 border-t border-border/40">
                            {/* Reorder Buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveImage(idx, 'left')}
                                className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                title="Move Earlier"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                              <button
                                type="button"
                                disabled={idx === images.length - 1}
                                onClick={() => handleMoveImage(idx, 'right')}
                                className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                title="Move Later"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {!img.isPrimary ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryImage(idx)}
                                  className="text-[10px] font-semibold text-primary hover:underline"
                                >
                                  Make Cover
                                </button>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                                  <Star className="h-3 w-3 fill-current" />
                                  <span>Cover</span>
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="text-muted-foreground hover:text-destructive p-1"
                                title="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  onClick={() => {
                    setVariantMediaModalIndex(null);
                    setMediaModalOpen(true);
                  }}
                  className="rounded-2xl border-2 border-dashed border-border py-10 text-center cursor-pointer hover:bg-muted/10 transition-colors space-y-2"
                >
                  <ImagePlus className="mx-auto h-9 w-9 text-primary/60" />
                  <p className="text-sm font-semibold text-foreground">No media assets attached yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Click to select multiple photos or videos (10+ slots available for high-res galleries).
                  </p>
                </div>
              )}
            </div>

            {/* Variants Matrix with Per-Variant Media Slots */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Variants Matrix & Specific Media
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Attach variant-specific photos/videos (e.g. Matte Black vs Silver Ring).
                  </p>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Enable Variants</span>
                </label>
              </div>

              {hasVariants && (
                <div className="space-y-4 pt-2">
                  {variants.map((v, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border p-4 bg-muted/10 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground">
                            Variant Title (e.g. Titanium / Size 10) *
                          </label>
                          <input
                            type="text"
                            required
                            value={v.title}
                            onChange={(e) => {
                              const updated = [...variants];
                              updated[idx].title = e.target.value;
                              setVariants(updated);
                            }}
                            placeholder="Color / Size / Finish"
                            className="w-full rounded border border-input bg-background p-2 text-xs"
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
                            className="w-full rounded border border-input bg-background p-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground">
                            Price Override (Optional)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.price}
                            onChange={(e) => {
                              const updated = [...variants];
                              updated[idx].price = e.target.value;
                              setVariants(updated);
                            }}
                            placeholder={price || '0.00'}
                            className="w-full rounded border border-input bg-background p-2 text-xs"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] font-semibold text-muted-foreground">
                              Stock Qty
                            </label>
                            <input
                              type="number"
                              value={v.inventoryQty}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[idx].inventoryQty = e.target.value;
                                setVariants(updated);
                              }}
                              className="w-full rounded border border-input bg-background p-2 text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="rounded p-2 text-muted-foreground hover:text-destructive hover:bg-muted"
                            title="Remove variant"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Variant-Level Media Gallery */}
                      <div className="pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            Variant Media ({v.mediaUrls?.length || 0}/10 Slots)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setVariantMediaModalIndex(idx);
                              setMediaModalOpen(true);
                            }}
                            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Attach Media to Variant
                          </button>
                        </div>

                        {v.mediaUrls && v.mediaUrls.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {v.mediaUrls.map((mUrl, mIdx) => (
                              <div
                                key={mIdx}
                                className="relative h-14 w-14 rounded-lg border border-border overflow-hidden group bg-background"
                              >
                                {isVideoUrl(mUrl) ? (
                                  <div className="flex h-full w-full items-center justify-center bg-slate-900 text-primary">
                                    <Film className="h-5 w-5" />
                                  </div>
                                ) : (
                                  <Image
                                    src={mUrl}
                                    alt="Variant Media"
                                    fill
                                    className="object-cover"
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariantMediaUrl(idx, mUrl)}
                                  className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Detach from variant"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">
                            Inherits main product gallery images unless variant media is attached.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-semibold text-primary hover:bg-muted/10 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Another Variant SKU</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Taxonomy, Status & SEO */}
          <div className="space-y-6">
            {/* Status & Visibility */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Status & Organization</h2>

              <div className="space-y-1.5">
                <label htmlFor="prod-status" className="block text-xs font-semibold text-muted-foreground">
                  Product Status
                </label>
                <select
                  id="prod-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={ProductStatus.ACTIVE}>Active (Visible in Storefront)</option>
                  <option value={ProductStatus.DRAFT}>Draft (Hidden)</option>
                  <option value={ProductStatus.ARCHIVED}>Archived</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prod-vendor" className="block text-xs font-semibold text-muted-foreground">
                  Brand / Vendor
                </label>
                <input
                  id="prod-vendor"
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. Vortex Luxury Lab"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>Feature on Homepage Showcase</span>
              </label>
            </div>

            {/* Categories */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Categories</h2>
              <p className="text-xs text-muted-foreground">Select one or more categories for taxonomy.</p>

              {availableCategories.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                  {availableCategories.map((cat) => {
                    const checked = selectedCategoryIds.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer hover:text-primary transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds([...selectedCategoryIds, cat.id]);
                            } else {
                              setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== cat.id));
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No categories created yet.</p>
              )}
            </div>

            {/* SEO Optimization */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">SEO Meta Tags</h2>

              <div className="space-y-1.5">
                <label htmlFor="prod-seo-title" className="block text-xs font-semibold text-muted-foreground">
                  SEO Page Title
                </label>
                <input
                  id="prod-seo-title"
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={name || 'Search engine title...'}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prod-seo-desc" className="block text-xs font-semibold text-muted-foreground">
                  SEO Meta Description
                </label>
                <textarea
                  id="prod-seo-desc"
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Summary displayed in Google search results..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Reusable Modal for Main Gallery & Variant Media Selection */}
      <MediaUploadModal
        isOpen={mediaModalOpen}
        onClose={() => {
          setMediaModalOpen(false);
          setVariantMediaModalIndex(null);
        }}
        onSelect={variantMediaModalIndex !== null ? (a) => handleVariantMediaSelected([a]) : handleSingleMainMediaSelected}
        onSelectMultiple={variantMediaModalIndex !== null ? handleVariantMediaSelected : handleMainMediaSelected}
        title={
          variantMediaModalIndex !== null
            ? `Attach Media to Variant (${variants[variantMediaModalIndex]?.title || 'Variant'})`
            : 'Product Media Gallery (Upload or Select Multi-Items)'
        }
        allowMultiple={true}
      />
    </>
  );
}

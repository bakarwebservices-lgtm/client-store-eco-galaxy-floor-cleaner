'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Star,
  ShieldCheck,
  Camera,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import { safeFetch } from '@/lib/apiClient';

interface ReviewImage {
  url: string;
  altText: string;
}

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  images: string[]; // JSON stringified or raw string
  isVerified: boolean;
  createdAt: string;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  verifiedCount: number;
  ratingCounts: Record<number, number>;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    verifiedCount: 0,
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<ReviewImage[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lightbox state
  const [activeLightboxImg, setActiveLightboxImg] = useState<ReviewImage | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const fetchReviews = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews?page=${p}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        if (data.stats) setStats(data.stats);
        if (data.pagination) {
          setPage(data.pagination.page);
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1);
  }, [productId]);

  // Modal Focus trap & Escape listener (BUILD_STANDARDS 4.6)
  useEffect(() => {
    if (!isModalOpen) return;

    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > 5) {
      setFormError(`Maximum 5 photos allowed. You currently have ${images.length} photo(s).`);
      return;
    }

    setPhotoUploading(true);
    setFormError(null);

    try {
      for (const file of files) {
        if (file.size > 15 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds maximum allowed 15MB limit.`);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'reviews');
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
        formData.append('altText', cleanName || `${productName} review photo`);

        const { ok, data, error } = await safeFetch<any>('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!ok || !data?.asset?.url) {
          throw new Error(error || `Failed to upload "${file.name}".`);
        }

        setImages((prev) => [
          ...prev,
          {
            url: data.asset.url,
            altText: data.asset.altText || cleanName || `${productName} review photo`,
          },
        ]);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    if (!newImageAlt.trim()) {
      setFormError('Please provide an image alt description for accessibility.');
      return;
    }
    if (images.length >= 5) {
      setFormError('Maximum 5 images allowed.');
      return;
    }
    setImages([...images, { url: newImageUrl.trim(), altText: newImageAlt.trim() }]);
    setNewImageUrl('');
    setNewImageAlt('');
    setShowUrlInput(false);
    setFormError(null);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const { ok, data, error } = await safeFetch<any>(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerName,
          rating,
          title: title || undefined,
          body,
          images,
        }),
      });

      if (!ok) {
        setFormError(error || 'Failed to submit review');
        setSubmitting(false);
        return;
      }

      setSuccessMessage(data?.message || 'Review submitted and pending moderation!');
      setReviewerName('');
      setTitle('');
      setBody('');
      setImages([]);
      setRating(5);

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred while submitting review');
    } finally {
      setSubmitting(false);
    }
  };

  const parseReviewImages = (rawImages: string[]): ReviewImage[] => {
    if (!Array.isArray(rawImages)) return [];
    return rawImages
      .map((img) => {
        try {
          if (typeof img === 'string' && img.startsWith('{')) {
            return JSON.parse(img);
          }
          return { url: img, altText: `${productName} review photo` };
        } catch {
          return { url: img, altText: `${productName} review photo` };
        }
      })
      .filter((img) => Boolean(img?.url));
  };

  return (
    <section aria-labelledby="reviews-heading" className="space-y-8 border-t border-border pt-10">
      {/* Header & Stats Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 id="reviews-heading" className="text-xl font-bold tracking-tight text-foreground">
            Customer Reviews & Ratings
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real feedback from verified buyers and community reviewers
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setSuccessMessage(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Write a Review</span>
        </button>
      </div>

      {/* Ratings Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        {/* Overall Score */}
        <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border pb-6 md:pb-0 md:pr-6 text-center space-y-2">
          <span className="text-4xl font-extrabold text-foreground">
            {stats.averageRating.toFixed(1)}
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= Math.round(stats.averageRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Based on {stats.totalReviews} approved {stats.totalReviews === 1 ? 'review' : 'reviews'}
          </p>
          {stats.verifiedCount > 0 && (
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{stats.verifiedCount} Verified Purchases</span>
            </div>
          )}
        </div>

        {/* Breakdown Bars */}
        <div className="md:col-span-2 space-y-2.5 justify-center flex flex-col">
          {[5, 4, 3, 2, 1].map((starCount) => {
            const count = stats.ratingCounts[starCount] || 0;
            const percentage =
              stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;

            return (
              <div key={starCount} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-semibold text-foreground flex items-center gap-1">
                  <span>{starCount}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </span>

                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>

                <span className="w-10 text-right text-muted-foreground text-[11px] font-medium">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews Listing */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
            <span>Loading customer reviews...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Star className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No reviews yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Be the first to review {productName} and help other shoppers make an informed choice!
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Share Your Feedback</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => {
              const reviewImages = parseReviewImages(rev.images);

              return (
                <article
                  key={rev.id}
                  className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {rev.reviewerName}
                        </span>
                        {rev.isVerified && (
                          <span
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-500/20"
                            title="Verified Purchase from completed order"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            <span>Verified Buyer</span>
                          </span>
                        )}
                      </div>

                      {/* Star Rating Display */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <time
                      dateTime={rev.createdAt}
                      className="text-[11px] text-muted-foreground whitespace-nowrap"
                    >
                      {new Date(rev.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </div>

                  {rev.title && (
                    <h4 className="text-xs font-bold text-foreground">{rev.title}</h4>
                  )}

                  {rev.body && (
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {rev.body}
                    </p>
                  )}

                  {/* Photo Gallery Thumbnail Lightbox */}
                  {reviewImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {reviewImages.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveLightboxImg(img)}
                          className="relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-transform hover:scale-105"
                          aria-label={`View photo ${idx + 1}: ${img.altText}`}
                        >
                          <Image
                            src={img.url}
                            alt={img.altText || `${productName} review photo`}
                            fill
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-4 text-xs font-medium text-muted-foreground">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => fetchReviews(page - 1)}
                  className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => fetchReviews(page + 1)}
                  className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-30 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Submission Modal (BUILD_STANDARDS 4.6 compliant) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="write-review-title"
            className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
              <div>
                <h3 id="write-review-title" className="text-sm font-bold text-foreground">
                  Write a Review
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Reviewing: <span className="font-semibold text-foreground">{productName}</span>
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-colors"
                aria-label="Close review modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitReview} className="overflow-y-auto p-6 space-y-4 flex-1">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Star Rating Picker */}
              <div className="space-y-1.5 text-center py-2 border-b border-border">
                <label className="block text-xs font-bold text-foreground">Your Overall Rating *</label>
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-transform hover:scale-110"
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`h-7 w-7 ${
                          star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {rating === 5 && 'Outstanding'}
                  {rating === 4 && 'Very Good'}
                  {rating === 3 && 'Average'}
                  {rating === 2 && 'Below Average'}
                  {rating === 1 && 'Poor'}
                </span>
              </div>

              {/* Reviewer Name */}
              <div className="space-y-1.5">
                <label htmlFor="review-name" className="block text-xs font-semibold text-foreground">
                  Your Display Name *
                </label>
                <input
                  id="review-name"
                  type="text"
                  required
                  aria-required="true"
                  autoComplete="name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Ahmad K."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Review Title */}
              <div className="space-y-1.5">
                <label htmlFor="review-headline" className="block text-xs font-semibold text-foreground">
                  Headline / Title (Optional)
                </label>
                <input
                  id="review-headline"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Great comfort, excellent stitching"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Review Body */}
              <div className="space-y-1.5">
                <label htmlFor="review-body" className="block text-xs font-semibold text-foreground">
                  Review Details *
                </label>
                <textarea
                  id="review-body"
                  required
                  aria-required="true"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What did you like or dislike? How was the fit and durability?"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Photo Upload with Mandatory altText per prompt */}
              <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-primary" />
                    <span>Attach Photos ({images.length}/5)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">JPEG, PNG, WebP up to 15MB</span>
                </div>

                {images.length < 5 && (
                  <div className="space-y-2 pt-1">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={photoUploading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {photoUploading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Uploading photo...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="h-3.5 w-3.5" />
                            <span>+ Upload Photo from Device</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showUrlInput ? 'Hide URL' : 'Paste URL'}
                      </button>
                    </div>

                    {showUrlInput && (
                      <div className="space-y-2 rounded-lg border border-border bg-card p-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="url"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            placeholder="Image URL (https://...)"
                            className="rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none"
                          />
                          <input
                            type="text"
                            value={newImageAlt}
                            onChange={(e) => setNewImageAlt(e.target.value)}
                            placeholder="Photo description (Alt text) *"
                            className="rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddImage}
                          className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors w-full"
                        >
                          + Add Image URL
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative h-14 w-14 rounded-lg border border-border overflow-hidden group"
                      >
                        <Image src={img.url} alt={img.altText} fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          aria-label={`Remove photo ${idx + 1}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Submit Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightboxImg && (
        <div
          onClick={() => setActiveLightboxImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] w-full rounded-2xl overflow-hidden bg-black/90 p-2 shadow-2xl flex flex-col items-center"
          >
            <button
              type="button"
              onClick={() => setActiveLightboxImg(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/90 transition-colors"
              aria-label="Close photo preview"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative h-[65vh] w-full">
              <Image
                src={activeLightboxImg.url}
                alt={activeLightboxImg.altText}
                fill
                className="object-contain"
              />
            </div>
            <p className="text-xs text-zinc-300 py-3 text-center px-4 font-medium">
              {activeLightboxImg.altText}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

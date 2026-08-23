'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Loader2,
  ExternalLink,
  MessageSquare,
  Upload,
} from 'lucide-react';
import { BulkActionBar, BulkActionOption } from '@/components/admin/BulkActionBar';
import { ReviewCsvImportModal } from '@/components/admin/ReviewCsvImportModal';
import { safeFetch } from '@/lib/apiClient';

interface ReviewImage {
  url: string;
  altText: string;
}

interface AdminReview {
  id: string;
  productId: string;
  customerId?: string | null;
  reviewerName: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  images: string[];
  isVerified: boolean;
  isApproved: boolean;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    images: { url: string; altText?: string | null }[];
  };
  customer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export const dynamic = 'force-dynamic';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filters
  const [statusTab, setStatusTab] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, total: 0 });

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const fetchReviews = async (currentPage = 1, currentStatus = statusTab) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: currentStatus,
        page: currentPage.toString(),
        limit: '15',
        ...(search ? { search } : {}),
      });

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load reviews');
      const data = await res.json();
      setReviews(data.reviews || []);
      setSelectedIds([]);
      if (data.counts) setCounts(data.counts);
      if (data.pagination) {
        setPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1, statusTab);
  }, [statusTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReviews(1, statusTab);
  };

  const handleToggleApproval = async (reviewId: string, approve: boolean) => {
    setActionLoadingId(reviewId);
    setNotification(null);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: approve }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setNotification({
        type: 'success',
        text: approve ? 'Review approved and published to storefront.' : 'Review moved to pending queue.',
      });

      fetchReviews(page, statusTab);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;

    setActionLoadingId(reviewId);
    setNotification(null);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete review');

      setNotification({ type: 'success', text: 'Review permanently removed.' });
      fetchReviews(page, statusTab);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bulk operations
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (selectedIds.length === reviews.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reviews.map((r) => r.id));
    }
  };

  const handleExecuteBulkAction = async (actionKey: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);

    try {
      const { ok, error: reqErr } = await safeFetch('/api/admin/reviews/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          action: actionKey,
        }),
      });

      if (!ok) {
        setNotification({ type: 'error', text: reqErr || 'Bulk action failed' });
      } else {
        setNotification({ type: 'success', text: 'Bulk review action completed successfully.' });
        await fetchReviews(page, statusTab);
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'Bulk action failed' });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkActions: BulkActionOption[] = [
    { label: 'Approve Selected', actionKey: 'APPROVE', variant: 'success', icon: CheckCircle },
    { label: 'Mark Pending', actionKey: 'UNAPPROVE', variant: 'outline', icon: AlertCircle },
    {
      label: 'Delete Selected',
      actionKey: 'DELETE',
      variant: 'destructive',
      icon: Trash2,
      confirmMessage: `Permanently delete ${selectedIds.length} selected reviews?`,
    },
  ];

  const parseImages = (raw: string[]): ReviewImage[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        try {
          if (typeof item === 'string' && item.startsWith('{')) {
            return JSON.parse(item);
          }
          return { url: item, altText: 'Review photo' };
        } catch {
          return { url: item, altText: 'Review photo' };
        }
      })
      .filter((i) => Boolean(i?.url));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Review Moderation</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Approve, reject, and monitor customer product ratings and reviews.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => fetchReviews(page, statusTab)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium flex items-center justify-between ${
            notification.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Status Navigation Tabs & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStatusTab('PENDING');
              setPage(1);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              statusTab === 'PENDING'
                ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30 shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Pending</span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusTab('APPROVED');
              setPage(1);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              statusTab === 'APPROVED'
                ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>Approved</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
              {counts.approved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusTab('ALL');
              setPage(1);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              statusTab === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span>All</span>
            <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-extrabold">
              {counts.total}
            </span>
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reviewer, product..."
              className="rounded-lg border border-input bg-card pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
        </form>
      </div>

      {/* Moderation Cards Feed */}
      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p>Loading moderation queue...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-2">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
          <p className="text-xs text-destructive font-medium">{error}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center space-y-3">
          <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <h2 className="text-sm font-bold text-foreground">
            {statusTab === 'PENDING' ? 'No pending reviews in queue' : 'No reviews match your filters'}
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {statusTab === 'PENDING'
              ? 'All customer submissions have been moderated.'
              : 'Try adjusting your search query or status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select all toggle bar */}
          <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reviews.length > 0 && selectedIds.length === reviews.length}
                onChange={toggleSelectAllVisible}
                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
              />
              <span>Select all visible reviews on this page</span>
            </label>
          </div>

          {reviews.map((rev) => {
            const reviewImages = parseImages(rev.images);
            const isLoading = actionLoadingId === rev.id;
            const isSelected = selectedIds.includes(rev.id);

            return (
              <div
                key={rev.id}
                className={`rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 transition-all hover:border-primary/30 ${
                  isSelected ? 'ring-2 ring-primary/40 bg-primary/5' : ''
                }`}
              >
                {/* Top Row: Checkbox, Reviewer Meta & Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(rev.id)}
                      aria-label={`Select review by ${rev.reviewerName}`}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                    />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{rev.reviewerName}</span>
                        {rev.isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-500/20">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Verified Buyer</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Community Reviewer
                          </span>
                        )}
                        {rev.customer?.email && (
                          <span className="text-xs text-muted-foreground">({rev.customer.email})</span>
                        )}
                      </div>

                      {/* Stars and Date */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5">
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
                        <span className="text-xs text-muted-foreground">
                          {new Date(rev.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Pill & Row Actions */}
                  <div className="flex items-center gap-3">
                    {rev.isApproved ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Approved (Live)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Pending Approval</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {rev.isApproved ? (
                        <button
                          type="button"
                          onClick={() => handleToggleApproval(rev.id, false)}
                          disabled={isLoading}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          Unapprove
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleApproval(rev.id, true)}
                          disabled={isLoading}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete review"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Middle Section: Associated Product Context */}
                <div className="flex items-center justify-between rounded-xl bg-muted/20 border border-border p-3">
                  <div className="flex items-center gap-3">
                    {rev.product.images[0]?.url ? (
                      <div className="relative h-12 w-12 rounded-lg border border-border overflow-hidden bg-background shrink-0">
                        <Image
                          src={rev.product.images[0].url}
                          alt={rev.product.images[0].altText || rev.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-lg border border-border bg-muted flex items-center justify-center text-xs font-bold">
                        PKG
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        {rev.product.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Product ID: {rev.product.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/products/${rev.product.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <span>Storefront Page</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                {/* Review Text Content */}
                <div className="space-y-1.5">
                  {rev.title && (
                    <h2 className="text-sm font-bold text-foreground">{rev.title}</h2>
                  )}
                  {rev.body && (
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {rev.body}
                    </p>
                  )}
                </div>

                {/* Review Images */}
                {reviewImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {reviewImages.map((img, idx) => (
                      <a
                        key={idx}
                        href={img.url}
                        target="_blank"
                        rel="noreferrer"
                        className="relative h-16 w-16 rounded-lg border border-border overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        <Image src={img.url} alt={img.altText} fill className="object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={reviews.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={() => setSelectedIds(reviews.map((r) => r.id))}
        isAllSelected={selectedIds.length === reviews.length}
        isLoading={isBulkLoading}
        actions={bulkActions}
        onExecuteAction={handleExecuteBulkAction}
      />

      {/* Review CSV Import Modal */}
      <ReviewCsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchReviews(1, 'PENDING');
          setStatusTab('PENDING');
        }}
      />
    </div>
  );
}

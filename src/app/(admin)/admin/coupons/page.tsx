'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DiscountType } from '@prisma/client';
import { formatCurrency } from '@/lib/format';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Percent,
  Coins,
  Calendar,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { BulkActionBar, BulkActionOption } from '@/components/admin/BulkActionBar';
import { safeFetch } from '@/lib/apiClient';

interface CouponItem {
  id: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  computedState: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DEPLETED' | 'SCHEDULED';
  createdAt: string;
}

export const dynamic = 'force-dynamic';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'inactive'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/coupons?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load coupons');
      const data = await res.json();
      setCoupons(data.coupons || []);
      setSelectedIds([]);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error loading coupons' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCoupons();
  };

  const handleToggleActive = async (couponId: string) => {
    setTogglingId(couponId);
    setNotification(null);
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');

      setNotification({ type: 'success', text: data.message });
      fetchCoupons();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (coupon: CouponItem) => {
    const isHard = coupon.usedCount === 0;
    const confirmMsg = isHard
      ? `Delete coupon "${coupon.code}" permanently?`
      : `Coupon "${coupon.code}" has been used in ${coupon.usedCount} order(s). Deleting will deactivate it (isActive: false) to preserve order history. Proceed?`;

    if (!confirm(confirmMsg)) return;

    setDeletingId(coupon.id);
    setNotification(null);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete coupon');

      setNotification({ type: 'success', text: data.message });
      fetchCoupons();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (selectedIds.length === coupons.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(coupons.map((c) => c.id));
    }
  };

  const handleExecuteBulkAction = async (actionKey: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);

    try {
      const { ok, error } = await safeFetch('/api/admin/coupons/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          action: actionKey,
        }),
      });

      if (!ok) {
        setNotification({ type: 'error', text: error || 'Bulk action failed' });
      } else {
        setNotification({ type: 'success', text: `Bulk action completed successfully.` });
        await fetchCoupons();
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'Bulk action failed' });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkActions: BulkActionOption[] = [
    { label: 'Activate', actionKey: 'ACTIVATE', variant: 'success' },
    { label: 'Deactivate', actionKey: 'DEACTIVATE', variant: 'outline' },
    {
      label: 'Delete Selected',
      actionKey: 'DELETE',
      variant: 'destructive',
      icon: Trash2,
      confirmMessage: `Process delete for ${selectedIds.length} selected coupons? (Used coupons will be safely deactivated).`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Discount Coupons</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create and track promotional coupon codes, percentage/fixed deductions, and usage rules.
          </p>
        </div>

        <Link
          href="/admin/coupons/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>New Coupon</span>
        </Link>
      </div>

      {notification && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-medium ${
            notification.type === 'success'
              ? 'border border-success/30 bg-success/10 text-success'
              : 'border border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or description..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/40 p-1 text-xs">
            {(['all', 'active', 'inactive', 'expired'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading coupons...</span>
          </div>
        ) : coupons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={coupons.length > 0 && selectedIds.length === coupons.length}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all coupons"
                      className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                    />
                  </th>
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Usage</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                          aria-label={`Select coupon ${c.code}`}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground bg-muted/50 px-2 py-0.5 rounded border border-border">
                            {c.code}
                          </span>
                        </div>
                        {c.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `${formatCurrency(c.discountValue)} OFF`}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            c.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-muted-foreground">
                        {c.usedCount} {c.maxUses ? `/ ${c.maxUses}` : 'uses'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {c.expiresAt ? `Expires: ${new Date(c.expiresAt).toLocaleDateString()}` : 'No expiry'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(c.id)}
                            disabled={togglingId === c.id}
                            className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            {c.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <Link
                            href={`/admin/coupons/${c.id}`}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label={`Edit ${c.code}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(c)}
                            disabled={deletingId === c.id}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
                            aria-label={`Delete ${c.code}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <Tag className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">No coupons found.</p>
            <Link
              href="/admin/coupons/new"
              className="inline-block rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow"
            >
              Create Coupon
            </Link>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={coupons.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={() => setSelectedIds(coupons.map((c) => c.id))}
        isAllSelected={selectedIds.length === coupons.length}
        isLoading={isBulkLoading}
        actions={bulkActions}
        onExecuteAction={handleExecuteBulkAction}
      />
    </div>
  );
}

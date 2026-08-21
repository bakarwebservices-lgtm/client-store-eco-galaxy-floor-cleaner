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
  ArrowLeft,
  Calendar,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

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
      if (!res.ok) throw new Error(data.error || 'Failed to remove coupon');

      setNotification({ type: 'success', text: data.message });
      fetchCoupons();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Admin Hub</span>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div>
              <h1 className="text-base font-bold leading-tight">Coupons & Discounts</h1>
              <p className="text-xs text-muted-foreground">Manage promotional codes, percentage discounts, and fixed vouchers</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/coupons/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Coupon</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
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

        {/* Toolbar & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search coupon code or description..."
              className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 text-xs">
            {(['all', 'active', 'expired', 'inactive'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`rounded-lg px-3 py-1.5 font-semibold capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Coupons Table */}
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center space-y-3">
            <Tag className="h-8 w-8 text-muted-foreground mx-auto" />
            <h2 className="text-sm font-bold text-foreground">No coupons found</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create your first promotional discount coupon to drive campaigns and customer loyalty.
            </p>
            <Link
              href="/admin/coupons/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              <span>Create Coupon</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Code & Campaign</th>
                  <th className="px-5 py-3">Discount</th>
                  <th className="px-5 py-3">Min Order</th>
                  <th className="px-5 py-3 text-center">Usage</th>
                  <th className="px-5 py-3">Validity</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-muted/30 transition-colors">
                    {/* Code & Description */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs font-bold tracking-wider text-foreground block">
                          {coupon.code}
                        </span>
                        {coupon.description && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {coupon.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Discount Type & Value */}
                    <td className="px-5 py-3.5">
                      {coupon.discountType === DiscountType.PERCENTAGE ? (
                        <div className="flex items-center gap-1.5 font-bold text-primary">
                          <Percent className="h-3.5 w-3.5" />
                          <span>{coupon.discountValue}% Off</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                          <Coins className="h-3.5 w-3.5" />
                          <span>{formatCurrency(coupon.discountValue, 'PKR')} Off</span>
                        </div>
                      )}
                    </td>

                    {/* Min Order Amount */}
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {coupon.minOrderAmount
                        ? formatCurrency(coupon.minOrderAmount, 'PKR')
                        : 'None'}
                    </td>

                    {/* Usage Meter */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="inline-block space-y-1">
                        <span className="font-semibold text-foreground">
                          {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : 'uses'}
                        </span>
                        {coupon.maxUses && (
                          <div className="w-16 bg-muted rounded-full h-1 overflow-hidden mx-auto">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (coupon.usedCount / coupon.maxUses) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Validity Dates */}
                    <td className="px-5 py-3.5 text-muted-foreground text-[11px]">
                      {coupon.expiresAt ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>Exp: {new Date(coupon.expiresAt).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No expiration</span>
                      )}
                    </td>

                    {/* Status Badge & Quick Toggle */}
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        disabled={togglingId === coupon.id}
                        onClick={() => handleToggleActive(coupon.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-transform active:scale-95 ${
                          coupon.computedState === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                            : coupon.computedState === 'EXPIRED'
                            ? 'bg-destructive/10 text-destructive'
                            : coupon.computedState === 'DEPLETED'
                            ? 'bg-amber-500/10 text-amber-700'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                        title="Click to toggle active state"
                      >
                        {togglingId === coupon.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          coupon.computedState
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/coupons/${coupon.id}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Edit coupon"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === coupon.id}
                          onClick={() => handleDelete(coupon)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                          title={coupon.usedCount > 0 ? 'Deactivate coupon (used in orders)' : 'Delete coupon permanently'}
                        >
                          {deletingId === coupon.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

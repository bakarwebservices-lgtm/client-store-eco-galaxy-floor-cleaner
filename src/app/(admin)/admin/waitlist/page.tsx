'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Search,
  Calendar,
  Send,
  Loader2,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { BulkActionBar, BulkActionOption } from '@/components/admin/BulkActionBar';
import { safeFetch } from '@/lib/apiClient';

interface WaitlistSummary {
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string | null;
  variantSku: string | null;
  variantTitle: string | null;
  currentStock: number;
  totalSubscribers: number;
  activeSubscribers: number;
  notificationsSent: number;
}

interface WaitlistSubscription {
  id: string;
  email: string;
  productId: string;
  variantId?: string | null;
  isActive: boolean;
  createdAt: string;
  product: { id: string; name: string; slug: string };
  variant?: { id: string; sku: string; title: string; color?: string | null; size?: string | null; inventoryQty: number } | null;
  customer?: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  notifications: { id: string; sentAt: string }[];
}

export const dynamic = 'force-dynamic';

export default function AdminWaitlistPage() {
  const [summaries, setSummaries] = useState<WaitlistSummary[]>([]);
  const [subscriptions, setSubscriptions] = useState<WaitlistSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'grouped' | 'all'>('grouped');
  const [triggeringKey, setTriggeringKey] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Schedule modal / ETA state
  const [scheduleModalItem, setScheduleModalItem] = useState<WaitlistSummary | null>(null);
  const [expectedDate, setExpectedDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist');
      if (!res.ok) throw new Error('Failed to load waitlist data');
      const data = await res.json();
      setSummaries(data.groupedSummaries || []);
      setSubscriptions(data.subscriptions || []);
      setSelectedIds([]);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error loading waitlist data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTriggerRestock = async (summary: WaitlistSummary) => {
    const key = `${summary.productId}_${summary.variantId || 'base'}`;
    setTriggeringKey(key);
    setNotification(null);

    try {
      const res = await fetch('/api/waitlist/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: summary.productId,
          variantId: summary.variantId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch notifications');

      setNotification({
        type: 'success',
        text: data.message || `Dispatched alerts to ${summary.activeSubscribers} subscribers.`,
      });

      fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setTriggeringKey(null);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalItem || !expectedDate) return;

    setScheduleLoading(true);
    try {
      const res = await fetch('/api/restock-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: scheduleModalItem.productId,
          variantId: scheduleModalItem.variantId || undefined,
          expectedDate,
          notes: scheduleNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule restock');

      setNotification({ type: 'success', text: 'Restock ETA scheduled and logged.' });
      setScheduleModalItem(null);
      fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setScheduleLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (selectedIds.length === subscriptions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(subscriptions.map((s) => s.id));
    }
  };

  const handleExecuteBulkAction = async (actionKey: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);

    try {
      const { ok, error } = await safeFetch('/api/admin/waitlist/bulk', {
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
        setNotification({ type: 'success', text: 'Bulk waitlist action completed successfully.' });
        await fetchData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'Bulk action failed' });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkActions: BulkActionOption[] = [
    { label: 'Mark Resolved', actionKey: 'ACTIVATE', variant: 'success' },
    { label: 'Mark Pending', actionKey: 'DEACTIVATE', variant: 'outline' },
    {
      label: 'Delete Selected',
      actionKey: 'DELETE',
      variant: 'destructive',
      icon: Trash2,
      confirmMessage: `Permanently delete ${selectedIds.length} selected waitlist entries?`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Waitlist & Restock</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track out-of-stock backorder subscriber demand and automate replenishment notifications.
          </p>
        </div>
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

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('grouped')}
            className={`border-b-2 py-2 text-xs font-bold transition-colors ${
              activeTab === 'grouped'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Product Demand Summaries ({summaries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`border-b-2 py-2 text-xs font-bold transition-colors ${
              activeTab === 'all'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            All Subscribers Log ({subscriptions.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Loading waitlist data...</span>
        </div>
      ) : activeTab === 'grouped' ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3 text-center">Stock</th>
                <th className="px-5 py-3 text-center">Subscribers</th>
                <th className="px-5 py-3 text-center">Alerts Dispatched</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    No backorder waitlist subscriptions recorded yet.
                  </td>
                </tr>
              ) : (
                summaries.map((s) => {
                  const key = `${s.productId}_${s.variantId || 'base'}`;
                  const isTriggering = triggeringKey === key;
                  return (
                    <tr key={key} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground">{s.productName}</div>
                        {s.variantTitle && (
                          <div className="text-[11px] text-muted-foreground">
                            Variant: {s.variantTitle} {s.variantSku ? `(${s.variantSku})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center font-semibold text-foreground">
                        {s.currentStock}
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-primary">
                        {s.activeSubscribers} active
                      </td>
                      <td className="px-5 py-3.5 text-center text-muted-foreground font-mono">
                        {s.notificationsSent}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setScheduleModalItem(s);
                              setExpectedDate('');
                              setScheduleNotes('');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Set ETA</span>
                          </button>
                          <button
                            type="button"
                            disabled={isTriggering || s.activeSubscribers === 0}
                            onClick={() => handleTriggerRestock(s)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
                          >
                            {isTriggering ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            <span>Send Alerts</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Individual Subscribers Table */
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={subscriptions.length > 0 && selectedIds.length === subscriptions.length}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all subscribers"
                    className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                  />
                </th>
                <th className="px-5 py-3">Subscriber</th>
                <th className="px-5 py-3">Product / Variant</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3">Signed Up</th>
                <th className="px-5 py-3 text-center">Notifications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subscriptions.map((sub) => {
                const isSelected = selectedIds.includes(sub.id);
                return (
                  <tr
                    key={sub.id}
                    className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(sub.id)}
                        aria-label={`Select waitlist entry ${sub.email}`}
                        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                      />
                    </td>
                    <td className="px-5 py-3.5 font-bold text-foreground">
                      {sub.email}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground">{sub.product.name}</div>
                      {sub.variant && (
                        <div className="text-[10px] text-muted-foreground">SKU: {sub.variant.sku}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          sub.isActive
                            ? 'bg-amber-500/10 text-amber-700'
                            : 'bg-emerald-500/10 text-emerald-700'
                        }`}
                      >
                        {sub.isActive ? 'Active' : 'Notified / Resolved'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-mono text-[11px]">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-center text-muted-foreground">
                      {sub.notifications.length} sent
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-foreground">Schedule Restock ETA</h2>
            <p className="text-xs text-muted-foreground">Item: {scheduleModalItem.productName}</p>

            <form onSubmit={handleSaveSchedule} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Expected Restock Date</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Notes</label>
                <textarea
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs"
                  placeholder="e.g. 50 units arriving from supplier"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalItem(null)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleLoading}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  {scheduleLoading ? 'Saving...' : 'Save ETA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar for All tab */}
      {activeTab === 'all' && (
        <BulkActionBar
          selectedCount={selectedIds.length}
          totalCount={subscriptions.length}
          onClearSelection={() => setSelectedIds([])}
          onSelectAll={() => setSelectedIds(subscriptions.map((s) => s.id))}
          isAllSelected={selectedIds.length === subscriptions.length}
          isLoading={isBulkLoading}
          actions={bulkActions}
          onExecuteAction={handleExecuteBulkAction}
        />
      )}
    </div>
  );
}

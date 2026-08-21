'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Search,
  Calendar,
  Send,
  Loader2,
  ArrowLeft,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

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
          expectedDate: new Date(expectedDate).toISOString(),
          notes: scheduleNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save restock schedule');

      setNotification({ type: 'success', text: 'Expected restock date updated successfully.' });
      setScheduleModalItem(null);
      setExpectedDate('');
      setScheduleNotes('');
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setScheduleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
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
              <h1 className="text-base font-bold leading-tight">Backorder & Restock Waitlist</h1>
              <p className="text-xs text-muted-foreground">Manage waitlist subscribers, restock schedules, and email alerts</p>
            </div>
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

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-1 bg-card rounded-lg border border-border p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('grouped')}
              className={`rounded px-3 py-1 font-semibold transition-colors ${
                activeTab === 'grouped' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Products & Variants ({summaries.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded px-3 py-1 font-semibold transition-colors ${
                activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Individual Subscribers ({subscriptions.length})
            </button>
          </div>
        </div>

        {/* Content Views */}
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Loading waitlist data...</p>
          </div>
        ) : activeTab === 'grouped' ? (
          summaries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center space-y-3">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto" />
              <h2 className="text-sm font-bold text-foreground">No active waitlist requests</h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                When inventory is 0 on a product or variant, customer waitlist signups will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Product & Variant</th>
                    <th className="px-5 py-3 text-center">Active Waitlist</th>
                    <th className="px-5 py-3 text-center">Alerts Dispatched</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summaries.map((s) => {
                    const key = `${s.productId}_${s.variantId || 'base'}`;
                    const isTriggering = triggeringKey === key;
                    const variantText = s.variantTitle || s.variantSku || 'Base Product';

                    return (
                      <tr key={key} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground block">{s.productName}</span>
                            <span className="text-[11px] text-muted-foreground">
                              Variant: <strong className="text-foreground">{variantText}</strong>
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                            {s.activeSubscribers} waiting
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-center text-muted-foreground">
                          {s.notificationsSent} sent
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
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Set ETA</span>
                            </button>

                            <button
                              type="button"
                              disabled={isTriggering || s.activeSubscribers === 0}
                              onClick={() => handleTriggerRestock(s)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
                            >
                              {isTriggering ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              <span>Send Restock Alerts</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Individual Subscribers Table */
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Subscriber</th>
                  <th className="px-5 py-3">Product / Variant</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3">Signed Up</th>
                  <th className="px-5 py-3 text-center">Notification History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-foreground">{sub.email}</div>
                      {sub.customer && (
                        <div className="text-[10px] text-muted-foreground">
                          Account: {`${sub.customer.firstName || ''} ${sub.customer.lastName || ''}`.trim() || sub.customer.email}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground">{sub.product.name}</div>
                      {sub.variant && (
                        <div className="text-[10px] text-muted-foreground">SKU: {sub.variant.sku}</div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {sub.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Active Waitlist
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Notified / Fulfilled
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground text-[11px]">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-3.5 text-center text-muted-foreground text-[11px]">
                      {sub.notifications.length > 0 ? (
                        <span>{sub.notifications.length} notification(s) sent</span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Restock Schedule ETA Modal */}
      {scheduleModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <h2 id="schedule-modal-title" className="text-base font-bold text-foreground">
              Set Expected Restock Date (ETA)
            </h2>
            <p className="text-xs text-muted-foreground">
              For item: <strong className="text-foreground">{scheduleModalItem.productName}</strong>
            </p>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="schedule-date" className="block text-xs font-semibold text-foreground">
                  Expected Replenishment Date *
                </label>
                <input
                  id="schedule-date"
                  type="date"
                  required
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="schedule-notes" className="block text-xs font-semibold text-foreground">
                  Internal Supplier Notes
                </label>
                <textarea
                  id="schedule-notes"
                  rows={3}
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="e.g. Shipment dispatched from workshop..."
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setScheduleModalItem(null)}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50"
                >
                  {scheduleLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save ETA</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

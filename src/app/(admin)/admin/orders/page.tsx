'use client';

import { formatCurrency } from '@/lib/format';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Eye,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  CheckCircle,
  Trash2,
  Truck,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { BulkActionBar, BulkActionOption } from '@/components/admin/BulkActionBar';
import { safeFetch } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PostEx / Courier Sync state
  const [isSyncingPostEx, setIsSyncingPostEx] = useState(false);
  const [rowSyncingId, setRowSyncingId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [showBulkCancelModal, setShowBulkCancelModal] = useState(false);
  const [bulkCancelReason, setBulkCancelReason] = useState('');
  const [bulkCancelRestock, setBulkCancelRestock] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (paymentFilter) params.set('paymentStatus', paymentFilter);
      if (fulfillmentFilter) params.set('fulfillmentStatus', fulfillmentFilter);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load orders');
      }
      const data = await res.json();
      setOrders(data.orders || []);
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.message || 'Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [paymentFilter, fulfillmentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  // Sync PostEx courier tracking (all in-flight or selective)
  const handleSyncPostEx = async (targetOrderIds?: string[]) => {
    setIsSyncingPostEx(true);
    setSyncFeedback(null);
    setError(null);

    try {
      const payload: any = { courierCode: 'POSTEX' };
      if (targetOrderIds && targetOrderIds.length > 0) {
        payload.orderIds = targetOrderIds;
      }

      const res = await fetch('/api/admin/courier/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync PostEx courier statuses.');
      }

      setSyncFeedback({
        type: data.errors > 0 ? 'info' : 'success',
        message: data.message || `Checked ${data.total} shipment(s): ${data.updated} updated.`,
      });

      await fetchOrders();
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Error syncing courier statuses.',
      });
    } finally {
      setIsSyncingPostEx(false);
    }
  };

  // Sync single order shipment
  const handleSyncSingleRow = async (orderId: string) => {
    setRowSyncingId(orderId);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/admin/courier/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [orderId] }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync shipment.');
      }
      setSyncFeedback({
        type: 'success',
        message: data.message || 'Shipment status updated.',
      });
      await fetchOrders();
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Failed to sync order shipment.',
      });
    } finally {
      setRowSyncingId(null);
    }
  };

  // Toggle single item
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle all visible
  const toggleSelectAllVisible = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const handleExecuteBulkAction = async (actionKey: string) => {
    if (selectedIds.length === 0) return;

    if (actionKey === 'SYNC_POSTEX') {
      await handleSyncPostEx(selectedIds);
      return;
    }

    if (actionKey === 'CANCEL') {
      const selectedOrdersList = orders.filter((o) => selectedIds.includes(o.id));
      const hasActiveShipment = selectedOrdersList.some(
        (o) =>
          o.courierCode === 'POSTEX' &&
          o.courierTrackingNumber &&
          !['DELIVERED', 'RETURNED', 'CANCELLED'].includes(o.courierStatus?.toUpperCase() || '')
      );
      setBulkCancelRestock(!hasActiveShipment);
      setBulkCancelReason('');
      setShowBulkCancelModal(true);
      return;
    }

    setIsBulkLoading(true);
    setError(null);

    let payload: any = { ids: selectedIds };

    if (actionKey === 'FULFILL') {
      payload = {
        ids: selectedIds,
        action: 'UPDATE_FULFILLMENT',
        fulfillmentStatus: 'FULFILLED',
        sendNotification,
      };
    } else if (actionKey === 'UNFULFILL') {
      payload = {
        ids: selectedIds,
        action: 'UPDATE_FULFILLMENT',
        fulfillmentStatus: 'UNFULFILLED',
        sendNotification: false,
      };
    } else if (actionKey === 'PAID') {
      payload = {
        ids: selectedIds,
        action: 'UPDATE_PAYMENT',
        paymentStatus: 'PAID',
      };
    } else if (actionKey === 'DELETE') {
      payload = {
        ids: selectedIds,
        action: 'DELETE',
      };
    }

    try {
      const { ok, error: reqErr } = await safeFetch('/api/admin/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!ok) {
        throw new Error(reqErr || 'Failed to perform bulk action');
      }

      await fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Bulk operation failed');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleConfirmBulkCancel = async () => {
    if (selectedIds.length === 0) return;

    setIsBulkLoading(true);
    setError(null);

    try {
      const { ok, error: reqErr } = await safeFetch('/api/admin/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          action: 'CANCEL',
          restockInventory: bulkCancelRestock,
          reason: bulkCancelReason.trim() || undefined,
        }),
      });

      if (!ok) {
        throw new Error(reqErr || 'Failed to cancel selected orders');
      }

      setShowBulkCancelModal(false);
      setBulkCancelReason('');
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Bulk cancellation failed');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkActions: BulkActionOption[] = [
    { label: 'Sync PostEx Status', actionKey: 'SYNC_POSTEX', variant: 'outline', icon: RefreshCw },
    { label: 'Mark Fulfilled', actionKey: 'FULFILL', variant: 'success', icon: CheckCircle },
    { label: 'Mark Unfulfilled', actionKey: 'UNFULFILL', variant: 'outline' },
    { label: 'Mark Paid', actionKey: 'PAID', variant: 'outline' },
    {
      label: 'Cancel Orders',
      actionKey: 'CANCEL',
      variant: 'destructive',
    },
    {
      label: 'Delete',
      actionKey: 'DELETE',
      variant: 'destructive',
      icon: Trash2,
      confirmMessage: `Are you sure you want to permanently delete ${selectedIds.length} selected orders?`,
    },
  ];

  const selectedOrdersList = orders.filter((o) => selectedIds.includes(o.id));
  const hasActiveCourierShipment = selectedOrdersList.some(
    (o) =>
      o.courierCode === 'POSTEX' &&
      o.courierTrackingNumber &&
      !['DELIVERED', 'RETURNED', 'CANCELLED'].includes(o.courierStatus?.toUpperCase() || '')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track, filter, fulfill, and manage store customer orders and courier shipments.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            disabled={isSyncingPostEx || loading}
            onClick={() => handleSyncPostEx()}
            className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Poll PostEx tracking API for all in-flight shipments and sync latest statuses"
          >
            <Truck className="h-3.5 w-3.5" />
            <RefreshCw className={`h-3 w-3 ${isSyncingPostEx ? 'animate-spin' : ''}`} />
            <span>{isSyncingPostEx ? 'Syncing PostEx...' : 'Sync PostEx Status'}</span>
          </button>

          <button
            type="button"
            onClick={fetchOrders}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncFeedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-3.5 text-xs border animate-in fade-in ${
            syncFeedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : syncFeedback.type === 'error'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{syncFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncFeedback(null)}
            className="text-xs font-bold hover:underline ml-3"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer name, email..."
            className="w-full rounded-lg border border-input bg-card pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
          >
            <option value="">All Payment Statuses</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PAID">PAID</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          <select
            value={fulfillmentFilter}
            onChange={(e) => setFulfillmentFilter(e.target.value)}
            className="rounded-lg border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
          >
            <option value="">All Fulfillment Statuses</option>
            <option value="UNFULFILLED">UNFULFILLED</option>
            <option value="FULFILLED">FULFILLED</option>
            <option value="RETURNED">RETURNED</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedIds.length === orders.length}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible orders"
                    className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                  />
                </th>
                <th className="p-3.5 font-bold">Order #</th>
                <th className="p-3.5 font-bold">Date</th>
                <th className="p-3.5 font-bold">Customer</th>
                <th className="p-3.5 font-bold">Courier / Tracking</th>
                <th className="p-3.5 font-bold">Payment</th>
                <th className="p-3.5 font-bold">Fulfillment</th>
                <th className="p-3.5 font-bold text-right">Items</th>
                <th className="p-3.5 font-bold text-right">Total</th>
                <th className="p-3.5 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-muted-foreground">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((order) => {
                  const isSelected = selectedIds.includes(order.id);
                  const isCancelled = Boolean(order.cancelledAt);
                  const shipment = order.shipments?.[0];
                  const isSyncingThisRow = rowSyncingId === order.id;

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(order.id)}
                          aria-label={`Select order ${order.orderNumber}`}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                        />
                      </td>
                      <td className="p-3.5 font-mono font-bold text-foreground">
                        <Link href={`/admin/orders/${order.id}`} className="hover:text-primary hover:underline">
                          {order.orderNumber}
                        </Link>
                        {isCancelled && (
                          <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                            CANCELLED
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-foreground">
                          {order.customer?.firstName} {order.customer?.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{order.customer?.email}</p>
                      </td>

                      {/* Courier / Tracking Status */}
                      <td className="p-3.5">
                        {shipment ? (
                          (() => {
                            const isDelivered = shipment.status === 'DELIVERED';
                            const isFailed = ['FAILED_ATTEMPT', 'RETURNED_TO_ORIGIN', 'CANCELLED'].includes(shipment.status);
                            const isInTransit = ['IN_TRANSIT', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(shipment.status);

                            return (
                              <div className="space-y-1 min-w-[140px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-foreground text-[11px]">
                                    {shipment.courierCode}
                                  </span>
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                      isDelivered
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : isInTransit
                                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                        : isFailed
                                        ? 'bg-destructive/10 text-destructive'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    }`}
                                  >
                                    {shipment.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                                  <span>{shipment.trackingNumber}</span>
                                  {shipment.trackingUrl && (
                                    <a
                                      href={shipment.trackingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline inline-flex items-center"
                                      title="Open courier tracking link"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleSyncSingleRow(order.id)}
                                    disabled={isSyncingThisRow || isSyncingPostEx}
                                    title="Sync live status from courier"
                                    className="ml-1 text-muted-foreground hover:text-primary transition-colors p-0.5 rounded hover:bg-muted"
                                  >
                                    <RefreshCw className={`h-3 w-3 ${isSyncingThisRow ? 'animate-spin text-primary' : ''}`} />
                                  </button>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Unbooked
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-success/10 text-success'
                              : order.paymentStatus === 'REFUNDED'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            order.fulfillmentStatus === 'FULFILLED'
                              ? 'bg-success/10 text-success'
                              : order.fulfillmentStatus === 'RETURNED'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {order.fulfillmentStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-medium text-muted-foreground">
                        {order.items?.length || 0}
                      </td>
                      <td className="p-3.5 text-right font-bold text-foreground">
                        {formatCurrency(order.totalPrice, order.currency)}
                      </td>
                      <td className="p-3.5 text-center">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-12 text-center space-y-2">
                    <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">No orders found</p>
                    <p className="text-xs text-muted-foreground">Customer orders will appear here once placed.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={orders.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={() => setSelectedIds(orders.map((o) => o.id))}
        isAllSelected={selectedIds.length === orders.length}
        isLoading={isBulkLoading}
        actions={bulkActions}
        onExecuteAction={handleExecuteBulkAction}
        extraControls={
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none mr-2">
            <input
              type="checkbox"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
            />
            <span>Email customer on fulfill</span>
          </label>
        }
      />

      {/* Bulk Cancel Modal */}
      {showBulkCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive shrink-0">
                <XCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-lg font-bold text-foreground">
                  Cancel {selectedIds.length} Selected Orders
                </h3>
                <p className="text-xs text-muted-foreground">
                  This will mark all selected eligible orders as cancelled. Items can optionally be returned to inventory with automatic double-restock protection.
                </p>
              </div>
            </div>

            {hasActiveCourierShipment && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1 text-amber-800 dark:text-amber-200">
                  <p className="font-bold">Active Courier Shipments Detected</p>
                  <p className="leading-relaxed">
                    One or more selected orders have active in-flight shipments with PostEx. Restocking now may create phantom stock before parcels are physically returned to the warehouse.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">
                Cancellation Reason / Audit Ledger Memo
              </label>
              <textarea
                value={bulkCancelReason}
                onChange={(e) => setBulkCancelReason(e.target.value)}
                placeholder="e.g., Bulk customer request, out of stock, batch duplicate, etc."
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none transition-colors"
              />
              <p className="text-[11px] text-muted-foreground">
                This reason will be stamped with a timestamp into the audit notes ledger of each cancelled order.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bulkCancelRestock}
                  onChange={(e) => setBulkCancelRestock(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block">
                    Restock items into inventory
                  </span>
                  <span className="text-[11px] text-muted-foreground block leading-relaxed">
                    Safely increments available quantities for variants in catalog. Built-in idempotency ensures already cancelled or returned orders will not be double-restocked.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowBulkCancelModal(false)}
                disabled={isBulkLoading}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors disabled:opacity-50"
              >
                Keep Orders
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkCancel}
                disabled={isBulkLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-destructive hover:bg-destructive/90 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                {isBulkLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Bulk Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

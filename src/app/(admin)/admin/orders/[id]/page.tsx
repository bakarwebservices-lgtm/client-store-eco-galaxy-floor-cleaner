'use client';
import { formatCurrency } from '@/lib/format';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, AlertTriangle, Truck, User, MapPin, Package, Clock, ShieldCheck, RotateCcw, XCircle, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [fulfillmentStatus, setFulfillmentStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Return Dialog state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('Customer Return');
  const [restockInventory, setRestockInventory] = useState(true);
  const [refundPayment, setRefundPayment] = useState(true);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (!res.ok) throw new Error('Order not found');
      const data = await res.json();
      setOrder(data.order);
      setPaymentStatus(data.order.paymentStatus);
      setFulfillmentStatus(data.order.fulfillmentStatus);
      setNotes(data.order.notes || '');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleSaveChanges = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus, fulfillmentStatus, notes }),
      });
      if (!res.ok) throw new Error('Failed to update order');
      setMsg({ type: 'success', text: 'Order details updated successfully.' });
      await fetchOrder();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Pre-fulfillment Cancellation
  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order? Since this order has not been fulfilled, all items will be automatically restocked back to inventory.')) {
      return;
    }

    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order');
      setMsg({ type: 'success', text: 'Order cancelled and stock inventory reversed back to catalog.' });
      await fetchOrder();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Post-fulfillment Return
  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: returnReason,
          restockInventory,
          refundPayment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process return');
      setMsg({ type: 'success', text: data.message });
      setShowReturnModal(false);
      await fetchOrder();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-muted-foreground">Loading order #{id}...</div>;
  }

  if (!order) {
    return <div className="p-12 text-center text-xs text-destructive">Order not found.</div>;
  }

  const shippingAddr: any = order.shippingAddress;
  const isCancelled = Boolean(order.cancelledAt);
  const isFulfilled = order.fulfillmentStatus === 'FULFILLED';
  const isReturned = order.fulfillmentStatus === 'RETURNED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
                {order.orderNumber}
              </h1>
              {isCancelled && (
                <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                  CANCELLED ON {new Date(order.cancelledAt).toLocaleDateString()}
                </span>
              )}
              {isReturned && (
                <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                  RETURNED (RMA)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons: Cancel vs Process Return */}
        <div className="flex gap-2">
          {!isCancelled && !isReturned && (
            isFulfilled ? (
              <button
                type="button"
                onClick={() => setShowReturnModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 text-warning" />
                <span>Process Return (RMA)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>{actionLoading ? 'Cancelling...' : 'Cancel Order (Pre-Dispatch)'}</span>
              </button>
            )
          )}
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium ${
            msg.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Return Dialog / Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-bold text-foreground">Process Return for Order {order.orderNumber}</h3>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={handleProcessReturn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">Return Reason</label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Defective item, incorrect size, customer remorse..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restockInventory}
                    onChange={(e) => setRestockInventory(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Restock physical inventory back to ProductVariant stock</span>
                </label>
                <p className="text-[11px] text-muted-foreground pl-6">
                  Uncheck if item is damaged/unsellable and cannot be returned to shelf stock.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundPayment}
                    onChange={(e) => setRefundPayment(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Mark payment status as REFUNDED</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 8 Cols: Order Items & Status Manager */}
        <div className="lg:col-span-8 space-y-6">
          {/* Status Controls */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Order Status Controls
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted-foreground">Payment Status</label>
                <select
                  disabled={isCancelled}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
                >
                  <option value="UNPAID">UNPAID (Pending)</option>
                  <option value="PAID">PAID (Captured)</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted-foreground">Fulfillment Status</label>
                <select
                  disabled={isCancelled}
                  value={fulfillmentStatus}
                  onChange={(e) => setFulfillmentStatus(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
                >
                  <option value="UNFULFILLED">UNFULFILLED (Processing)</option>
                  <option value="FULFILLED">FULFILLED (Dispatched)</option>
                  <option value="RETURNED">RETURNED</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-[11px] font-semibold text-muted-foreground">Internal Notes & Audit Log</label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Customer request notes, courier tracking number, return inspection notes..."
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none font-mono text-[11px]"
              />
            </div>

            {!isCancelled && (
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save Order Status'}
              </button>
            )}
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Package className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Purchased Items ({order.items?.length || 0})
              </h2>
            </div>

            <div className="space-y-3 divide-y divide-border">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-3 pt-3 first:pt-0">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.productTitle}</p>
                    {item.variantTitle && (
                      <p className="text-[11px] text-muted-foreground">Option: {item.variantTitle}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground font-mono">SKU: {item.sku}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatCurrency(item.unitPrice, order.currency)} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {formatCurrency(item.totalPrice, order.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount ({order.couponCode || 'Promo'})</span>
                  <span>- {formatCurrency(order.discountAmount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping ({order.shippingAmount === 0 ? 'Free' : 'Standard'})</span>
                <span className="font-medium text-foreground">{formatCurrency(order.shippingAmount, order.currency)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
                <span>Total</span>
                <span className="text-base font-extrabold text-primary">
                  {formatCurrency(order.totalPrice, order.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Customer & Shipping Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <User className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Customer Profile</h2>
            </div>

            <div className="space-y-1.5 text-xs text-foreground">
              <p className="font-bold">
                {order.customer?.firstName} {order.customer?.lastName}
              </p>
              <p className="text-muted-foreground">{order.customer?.email}</p>
              {order.customer?.phone && <p className="text-muted-foreground">{order.customer?.phone}</p>}
            </div>

            {order.guestOrderPossiblyLinked && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-[11px] text-warning">
                Guest checkout matched an existing customer account.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Delivery Address</h2>
            </div>

            <div className="space-y-1.5 text-xs text-foreground">
              <p className="font-bold">{shippingAddr?.name}</p>
              <p className="text-muted-foreground">{shippingAddr?.address}</p>
              {shippingAddr?.apartment && <p className="text-muted-foreground">{shippingAddr?.apartment}</p>}
              <p className="text-muted-foreground">
                {shippingAddr?.city}, {shippingAddr?.province || ''} {shippingAddr?.postalCode || ''}
              </p>
              <p className="text-muted-foreground">{shippingAddr?.country}</p>
              <p className="text-muted-foreground font-semibold pt-1">Phone: {shippingAddr?.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

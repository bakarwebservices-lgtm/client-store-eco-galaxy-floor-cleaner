'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  AlertTriangle,
  Truck,
  User,
  MapPin,
  Package,
  Clock,
  ShieldCheck,
  RotateCcw,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  Printer,
  RefreshCw,
  Send,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { safeFetch } from '@/lib/apiClient';

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

  // Courier Dispatch Modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [courierAccounts, setCourierAccounts] = useState<any[]>([]);
  const [availableCouriers, setAvailableCouriers] = useState<any[]>([]);
  const [selectedCourier, setSelectedCourier] = useState('POSTEX');
  const [selectedCourierAccount, setSelectedCourierAccount] = useState<string>('');
  const [pickupAddressCode, setPickupAddressCode] = useState('');
  const [codAmount, setCodAmount] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(0.5);
  const [pieces, setPieces] = useState<number>(1);
  const [courierNotes, setCourierNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [syncingTracking, setSyncingTracking] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [showEventsTimeline, setShowEventsTimeline] = useState(false);

  const returnModalRef = useRef<HTMLDivElement>(null);
  const dispatchModalRef = useRef<HTMLDivElement>(null);

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

  const fetchCourierAccounts = async () => {
    try {
      const { ok, data } = await safeFetch<any>('/api/admin/couriers');
      if (ok && data) {
        setCourierAccounts(data.accounts || []);
        setAvailableCouriers(data.availableCouriers || []);
        const defaultAcc = data.accounts?.find((a: any) => a.isDefault);
        if (defaultAcc) {
          setSelectedCourier(defaultAcc.courierCode);
          setSelectedCourierAccount(defaultAcc.id);
        } else if (data.accounts?.length > 0) {
          setSelectedCourier(data.accounts[0].courierCode);
          setSelectedCourierAccount(data.accounts[0].id);
        }
      }
    } catch {
      // Non-blocking fallback
    }
  };

  useEffect(() => {
    fetchOrder();
    fetchCourierAccounts();
  }, [id]);

  // Modal Focus trap & Escape listener (BUILD_STANDARDS 4.6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowReturnModal(false);
        setShowDispatchModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenDispatchModal = () => {
    if (!order) return;

    // Calculate auto-summed weight from OrderItem.weightKg snapshots
    const itemWeightSum = order.items?.reduce((sum: number, item: any) => {
      const itemWeight = item.weightKg || 0.5;
      return sum + itemWeight * (item.quantity || 1);
    }, 0);
    const resolvedWeight = itemWeightSum > 0 ? Number(itemWeightSum.toFixed(2)) : 0.5;

    // COD calculation: If already PAID, strictly 0; otherwise pre-fill order.totalPrice
    const isPaid = order.paymentStatus === 'PAID';
    setCodAmount(isPaid ? 0 : order.totalPrice);
    setWeightKg(resolvedWeight);
    setPieces(1);
    setCourierNotes(order.notes || '');
    setShowDispatchModal(true);
  };

  const handleBookShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    setMsg(null);

    try {
      const payload = {
        courierCode: selectedCourier,
        courierAccountId: selectedCourierAccount || undefined,
        pickupAddressCode: pickupAddressCode.trim() || undefined,
        customCodAmount: codAmount,
        weightKg,
        pieces,
        orderNotes: courierNotes.trim() || undefined,
      };

      const res = await fetch(`/api/admin/orders/${id}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book courier shipment.');

      setMsg({
        type: 'success',
        text: `Consignment booked successfully with ${selectedCourier}! Tracking #: ${data.trackingNumber}`,
      });
      setShowDispatchModal(false);
      await fetchOrder();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelShipment = async () => {
    if (!confirm('Are you sure you want to cancel this courier booking? This will cancel the consignment with the courier.')) {
      return;
    }

    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}/shipment`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel shipment booking.');

      setMsg({ type: 'success', text: 'Shipment booking cancelled successfully.' });
      await fetchOrder();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncTracking = async () => {
    setSyncingTracking(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}/shipment/sync`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync tracking.');

      setMsg({ type: 'success', text: `Tracking updated (${data.eventsAdded} new event records synchronized).` });
      await fetchOrder();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSyncingTracking(false);
    }
  };

  const handleCopyTracking = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

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

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order? This will release reserved inventory back to stock.')) {
      return;
    }
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel order');
      }
      setMsg({ type: 'success', text: 'Order has been cancelled and stock returned.' });
      await fetchOrder();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process return');
      }

      setMsg({ type: 'success', text: 'RMA Return processed successfully.' });
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

  // Active shipment (non-cancelled)
  const activeShipment = order.shipments?.find(
    (s: any) => s.status !== 'CANCELLED' && s.status !== 'RETURNED_TO_ORIGIN'
  ) || order.shipments?.[0];

  const hasActiveBooking = Boolean(activeShipment && activeShipment.status !== 'CANCELLED');

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

      {/* Main Grid: Left 8 Cols (Order Details) + Right 4 Cols (Logistics & Customer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Financials, Items, Internal Status */}
        <div className="lg:col-span-8 space-y-6">
          {/* Order Status & Financial Control */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Order Status & Payment
                </h2>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                Payment: <strong className="text-foreground">{order.paymentMethod}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted-foreground">Payment Status</label>
                <select
                  disabled={isCancelled}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none font-medium"
                >
                  <option value="UNPAID">UNPAID (Pending COD / Gateway)</option>
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
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none font-medium"
                >
                  <option value="UNFULFILLED">UNFULFILLED (Processing / Awaiting Dispatch)</option>
                  <option value="FULFILLED">FULFILLED (Dispatched / Picked Up)</option>
                  <option value="RETURNED">RETURNED (RTO)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-[11px] font-semibold text-muted-foreground">Internal Notes & Audit Log</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Customer request notes, courier special instructions, return inspection notes..."
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none font-mono text-[11px]"
              />
            </div>

            {!isCancelled && (
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving Changes...' : 'Save Status Changes'}
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
                    <p className="text-[11px] text-muted-foreground font-mono">
                      SKU: {item.sku} {item.weightKg ? `• Weight: ${item.weightKg} kg/ea` : ''}
                    </p>
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

        {/* Right 4 Cols: Logistics Dispatch & Customer / Shipping Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Logistics & Shipment Card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Logistics & Shipping</h2>
              </div>
              {hasActiveBooking && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    activeShipment.status === 'DELIVERED'
                      ? 'bg-success/10 text-success'
                      : activeShipment.status === 'RETURNED_TO_ORIGIN'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {activeShipment.status}
                </span>
              )}
            </div>

            {!hasActiveBooking ? (
              <div className="space-y-3 py-2 text-center">
                <p className="text-xs text-muted-foreground">
                  Order is currently awaiting logistics consignment booking.
                </p>
                {!isCancelled && !isReturned && (
                  <button
                    type="button"
                    onClick={handleOpenDispatchModal}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 px-4 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Book Courier Dispatch</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Consignment Overview */}
                <div className="rounded-lg bg-muted/40 p-3 space-y-2 border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">{activeShipment.courierName}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {activeShipment.isCod ? `COD: ${formatCurrency(activeShipment.codAmount, activeShipment.currency)}` : 'Prepaid'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-card p-2 rounded border border-border">
                    <span className="text-xs font-mono font-bold text-foreground">
                      {activeShipment.trackingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyTracking(activeShipment.trackingNumber)}
                      className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                      title="Copy Tracking #"
                    >
                      {copiedTracking ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {activeShipment.weightKg && (
                    <div className="text-[10px] text-muted-foreground flex justify-between">
                      <span>Weight: {activeShipment.weightKg} kg ({activeShipment.pieces} pcs)</span>
                      <span>Booked: {new Date(activeShipment.bookedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Logistics Action Buttons */}
                <div className="flex flex-col gap-2">
                  {activeShipment.trackingNumber && (
                    <a
                      href={`/api/admin/orders/${order.id}/shipment/label`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print Airway Bill (Label)</span>
                    </a>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSyncTracking}
                      disabled={syncingTracking}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncingTracking ? 'animate-spin text-primary' : ''}`} />
                      <span>{syncingTracking ? 'Syncing...' : 'Sync Tracking'}</span>
                    </button>

                    {activeShipment.status !== 'DELIVERED' && activeShipment.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={handleCancelShipment}
                        disabled={actionLoading}
                        className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/15 transition-colors disabled:opacity-50"
                        title="Cancel Booking"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Tracking Events Timeline Accordion */}
                {activeShipment.events?.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowEventsTimeline(!showEventsTimeline)}
                      className="w-full flex items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <span>Journey Timeline ({activeShipment.events.length} events)</span>
                      {showEventsTimeline ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {showEventsTimeline && (
                      <div className="space-y-2 pt-1">
                        {activeShipment.events.map((evt: any) => (
                          <div key={evt.id} className="text-[11px] pl-3 border-l-2 border-primary/40 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{evt.status}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {new Date(evt.eventTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-[10px]">{evt.description}</p>
                            {evt.location && <p className="text-[10px] font-medium text-primary">{evt.location}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer Profile Card */}
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
              {order.customer?.phone && <p className="text-muted-foreground font-mono">{order.customer?.phone}</p>}
            </div>

            {order.guestOrderPossiblyLinked && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-[11px] text-warning">
                Guest checkout matched an existing customer account.
              </div>
            )}
          </div>

          {/* Delivery Address Card */}
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
              <p className="text-muted-foreground font-semibold pt-1 font-mono">Phone: {shippingAddr?.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Courier Dispatch Booking Dialog / Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            ref={dispatchModalRef}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Book Courier Consignment</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookShipment} className="space-y-4">
              {/* Courier Selector */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Select Courier Provider <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedCourier}
                  onChange={(e) => {
                    setSelectedCourier(e.target.value);
                    const matchingAcc = courierAccounts.find((a) => a.courierCode === e.target.value);
                    setSelectedCourierAccount(matchingAcc?.id || '');
                  }}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  {availableCouriers.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Selector if multiple accounts exist */}
              {courierAccounts.filter((a) => a.courierCode === selectedCourier).length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Merchant Courier Account
                  </label>
                  <select
                    value={selectedCourierAccount}
                    onChange={(e) => setSelectedCourierAccount(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
                  >
                    {courierAccounts
                      .filter((a) => a.courierCode === selectedCourier)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountTitle} ({acc.maskedIdentifier})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* COD Amount Configuration */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    Cash on Delivery (COD) Amount ({order.currency})
                  </label>
                  {order.paymentStatus === 'PAID' ? (
                    <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded">
                      Prepaid Order — COD Zeroed
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Order Total: {formatCurrency(order.totalPrice, order.currency)}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={order.paymentStatus === 'PAID'}
                  value={codAmount}
                  onChange={(e) => setCodAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>

              {/* Weight and Pieces Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Billable Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.05"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">Auto-summed from order items</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Total Packages / Pieces
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={pieces}
                    onChange={(e) => setPieces(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Special Remarks */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Courier Special Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={courierNotes}
                  onChange={(e) => setCourierNotes(e.target.value)}
                  placeholder="e.g. Call before delivery, handle with care..."
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50"
                >
                  {bookingLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{bookingLoading ? 'Booking with Courier...' : 'Confirm & Dispatch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Dialog / Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            ref={returnModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rma-dialog-title"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-warning" />
                <h3 id="rma-dialog-title" className="text-sm font-bold text-foreground">
                  Process Return & RMA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessReturn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Reason for Return
                </label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Size exchange, damaged in transit, customer changed mind"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restockInventory}
                    onChange={(e) => setRestockInventory(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <span>Restock inventory quantities for returned items</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundPayment}
                    onChange={(e) => setRefundPayment(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <span>Mark payment status as REFUNDED</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-warning px-4 py-2 text-xs font-bold text-warning-foreground shadow hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{actionLoading ? 'Processing...' : 'Confirm Return'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

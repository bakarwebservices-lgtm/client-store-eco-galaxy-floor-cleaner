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
  Edit3,
  Plus,
  Trash2,
  MessageCircle,
  Search,
  CheckCircle2,
  DollarSign,
  Tag,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { safeFetch } from '@/lib/apiClient';
import { TrackingStepper, type TrackingShipmentData } from '@/components/storefront/TrackingStepper';

export const dynamic = 'force-dynamic';

function getWhatsAppUrl(phone?: string, recipientName?: string, orderNumber?: string) {
  if (!phone) return null;
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('03')) {
    clean = '92' + clean.slice(1);
  }
  const greeting = recipientName ? `Hello ${recipientName}, ` : 'Hello, ';
  const context = orderNumber ? `this is regarding your order ${orderNumber}.` : 'contacting you regarding your store order.';
  return `https://wa.me/${clean}?text=${encodeURIComponent(greeting + context)}`;
}

interface DraftItem {
  id?: string;
  productId: string;
  variantId?: string | null;
  productTitle: string;
  variantTitle?: string | null;
  sku?: string;
  quantity: number;
  unitPrice: number;
  _delete?: boolean;
  availableVariants?: Array<{
    id: string;
    title: string;
    sku: string;
    price: number;
    inventoryQty: number;
  }>;
}

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
  const [orderType, setOrderType] = useState<string>('Normal');
  const [pickupAddressCode, setPickupAddressCode] = useState('001');
  const [codAmount, setCodAmount] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(0.5);
  const [pieces, setPieces] = useState<number>(1);
  const [courierNotes, setCourierNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [syncingTracking, setSyncingTracking] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Edit Shipping Address Modal state
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [draftAddress, setDraftAddress] = useState({
    name: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Pakistan',
  });

  // Edit Line Items & Pricing Modal state
  const [showEditItemsModal, setShowEditItemsModal] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [draftDiscount, setDraftDiscount] = useState<number>(0);
  const [draftShipping, setDraftShipping] = useState<number>(0);

  // Add Item Search state
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<any | null>(null);
  const [selectedVariantIdToAdd, setSelectedVariantIdToAdd] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [addUnitPrice, setAddUnitPrice] = useState<number>(0);

  // Fulfill Order Modal state
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [sendEmailOnFulfill, setSendEmailOnFulfill] = useState(true);

  const returnModalRef = useRef<HTMLDivElement>(null);
  const dispatchModalRef = useRef<HTMLDivElement>(null);
  const editAddressModalRef = useRef<HTMLDivElement>(null);
  const editItemsModalRef = useRef<HTMLDivElement>(null);
  const fulfillModalRef = useRef<HTMLDivElement>(null);

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

      const addr = data.order.shippingAddress || {};
      setDraftAddress({
        name: addr.name || `${addr.firstName || ''} ${addr.lastName || ''}`.trim(),
        phone: addr.phone || data.order.customer?.phone || '',
        address: addr.address || addr.addressLine1 || '',
        apartment: addr.apartment || addr.addressLine2 || '',
        city: addr.city || '',
        province: addr.province || '',
        postalCode: addr.postalCode || '',
        country: addr.country || 'Pakistan',
      });
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

  // Modal Focus trap & Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowReturnModal(false);
        setShowDispatchModal(false);
        setShowEditAddressModal(false);
        setShowEditItemsModal(false);
        setShowFulfillModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenDispatchModal = () => {
    if (!order) return;

    const itemWeightSum = order.items?.reduce((sum: number, item: any) => {
      const itemWeight = item.weightKg || 0.5;
      return sum + itemWeight * (item.quantity || 1);
    }, 0);
    const resolvedWeight = itemWeightSum > 0 ? Number(itemWeightSum.toFixed(2)) : 0.5;

    const isPaid = order.paymentStatus === 'PAID';
    setCodAmount(isPaid ? 0 : order.totalPrice);
    setWeightKg(resolvedWeight);
    setPieces(1);
    setOrderType('Normal');
    setPickupAddressCode('001');
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
        pickupAddressCode,
        orderType,
        customCodAmount: codAmount,
        weightKg,
        pieces,
        orderNotes: courierNotes,
      };

      const res = await fetch(`/api/admin/orders/${id}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch shipment with courier');
      }

      setMsg({
        type: 'success',
        text: `Consignment booked successfully! Tracking #: ${data.trackingNumber} (${data.status})`,
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
      if (!res.ok) throw new Error(data.error || 'Failed to cancel courier shipment.');

      setMsg({ type: 'success', text: 'Consignment booking has been cancelled.' });
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

      setMsg({ type: 'success', text: `Tracking refreshed (${data.eventsAdded} new tracking events synchronized).` });
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

  const handleSaveStatus = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus, fulfillmentStatus, notes }),
      });
      if (!res.ok) throw new Error('Failed to update order status');
      setMsg({ type: 'success', text: 'Order status updated successfully.' });
      await fetchOrder();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Items Modal
  const handleOpenEditItems = () => {
    if (!order) return;
    const itemsList: DraftItem[] = (order.items || []).map((it: any) => ({
      id: it.id,
      productId: it.productId,
      variantId: it.variantId,
      productTitle: it.productTitle,
      variantTitle: it.variantTitle,
      sku: it.sku,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      _delete: false,
      availableVariants: it.product?.variants || [],
    }));
    setDraftItems(itemsList);
    setDraftDiscount(order.discountAmount || 0);
    setDraftShipping(order.shippingAmount || 0);
    setSelectedProductToAdd(null);
    setProductSearchQuery('');
    setSearchResults([]);
    setShowEditItemsModal(true);
  };

  // Search products for adding to order
  const handleSearchProducts = async (q: string) => {
    setProductSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/available-products?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.products || []);
      }
    } catch {
      // Ignore
    } finally {
      setSearchingProducts(false);
    }
  };

  const handleSelectProductToAdd = (prod: any) => {
    setSelectedProductToAdd(prod);
    if (prod.variants && prod.variants.length > 0) {
      setSelectedVariantIdToAdd(prod.variants[0].id);
      setAddUnitPrice(prod.variants[0].price || prod.basePrice);
    } else {
      setSelectedVariantIdToAdd('');
      setAddUnitPrice(prod.basePrice);
    }
    setAddQuantity(1);
    setSearchResults([]);
    setProductSearchQuery('');
  };

  const handleAddItemToDraft = () => {
    if (!selectedProductToAdd) return;
    const selectedVariant = selectedProductToAdd.variants?.find((v: any) => v.id === selectedVariantIdToAdd);

    const newItem: DraftItem = {
      productId: selectedProductToAdd.id,
      variantId: selectedVariantIdToAdd || null,
      productTitle: selectedProductToAdd.title,
      variantTitle: selectedVariant?.title || null,
      sku: selectedVariant?.sku || selectedProductToAdd.sku || 'SKU',
      quantity: addQuantity,
      unitPrice: addUnitPrice,
      _delete: false,
      availableVariants: selectedProductToAdd.variants || [],
    };

    setDraftItems([...draftItems, newItem]);
    setSelectedProductToAdd(null);
    setSelectedVariantIdToAdd('');
    setAddQuantity(1);
  };

  const handleSaveItems = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        items: draftItems.map((it) => ({
          id: it.id,
          productId: it.productId,
          variantId: it.variantId,
          productTitle: it.productTitle,
          variantTitle: it.variantTitle,
          sku: it.sku,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          _delete: it._delete,
        })),
        discountAmount: draftDiscount,
        shippingAmount: draftShipping,
      };

      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update line items');

      setMsg({ type: 'success', text: 'Order items, quantities, and pricing updated successfully.' });
      setShowEditItemsModal(false);
      await fetchOrder();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingAddress: draftAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update shipping address');

      setMsg({ type: 'success', text: 'Shipping address updated successfully.' });
      setShowEditAddressModal(false);
      await fetchOrder();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleFulfillOrderDirect = async () => {
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillmentStatus: 'FULFILLED',
          sendNotificationEmail: sendEmailOnFulfill,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fulfill order');

      setMsg({
        type: 'success',
        text: `Order marked as FULFILLED! ${sendEmailOnFulfill ? 'Customer notification email dispatched.' : ''}`,
      });
      setShowFulfillModal(false);
      await fetchOrder();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
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

  const activeShipment = order.shipments?.find(
    (s: any) => s.status !== 'CANCELLED' && s.status !== 'RETURNED_TO_ORIGIN'
  ) || order.shipments?.[0];

  const hasActiveBooking = Boolean(activeShipment && activeShipment.status !== 'CANCELLED');

  // Check if there is a COD price mismatch between order and active consignment
  const hasCodMismatch =
    hasActiveBooking &&
    activeShipment.isCod &&
    Math.abs((activeShipment.codAmount || 0) - order.totalPrice) > 0.01;

  // Build stepper data if active shipment exists
  const stepperData: TrackingShipmentData | null = activeShipment
    ? {
        trackingNumber: activeShipment.trackingNumber,
        courierName: activeShipment.courierName || 'PostEx Courier',
        courierCode: activeShipment.courierCode || 'POSTEX',
        status: activeShipment.status,
        rawStatus: activeShipment.rawCourierStatus,
        isCod: activeShipment.isCod,
        codAmount: activeShipment.codAmount,
        currency: activeShipment.currency || order.currency,
        bookedAt: activeShipment.bookedAt,
        deliveredAt: activeShipment.deliveredAt,
        trackingUrl: activeShipment.trackingUrl,
        recipient: {
          name: shippingAddr?.name,
          city: shippingAddr?.city,
          country: shippingAddr?.country,
        },
        events: activeShipment.events?.map((e: any) => ({
          id: e.id,
          status: e.status,
          rawStatus: e.rawStatus,
          description: e.description,
          location: e.location,
          eventTime: e.eventTime,
        })),
      }
    : null;

  // WhatsApp quick links
  const customerWhatsApp = getWhatsAppUrl(order.customer?.phone, order.customer?.firstName, order.orderNumber);
  const shippingWhatsApp = getWhatsAppUrl(shippingAddr?.phone, shippingAddr?.name, order.orderNumber);

  // Draft calculation in modal
  const activeDraftItems = draftItems.filter((it) => !it._delete);
  const draftSubtotal = activeDraftItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const draftTotal = Math.max(0, draftSubtotal - draftDiscount + draftShipping + (order.taxAmount || 0));

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
                {order.orderNumber}
              </h1>
              {/* Payment Status Badge */}
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-success/15 text-success'
                    : order.paymentStatus === 'REFUNDED'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-warning/15 text-warning'
                }`}
              >
                Payment: {order.paymentStatus}
              </span>

              {/* Fulfillment Status Badge */}
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  order.fulfillmentStatus === 'FULFILLED'
                    ? 'bg-success/15 text-success'
                    : order.fulfillmentStatus === 'RETURNED'
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-primary/15 text-primary'
                }`}
              >
                Fulfillment: {order.fulfillmentStatus}
              </span>

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
            <p className="text-xs text-muted-foreground mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleString()} • Currency: {order.currency}
            </p>
          </div>
        </div>

        {/* Action Buttons: Fulfill / Return / Cancel */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isCancelled && !isReturned && (
            <>
              {!isFulfilled && (
                <button
                  type="button"
                  onClick={() => setShowFulfillModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Fulfill Order</span>
                </button>
              )}

              {isFulfilled ? (
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
                  <span>{actionLoading ? 'Cancelling...' : 'Cancel Order'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* COD Discrepancy Warning Banner */}
      {hasCodMismatch && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">PostEx Courier COD Amount Discrepancy</p>
            <p>
              The active PostEx consignment is booked with COD amount{' '}
              <strong>{formatCurrency(activeShipment.codAmount, activeShipment.currency)}</strong>, but the current order
              total is <strong>{formatCurrency(order.totalPrice, order.currency)}</strong>. If you modified items or pricing, please cancel the consignment and re-book with courier so the correct payment is collected.
            </p>
          </div>
        </div>
      )}

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
        {/* Left 8 Cols: Status Controls & Purchased Line Items */}
        <div className="lg:col-span-8 space-y-6">
          {/* Order Status & Internal Controls */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Order Status Management
                </h2>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                Payment Method: <strong className="text-foreground">{order.paymentMethod}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Payment Status (Financial)
                </label>
                <select
                  disabled={isCancelled}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none font-medium"
                >
                  <option value="UNPAID">UNPAID (Pending Cash on Delivery / Transfer)</option>
                  <option value="PAID">PAID (Captured / Remitted)</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Independent from fulfillment. Indicates whether funds have been collected.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Fulfillment Status (Logistics)
                </label>
                <select
                  disabled={isCancelled}
                  value={fulfillmentStatus}
                  onChange={(e) => setFulfillmentStatus(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none font-medium"
                >
                  <option value="UNFULFILLED">UNFULFILLED (Processing / In Warehouse)</option>
                  <option value="FULFILLED">FULFILLED (Dispatched / Shipped)</option>
                  <option value="RETURNED">RETURNED (RMA / RTO)</option>
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Indicates whether items are dispatched or in customer possession.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">Internal Notes & Audit Log</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special customer requests, delivery notes, WhatsApp agreements..."
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none font-mono text-[11px]"
              />
            </div>

            {!isCancelled && (
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving Status...' : 'Save Status Changes'}
              </button>
            )}
          </div>

          {/* Line Items Card with Product Images & Complete Details */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Purchased Items ({order.items?.length || 0})
                </h2>
              </div>
              {!isCancelled && !isReturned && (
                <button
                  type="button"
                  onClick={handleOpenEditItems}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Items & Discounts</span>
                </button>
              )}
            </div>

            <div className="space-y-3 divide-y divide-border">
              {order.items?.map((item: any) => {
                const imageUrl = item.product?.images?.[0]?.url;
                return (
                  <div key={item.id} className="flex items-center justify-between gap-4 pt-3 first:pt-0">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Product Thumbnail */}
                      <div className="h-12 w-12 rounded-lg border border-border bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.productTitle}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Product Metadata */}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{item.productTitle}</p>
                        {item.variantTitle && (
                          <p className="text-[11px] text-muted-foreground">
                            Variant: <span className="font-medium text-foreground">{item.variantTitle}</span>
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground font-mono">
                          SKU: {item.sku} {item.weightKg ? `• ${item.weightKg} kg` : ''}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatCurrency(item.unitPrice, order.currency)} × {item.quantity}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-foreground block">
                        {formatCurrency(item.totalPrice, order.currency)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Breakdown */}
            <div className="border-t border-border pt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{formatCurrency(order.subtotal, order.currency)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <span>Discount ({order.couponCode || 'Custom Discount'})</span>
                  </span>
                  <span className="font-bold">- {formatCurrency(order.discountAmount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="font-medium text-foreground">
                  {order.shippingAmount === 0 ? 'FREE Delivery' : formatCurrency(order.shippingAmount, order.currency)}
                </span>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="font-medium text-foreground">{formatCurrency(order.taxAmount, order.currency)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-border pt-2.5 text-sm font-bold text-foreground">
                <span>Total Amount {order.paymentMethod === 'COD' ? '(COD to Collect)' : ''}</span>
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
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Logistics & Tracking</h2>
              </div>
              {hasActiveBooking && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    activeShipment.status === 'DELIVERED'
                      ? 'bg-success/15 text-success'
                      : activeShipment.status === 'RETURNED_TO_ORIGIN'
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-primary/15 text-primary'
                  }`}
                >
                  {activeShipment.status}
                </span>
              )}
            </div>

            {!hasActiveBooking ? (
              <div className="space-y-3 py-2 text-center">
                <p className="text-xs text-muted-foreground">
                  No active courier dispatch booked for this order yet.
                </p>
                {!isCancelled && !isReturned && (
                  <button
                    type="button"
                    onClick={handleOpenDispatchModal}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 px-4 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Book Courier Dispatch (PostEx)</span>
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
                      {activeShipment.isCod
                        ? `COD: ${formatCurrency(activeShipment.codAmount, activeShipment.currency)}`
                        : 'Prepaid'}
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
                  {(activeShipment.labelUrl || activeShipment.trackingNumber) && (
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

                {/* Live Real-Time Parcel Journey Stepper */}
                {stepperData && (
                  <div className="border-t border-border pt-3">
                    <p className="text-[11px] font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-primary" />
                      <span>Live Parcel Journey</span>
                    </p>
                    <TrackingStepper shipment={stepperData} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer Profile Card with WhatsApp Link */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Customer Profile</h2>
              </div>
            </div>

            <div className="space-y-2 text-xs text-foreground">
              <p className="font-bold text-sm">
                {order.customer?.firstName} {order.customer?.lastName}
              </p>
              <p className="text-muted-foreground">{order.customer?.email}</p>

              {order.customer?.phone && (
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-muted-foreground">{order.customer.phone}</span>
                  {customerWhatsApp && (
                    <a
                      href={customerWhatsApp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md transition-colors"
                    >
                      <MessageCircle className="h-3 w-3" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {order.guestOrderPossiblyLinked && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-[11px] text-warning">
                Guest checkout matched an existing customer account.
              </div>
            )}
          </div>

          {/* Delivery Address Card with Inline Edit & WhatsApp Button */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Delivery Address</h2>
              </div>
              {!isCancelled && !isReturned && (
                <button
                  type="button"
                  onClick={() => setShowEditAddressModal(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit Address</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-foreground">
              <p className="font-bold">{shippingAddr?.name}</p>
              <p className="text-muted-foreground">{shippingAddr?.address || shippingAddr?.addressLine1}</p>
              {(shippingAddr?.apartment || shippingAddr?.addressLine2) && (
                <p className="text-muted-foreground">{shippingAddr?.apartment || shippingAddr?.addressLine2}</p>
              )}
              <p className="text-muted-foreground">
                {shippingAddr?.city}, {shippingAddr?.province || ''} {shippingAddr?.postalCode || ''}
              </p>
              <p className="text-muted-foreground">{shippingAddr?.country}</p>

              {shippingAddr?.phone && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-mono text-muted-foreground">Phone: {shippingAddr.phone}</span>
                  {shippingWhatsApp && (
                    <a
                      href={shippingWhatsApp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md transition-colors"
                    >
                      <MessageCircle className="h-3 w-3" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Delivery Address Dialog */}
      {showEditAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            ref={editAddressModalRef}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Edit Shipping Address</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditAddressModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Recipient Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={draftAddress.name}
                  onChange={(e) => setDraftAddress({ ...draftAddress, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Phone Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={draftAddress.phone}
                  onChange={(e) => setDraftAddress({ ...draftAddress, phone: e.target.value })}
                  placeholder="03001234567"
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Street Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={draftAddress.address}
                  onChange={(e) => setDraftAddress({ ...draftAddress, address: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Apartment / Suite / Unit (Optional)
                </label>
                <input
                  type="text"
                  value={draftAddress.apartment}
                  onChange={(e) => setDraftAddress({ ...draftAddress, apartment: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    City <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={draftAddress.city}
                    onChange={(e) => setDraftAddress({ ...draftAddress, city: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Province
                  </label>
                  <input
                    type="text"
                    value={draftAddress.province}
                    onChange={(e) => setDraftAddress({ ...draftAddress, province: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditAddressModal(false)}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Address</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Line Items, Quantities, Variant Swaps & Custom Discounts Modal */}
      {showEditItemsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div
            ref={editItemsModalRef}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Edit Items, Variants & Discounts</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditItemsModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {hasActiveBooking && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                <strong>Notice:</strong> This order is already booked on PostEx ({activeShipment.trackingNumber}). If you modify quantities or prices, please cancel the consignment and re-book so the COD amount matches.
              </div>
            )}

            <form onSubmit={handleSaveItems} className="space-y-4">
              {/* Existing / Active Items List */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {activeDraftItems.map((item, idx) => (
                  <div
                    key={item.id || `new-${idx}`}
                    className="rounded-lg border border-border bg-background p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.productTitle}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">SKU: {item.sku}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...draftItems];
                          const targetIdx = draftItems.indexOf(item);
                          if (item.id) {
                            updated[targetIdx]._delete = true;
                          } else {
                            updated.splice(targetIdx, 1);
                          }
                          setDraftItems(updated);
                        }}
                        className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {/* Variant Selector (if variants available) */}
                      {item.availableVariants && item.availableVariants.length > 0 ? (
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">
                            Variant (Color/Size)
                          </label>
                          <select
                            value={item.variantId || ''}
                            onChange={(e) => {
                              const newVarId = e.target.value;
                              const selectedVar = item.availableVariants?.find((v) => v.id === newVarId);
                              const updated = [...draftItems];
                              const targetIdx = draftItems.indexOf(item);
                              updated[targetIdx].variantId = newVarId || null;
                              updated[targetIdx].variantTitle = selectedVar?.title || null;
                              if (selectedVar?.price) {
                                updated[targetIdx].unitPrice = selectedVar.price;
                              }
                              setDraftItems(updated);
                            }}
                            className="w-full rounded border border-input bg-card p-1.5 text-xs text-foreground"
                          >
                            {item.availableVariants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.title} ({formatCurrency(v.price, order.currency)} - In Stock: {v.inventoryQty})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">
                            Product Type
                          </label>
                          <span className="text-xs text-muted-foreground italic">Standard Product</span>
                        </div>
                      )}

                      {/* Quantity Input */}
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Quantity</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.quantity > 1) {
                                const updated = [...draftItems];
                                const targetIdx = draftItems.indexOf(item);
                                updated[targetIdx].quantity -= 1;
                                setDraftItems(updated);
                              }
                            }}
                            className="h-7 w-7 rounded border border-border bg-card flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              const updated = [...draftItems];
                              const targetIdx = draftItems.indexOf(item);
                              updated[targetIdx].quantity = val;
                              setDraftItems(updated);
                            }}
                            className="w-14 text-center rounded border border-input bg-card p-1 text-xs text-foreground font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...draftItems];
                              const targetIdx = draftItems.indexOf(item);
                              updated[targetIdx].quantity += 1;
                              setDraftItems(updated);
                            }}
                            className="h-7 w-7 rounded border border-border bg-card flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Unit Price Override */}
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">
                          Unit Price ({order.currency})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            const updated = [...draftItems];
                            const targetIdx = draftItems.indexOf(item);
                            updated[targetIdx].unitPrice = val;
                            setDraftItems(updated);
                          }}
                          className="w-full rounded border border-input bg-card p-1.5 text-xs text-foreground font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Product to Order Section */}
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>Add Another Product to this Order</span>
                </p>

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground absolute left-3" />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => handleSearchProducts(e.target.value)}
                      placeholder="Search active catalog products by title or SKU..."
                      className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none"
                    />
                  </div>

                  {searchingProducts && (
                    <div className="text-[11px] text-muted-foreground py-1">Searching catalog...</div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-xl divide-y divide-border">
                      {searchResults.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => handleSelectProductToAdd(prod)}
                          className="p-2 text-xs hover:bg-muted cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-foreground">{prod.title}</span>
                            <span className="text-[10px] text-muted-foreground ml-2 font-mono">
                              ({prod.variants?.length || 0} variants)
                            </span>
                          </div>
                          <span className="font-mono text-primary font-bold">
                            {formatCurrency(prod.basePrice, order.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedProductToAdd && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <p className="text-xs font-bold text-foreground">
                      Selected: {selectedProductToAdd.title}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {selectedProductToAdd.variants?.length > 0 && (
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">
                            Choose Variant
                          </label>
                          <select
                            value={selectedVariantIdToAdd}
                            onChange={(e) => {
                              setSelectedVariantIdToAdd(e.target.value);
                              const v = selectedProductToAdd.variants.find((x: any) => x.id === e.target.value);
                              if (v) setAddUnitPrice(v.price);
                            }}
                            className="w-full rounded border border-input bg-card p-1 text-xs text-foreground"
                          >
                            {selectedProductToAdd.variants.map((v: any) => (
                              <option key={v.id} value={v.id}>
                                {v.title} ({formatCurrency(v.price, order.currency)} - In Stock: {v.inventoryQty})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={addQuantity}
                          onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full rounded border border-input bg-card p-1 text-xs text-foreground font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">
                          Price ({order.currency})
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={addUnitPrice}
                          onChange={(e) => setAddUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full rounded border border-input bg-card p-1 text-xs text-foreground font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItemToDraft}
                      className="rounded bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
                    >
                      + Add to List
                    </button>
                  </div>
                )}
              </div>

              {/* Pricing Overrides: Custom Discount & Delivery Fee */}
              <div className="border-t border-border pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Custom Order Discount ({order.currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draftDiscount}
                      onChange={(e) => setDraftDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="e.g. 500"
                      className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Direct discount deducted from subtotal.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">
                      Delivery Charges ({order.currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draftShipping}
                      onChange={(e) => setDraftShipping(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="e.g. 200 or 0"
                      className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Set to 0 for Free Delivery.
                    </p>
                  </div>
                </div>

                {/* Recalculated Total Preview */}
                <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>New Subtotal:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {formatCurrency(draftSubtotal, order.currency)}
                    </span>
                  </div>
                  {draftDiscount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount:</span>
                      <span className="font-mono font-semibold">
                        - {formatCurrency(draftDiscount, order.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {draftShipping === 0 ? 'FREE' : formatCurrency(draftShipping, order.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-1">
                    <span>Recalculated Grand Total:</span>
                    <span className="font-mono text-primary font-extrabold">
                      {formatCurrency(draftTotal, order.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditItemsModal(false)}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Changes & Recalculate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fulfill Order Modal */}
      {showFulfillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            ref={fulfillModalRef}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Fulfill Order #{order.orderNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFulfillModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                How would you like to fulfill this order?
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground p-2 rounded-lg border border-border hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={sendEmailOnFulfill}
                    onChange={(e) => setSendEmailOnFulfill(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <span>Send shipment confirmation email to customer ({order.customer?.email || shippingAddr?.email})</span>
                </label>
              </div>

              <div className="pt-3 border-t border-border flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFulfillModal(false);
                    handleOpenDispatchModal();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 px-4 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
                >
                  <Truck className="h-4 w-4" />
                  <span>Book with Courier (PostEx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleFulfillOrderDirect}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 px-4 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>Mark as Fulfilled Manually</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

              {/* Order Type and Pickup Warehouse Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Order Type
                  </label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    <option value="Normal">Normal (Standard Delivery)</option>
                    <option value="Replacement">Replacement (Exchange)</option>
                    <option value="Overland">Overland (Bulk/Cargo)</option>
                    <option value="Reverse">Reverse (Customer Return)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Pickup Warehouse Code
                  </label>
                  <input
                    type="text"
                    value={pickupAddressCode}
                    onChange={(e) => setPickupAddressCode(e.target.value)}
                    placeholder="e.g. 001"
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

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

'use client';
import { formatCurrency } from '@/lib/format';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Package, Truck, ShieldCheck, AlertCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';
import { TrackingStepper } from '@/components/storefront/TrackingStepper';

export const dynamic = 'force-dynamic';

export default function CustomerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/customer/orders/${id}`);
        if (!res.ok) throw new Error('Order not found or access restricted');
        const data = await res.json();
        setOrder(data.order);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-xs text-muted-foreground">Loading order #{id}...</div>;
  }

  if (error || !order) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
        <h1 className="text-lg font-bold text-foreground">Order Access Restricted</h1>
        <p className="text-xs text-muted-foreground">{error || 'This order does not belong to your customer account.'}</p>
        <Link
          href="/account/orders"
          className="inline-block rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow"
        >
          Return to Orders
        </Link>
      </main>
    );
  }

  const shippingAddr: any = order.shippingAddress;
  const activeShipment = order.shipments?.find((s: any) => s.status !== 'CANCELLED') || order.shipments?.[0];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Account', href: '/account' }, { label: 'Orders', href: '/account/orders' }, { label: order.orderNumber }]} />

      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
            Order {order.orderNumber}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Placed on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              order.paymentStatus === 'PAID' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            }`}
          >
            Payment: {order.paymentStatus}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
            {order.fulfillmentStatus}
          </span>
        </div>
      </div>

      {/* Live Courier Logistics Tracking Stepper */}
      {activeShipment && (
        <TrackingStepper
          shipment={{
            trackingNumber: activeShipment.trackingNumber,
            courierName: activeShipment.courierName,
            courierCode: activeShipment.courierCode,
            status: activeShipment.status,
            rawStatus: activeShipment.rawCourierStatus,
            isCod: activeShipment.isCod,
            codAmount: activeShipment.codAmount,
            currency: activeShipment.currency,
            bookedAt: activeShipment.bookedAt,
            deliveredAt: activeShipment.deliveredAt,
            trackingUrl: activeShipment.trackingUrl,
            recipient: {
              name: shippingAddr?.name,
              city: shippingAddr?.city,
              country: shippingAddr?.country,
            },
            events: activeShipment.events || [],
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Left 7 Cols: Items */}
        <div className="md:col-span-7 rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Package className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Items Snapshot</h2>
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

          <div className="border-t border-border pt-3 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-foreground">{formatCurrency(order.subtotal, order.currency)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <span>Coupon Discount ({order.couponCode})</span>
                <span>- {formatCurrency(order.discountAmount, order.currency)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-medium text-foreground">{formatCurrency(order.shippingAmount, order.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
              <span>Grand Total</span>
              <span className="text-base font-extrabold text-primary">
                {formatCurrency(order.totalPrice, order.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Destination */}
        <div className="md:col-span-5 rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Truck className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Shipping Address</h2>
          </div>

          <div className="space-y-1.5 text-xs text-foreground">
            <p className="font-bold">{shippingAddr?.name}</p>
            <p className="text-muted-foreground">{shippingAddr?.address}</p>
            {shippingAddr?.apartment && <p className="text-muted-foreground">{shippingAddr?.apartment}</p>}
            <p className="text-muted-foreground">
              {shippingAddr?.city}, {shippingAddr?.province || ''} {shippingAddr?.postalCode || ''}
            </p>
            <p className="text-muted-foreground">{shippingAddr?.country}</p>
            <p className="text-muted-foreground pt-1">Phone: {shippingAddr?.phone}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

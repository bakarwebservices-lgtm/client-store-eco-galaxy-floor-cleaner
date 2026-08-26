'use client';
import { formatCurrency } from '@/lib/format';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, Eye } from 'lucide-react';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';

export const dynamic = 'force-dynamic';

export default function CustomerOrdersHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch('/api/customer/orders');
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Account', href: '/account' }, { label: 'Order History' }]} />

      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Your Order History</h1>
        <Link href="/account" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Loading orders...</div>
      ) : orders.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
          {orders.map((order) => (
            <div key={order.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-foreground">{order.orderNumber}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      order.paymentStatus === 'PAID'
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                    {order.fulfillmentStatus}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Placed on {new Date(order.createdAt).toLocaleDateString()} • {order.items?.length || 0} items
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <span className="text-xs font-bold text-foreground">
                  {formatCurrency(order.totalPrice, order.currency)}
                </span>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View Order</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border py-16 text-center space-y-3">
          <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">No orders yet</h2>
          <p className="text-xs text-muted-foreground">You have not placed any orders with this account yet.</p>
          <Link
            href="/products"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
          >
            Browse Products
          </Link>
        </div>
      )}
    </main>
  );
}

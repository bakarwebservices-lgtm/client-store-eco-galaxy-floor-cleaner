'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Eye, Filter, RefreshCw, AlertCircle, ShoppingBag, Clock, CheckCircle, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track, filter, fulfill, and manage store customer orders.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertCircle className="h-4 w-4" />
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
                <th className="p-3.5 font-bold">Order #</th>
                <th className="p-3.5 font-bold">Date</th>
                <th className="p-3.5 font-bold">Customer</th>
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
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((order) => {
                  const isCancelled = Boolean(order.cancelledAt);
                  return (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
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
                        Rs. {order.totalPrice.toLocaleString()}
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
                  <td colSpan={8} className="p-12 text-center space-y-2">
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
    </div>
  );
}

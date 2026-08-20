'use client';
import { formatCurrency } from '@/lib/format';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, MapPin, User, LogOut, Package, ArrowRight, AlertTriangle, CheckCircle, Mail } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function CustomerAccountDashboard() {
  const router = useRouter();
  const [customer, setCustomer] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, ordersRes] = await Promise.all([
          fetch('/api/auth/customer/me'),
          fetch('/api/customer/orders'),
        ]);

        if (!meRes.ok) {
          router.push('/account/login');
          return;
        }

        const meData = await meRes.json();
        const ordersData = await ordersRes.json();

        setCustomer(meData.customer);
        setOrders(ordersData.orders || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/customer/logout', { method: 'POST' });
    router.push('/account/login');
  };

  const handleResendVerification = async () => {
    setResending(true);
    setResendMsg(null);
    try {
      const res = await fetch('/api/auth/customer/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification link');
      setResendMsg('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setResendMsg(err.message);
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-muted-foreground">Loading account overview...</div>;
  }

  if (!customer) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Verification Notice Banner */}
      {!customer.isEmailVerified && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs text-warning">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Please verify your email address ({customer.email})</p>
              <p className="text-[11px] opacity-90">
                To protect customer privacy, past guest orders and saved addresses are only unlocked once your email is confirmed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resending}
            className="shrink-0 rounded-lg bg-warning/20 px-3 py-1.5 text-xs font-bold text-warning hover:bg-warning/30 transition-colors disabled:opacity-50"
          >
            {resending ? 'Sending...' : 'Resend Verification Email'}
          </button>
        </div>
      )}

      {resendMsg && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary font-medium">
          {resendMsg}
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {customer.firstName}!
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Logged in as <strong className="text-foreground">{customer.email}</strong>
            {customer.isEmailVerified ? (
              <span className="ml-2 inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                <CheckCircle className="h-3 w-3" /> Verified
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                Unverified
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors self-start sm:self-auto"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Account Navigation Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/account/orders"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-foreground">Order History</h2>
              <p className="text-[11px] text-muted-foreground">{orders.length} orders placed</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <Link
          href="/account/addresses"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-foreground">Address Book</h2>
              <p className="text-[11px] text-muted-foreground">{customer.addresses?.length || 0} saved addresses</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <Link
          href="/account/profile"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-foreground">Profile Settings</h2>
              <p className="text-[11px] text-muted-foreground">Name, email & phone</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Recent Orders List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Recent Orders</h2>
          <Link href="/account/orders" className="text-xs font-semibold text-primary hover:underline">
            View All ({orders.length})
          </Link>
        </div>

        {orders.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
            {orders.slice(0, 3).map((order) => (
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
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-12 text-center space-y-2">
            <p className="text-xs font-semibold text-foreground">No orders found</p>
            <p className="text-[11px] text-muted-foreground">
              {!customer.isEmailVerified
                ? 'Verify your email address above to view and link past guest orders.'
                : 'When you purchase products, they will show up here.'}
            </p>
            <Link
              href="/products"
              className="inline-block rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors mt-2"
            >
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

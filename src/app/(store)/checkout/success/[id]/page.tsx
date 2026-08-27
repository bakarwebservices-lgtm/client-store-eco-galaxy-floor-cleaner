import React from 'react';
import { formatCurrency } from '@/lib/format';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifyOrderAccessToken } from '@/lib/auth/token';
import { CheckCircle2, ShoppingBag, Truck, Package, Phone, Mail, MapPin, ShieldAlert, MessageSquare } from 'lucide-react';
import { OrderSuccessTracker } from './OrderSuccessTracker';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Order Confirmed | Store',
  description: 'Your order has been successfully placed and is being prepared for dispatch.',
};

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await db.order.findFirst({
    where: {
      OR: [{ id }, { orderNumber: id }],
      deletedAt: null,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              images: { take: 1 },
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Access Control Verification:
  // Validate that the request possesses the signed order access token cookie
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(`aw_order_access_${order.orderNumber}`)?.value;
  let isAuthorized = false;

  if (tokenCookie) {
    const verified = await verifyOrderAccessToken(tokenCookie);
    if (verified && (verified.orderId === order.id || verified.orderNumber === order.orderNumber)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Order Access Restricted</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          For customer security, order details can only be viewed immediately following checkout or by logging into your customer account.
        </p>
        <div className="pt-2">
          <Link
            href="/products"
            className="inline-block rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
          >
            Return to Store Catalog
          </Link>
        </div>
      </main>
    );
  }

  const shippingAddr: any = order.shippingAddress;

  // Query WhatsApp and Brand settings for 1-tap confirmation
  let storeName = 'Store';
  let storePhone = '';
  let whatsappEnabled = true;
  let whatsappNumber = '';
  let whatsappTemplate = '';

  try {
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: [
            'store.name',
            'store.phone',
            'whatsapp.order_confirmation_enabled',
            'whatsapp.phone_number',
            'whatsapp.custom_message',
          ],
        },
      },
    });

    for (const s of settings) {
      if (s.key === 'store.name' && s.value) storeName = String(s.value);
      if (s.key === 'store.phone' && s.value) storePhone = String(s.value);
      if (s.key === 'whatsapp.order_confirmation_enabled') whatsappEnabled = s.value === true || s.value === 'true';
      if (s.key === 'whatsapp.phone_number' && s.value) whatsappNumber = String(s.value);
      if (s.key === 'whatsapp.custom_message' && s.value) whatsappTemplate = String(s.value);
    }
  } catch {
    // fallback
  }

  const targetWhatsApp = (whatsappNumber || storePhone).replace(/[^0-9]/g, '');

  let rawMsg =
    whatsappTemplate ||
    'Hi {store_name}! I just placed order #{order_number} for {total_amount}. Please confirm and ship my order to {city}.';
  rawMsg = rawMsg
    .replace(/{store_name}/g, storeName)
    .replace(/{order_number}/g, order.orderNumber)
    .replace(/{total_amount}/g, formatCurrency(order.totalPrice, order.currency))
    .replace(/{city}/g, shippingAddr?.city || '');

  const whatsappUrl = targetWhatsApp
    ? `https://wa.me/${targetWhatsApp}?text=${encodeURIComponent(rawMsg)}`
    : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Client tracker component with sessionStorage deduplication */}
      <OrderSuccessTracker order={order} />

      {/* Confirmation Hero */}
      <div className="rounded-2xl border border-success/30 bg-success/5 p-6 sm:p-8 text-center space-y-3 shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Thank you for your order!
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          We have received your order <strong className="text-foreground font-mono">{order.orderNumber}</strong> and our team is preparing it for shipment.
        </p>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            Payment: Cash On Delivery (Pending Delivery)
          </span>
        </div>
      </div>

      {/* 1-Tap WhatsApp Order Confirmation Card */}
      {whatsappEnabled && whatsappUrl && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-emerald-950 dark:text-emerald-200">
                Confirm Your Order via WhatsApp (Instant Dispatch)
              </h2>
              <p className="text-xs text-emerald-900/80 dark:text-emerald-300">
                Click below to send a pre-filled WhatsApp confirmation to our team for faster priority processing.
              </p>
            </div>
          </div>
          <div className="pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-[0.99]"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Confirm Order #{order.orderNumber} on WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Order Details & Items */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Package className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Order Items</h2>
          </div>

          <div className="space-y-3 divide-y divide-border">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 pt-3 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/20">
                    {item.product?.images?.[0]?.url ? (
                      <Image
                        src={item.product.images[0].url}
                        alt={item.productTitle}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        N/A
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground line-clamp-1">{item.productTitle}</p>
                    {item.variantTitle && (
                      <p className="text-[10px] text-muted-foreground">{item.variantTitle}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-foreground whitespace-nowrap">
                  {formatCurrency(item.totalPrice, order.currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
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
              <span className="font-medium text-foreground">
                {order.shippingAmount === 0 ? 'FREE' : formatCurrency(order.shippingAmount, order.currency)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
              <span>Total Amount</span>
              <span className="text-base font-extrabold text-primary">
                {formatCurrency(order.totalPrice, order.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping & Contact Summary */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Truck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Shipping Destination</h2>
          </div>

          <div className="space-y-3 text-xs text-foreground">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{shippingAddr.name}</p>
                <p className="text-muted-foreground">{shippingAddr.address}</p>
                {shippingAddr.apartment && <p className="text-muted-foreground">{shippingAddr.apartment}</p>}
                <p className="text-muted-foreground">
                  {shippingAddr.city}, {shippingAddr.province || ''} {shippingAddr.postalCode || ''}
                </p>
                <p className="text-muted-foreground">{shippingAddr.country}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{shippingAddr.phone}</span>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{shippingAddr.email}</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <Link
              href="/products"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

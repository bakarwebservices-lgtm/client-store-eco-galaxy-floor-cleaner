import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { CheckCircle2, ShoppingBag, Truck, Package, Phone, Mail, MapPin } from 'lucide-react';
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
    },
  });

  if (!order) {
    notFound();
  }

  const shippingAddr: any = order.shippingAddress;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Client tracker component for Purchase analytics hook */}
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
                  Rs. {item.totalPrice.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="border-t border-border pt-3 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-foreground">Rs. {order.subtotal.toLocaleString()}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <span>Coupon Discount ({order.couponCode})</span>
                <span>- Rs. {order.discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-medium text-foreground">
                {order.shippingAmount === 0 ? 'FREE' : `Rs. ${order.shippingAmount.toLocaleString()}`}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
              <span>Total Amount</span>
              <span className="text-base font-extrabold text-primary">
                Rs. {order.totalPrice.toLocaleString()}
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

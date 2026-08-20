'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingBag, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';

export const dynamic = 'force-dynamic';

export default function CartPage() {
  const { items, totalItems, subtotal, freeShippingThreshold, updateQuantity, removeItem } = useCart();

  const progressToFreeShipping = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Catalog', href: '/products' }, { label: 'Shopping Bag' }]} />

      <div className="border-b border-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Shopping Bag ({totalItems} {totalItems === 1 ? 'item' : 'items'})
        </h1>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left 2 Cols: Items Table */}
          <div className="lg:col-span-2 space-y-4">
            {/* Dynamic Free Shipping Progress Indicator (Driven by Setting model) */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Truck className="h-4 w-4 text-primary" />
                {remainingForFreeShipping > 0 ? (
                  <span>
                    Add <strong className="text-primary">Rs. {remainingForFreeShipping.toLocaleString()}</strong> more to unlock <strong>FREE Shipping</strong> (Threshold: Rs. {freeShippingThreshold.toLocaleString()})!
                  </span>
                ) : (
                  <span className="text-success font-bold">🎉 You unlocked FREE Shipping!</span>
                )}
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${progressToFreeShipping}%` }}
                />
              </div>
            </div>

            {/* Items Card */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/20">
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {item.productName}
                      </Link>
                      {item.variantTitle && (
                        <p className="text-xs text-muted-foreground">
                          Variant: <span className="font-medium text-foreground">{item.variantTitle}</span>
                        </p>
                      )}
                      <p className="text-xs font-bold text-foreground sm:hidden">
                        Rs. {item.price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    {/* Stepper */}
                    <div className="flex items-center rounded-lg border border-border bg-background">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-semibold text-foreground min-w-[24px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= item.availableStock}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    {/* Total Item Price */}
                    <div className="text-right min-w-[100px]">
                      <p className="text-sm font-bold text-foreground">
                        Rs. {item.totalItemPrice.toLocaleString()}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-[11px] text-muted-foreground hover:text-destructive transition-colors mt-0.5 inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 1 Col: Order Summary */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Order Summary</h2>

              <div className="space-y-3 text-xs text-muted-foreground border-b border-border pb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-foreground">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Shipping</span>
                  <span className="font-medium text-foreground">
                    {remainingForFreeShipping === 0 ? 'FREE' : 'Calculated at checkout'}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between text-base font-bold text-foreground">
                <span>Total</span>
                <span className="text-lg font-extrabold text-primary">
                  Rs. {subtotal.toLocaleString()}
                </span>
              </div>

              <Link
                href="/checkout"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-transform active:scale-[0.98]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Safe & secure 256-bit SSL checkout</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-24 text-center space-y-4 max-w-md mx-auto">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">Your bag is currently empty</h2>
            <p className="text-xs text-muted-foreground">Explore our premium catalog to start adding items.</p>
          </div>
          <Link
            href="/products"
            className="inline-block rounded-lg bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      )}
    </main>
  );
}

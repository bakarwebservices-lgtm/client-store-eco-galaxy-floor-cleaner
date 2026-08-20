'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Truck, ArrowLeft, Loader2, Tag, Check, AlertCircle, Banknote, CreditCard } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { track } from '@/lib/tracking/events';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalItems, subtotal, freeShippingThreshold, refreshCart } = useCart();

  // Address form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('COD');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Track InitiateCheckout on load
  useEffect(() => {
    if (items.length > 0) {
      track('InitiateCheckout', {
        value: subtotal,
        currency: 'PKR',
        quantity: totalItems,
        content_ids: items.map((i) => i.variantId || i.productId),
      });
    }
  }, [items, subtotal, totalItems]);

  const shippingCost = subtotal >= freeShippingThreshold ? 0 : 250;
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponError(null);
    setValidatingCoupon(true);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCouponError(data.error || 'Invalid coupon code');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(data);
      }
    } catch (err) {
      setCouponError('Network error while validating coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (items.length === 0) {
      setCheckoutError('Your shopping bag is empty.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      shippingAddress: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        apartment: apartment.trim() || null,
        city: city.trim(),
        province: province.trim() || null,
        postalCode: postalCode.trim() || null,
      },
      paymentMethod,
      couponCode: appliedCoupon?.code || null,
      notes: notes.trim() || null,
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setCheckoutError(data.error || 'Failed to place order.');
        setIsSubmitting(false);
        return;
      }

      // Refresh cart context (now cleared)
      await refreshCart();

      // Redirect to Order Confirmation Success page
      router.push(`/checkout/success/${data.orderNumber}`);
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutError('Network error while placing order.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">Your shopping bag is empty</h1>
        <p className="text-xs text-muted-foreground">Please add items from the catalog before proceeding to checkout.</p>
        <Link
          href="/products"
          className="inline-block rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
        >
          Browse Products
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Catalog', href: '/products' }, { label: 'Shopping Bag', href: '/cart' }, { label: 'Checkout' }]} />

      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Checkout</h1>
        <Link href="/cart" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Bag</span>
        </Link>
      </div>

      {checkoutError && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Checkout Issue</p>
            <p className="mt-0.5">{checkoutError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left 7 Cols: Contact, Shipping, Payment */}
        <div className="lg:col-span-7 space-y-6">
          {/* Contact Information */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              1. Customer Contact
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-muted-foreground">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-muted-foreground">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              2. Delivery Address
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-muted-foreground">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ahmad"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-muted-foreground">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Khan"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">Street Address *</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House #, Street name, Sector/Area"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-muted-foreground">City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lahore"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-muted-foreground">Province / State</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Punjab"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-muted-foreground">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="54000"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">Delivery Notes (Optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gate code, landmarks, special delivery instructions..."
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              3. Payment Method
            </h2>

            <div className="space-y-2">
              {/* Cash On Delivery (Active) */}
              <label className="flex items-center justify-between p-3.5 rounded-xl border-2 border-primary bg-primary/5 cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">Cash On Delivery (COD)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Pay in cash when your order arrives at your address.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  Recommended
                </span>
              </label>

              {/* Online Gateway Option (Disabled / Future Gateway Slot) */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <input type="radio" disabled name="paymentMethod" />
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">Debit / Credit Card & Mobile Wallets</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      JazzCash, Easypaisa & Online Cards (Coming Soon)
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">Gateway Slot</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Order Summary & Coupon */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-5 shadow-sm sticky top-24">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Order Summary ({totalItems})
            </h2>

            {/* Items List Snapshot */}
            <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-border pr-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 pt-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/20">
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{item.productName}</p>
                      {item.variantTitle && (
                        <p className="text-[10px] text-muted-foreground">{item.variantTitle}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground whitespace-nowrap">
                    Rs. {item.totalItemPrice.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Box */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={Boolean(appliedCoupon)}
                  placeholder="Promo or Coupon Code"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-destructive hover:bg-muted"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    className="rounded-lg bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 disabled:opacity-50"
                  >
                    {validatingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                  </button>
                )}
              </div>

              {appliedCoupon && (
                <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                  <Check className="h-3.5 w-3.5" />
                  <span>Coupon {appliedCoupon.code} applied! (-Rs. {appliedCoupon.discountAmount.toLocaleString()})</span>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] text-destructive">{couponError}</p>
              )}
            </div>

            {/* Price Calculations */}
            <div className="border-t border-border pt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">Rs. {subtotal.toLocaleString()}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Coupon Discount</span>
                  <span>- Rs. {discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="font-semibold text-foreground">
                  {shippingCost === 0 ? <span className="text-success font-bold">FREE</span> : `Rs. ${shippingCost.toLocaleString()}`}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-t border-border pt-3 text-base font-bold text-foreground">
                <span>Grand Total</span>
                <span className="text-xl font-extrabold text-primary">
                  Rs. {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg hover:bg-primary-hover transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Confirming Order...</span>
                </>
              ) : (
                <span>Place Order with Cash on Delivery</span>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Safe & reliable doorstep delivery</span>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}

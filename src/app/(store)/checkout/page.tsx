'use client';
import { formatCurrency } from '@/lib/format';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Truck, ArrowLeft, Loader2, Tag, Check, AlertCircle, Banknote, CreditCard } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { track } from '@/lib/tracking/events';
import { safeFetch } from '@/lib/apiClient';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';
import { AddressFields } from '@/components/storefront/AddressFields';
import { normalizePhone, normalizeCity, isPhoneValid, validateAddressLine } from '@/lib/geo';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalItems, subtotal, freeShippingThreshold, standardShippingCost, currency, refreshCart } = useCart();

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

  // Abandoned Checkout Session ID
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    try {
      let currentSessionId = sessionStorage.getItem('aw_checkout_session');
      if (!currentSessionId) {
        currentSessionId = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        sessionStorage.setItem('aw_checkout_session', currentSessionId);
      }
      setSessionId(currentSessionId);
    } catch {
      setSessionId(`chk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
    }
  }, []);

  const shippingCost = subtotal >= freeShippingThreshold ? 0 : (standardShippingCost || 250);
  const discountAmount = appliedCoupon?.discountAmount || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  // Debounced abandoned checkout capture on checkout page
  useEffect(() => {
    if (!sessionId || items.length === 0) return;

    const timeout = setTimeout(() => {
      safeFetch('/api/checkout/abandoned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          name: [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: [address.trim(), apartment.trim()].filter(Boolean).join(', ') || null,
          city: city.trim() || null,
          province: province.trim() || null,
          cart: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
            title: i.productName || i.variantTitle || 'Item',
            price: i.price || 0,
          })),
          subtotal,
          discount: discountAmount,
          total: grandTotal,
        }),
      }).catch(() => {});
    }, 1200);

    return () => clearTimeout(timeout);
  }, [
    sessionId,
    items,
    firstName,
    lastName,
    email,
    phone,
    address,
    apartment,
    city,
    province,
    subtotal,
    discountAmount,
    grandTotal,
  ]);

  // Track InitiateCheckout on load
  useEffect(() => {
    if (items.length > 0) {
      track('InitiateCheckout', {
        value: subtotal,
        currency: currency || 'PKR',
        quantity: totalItems,
        content_ids: items.map((i) => i.variantId || i.productId),
      });
    }
  }, [items, subtotal, totalItems, currency]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponError(null);
    setValidatingCoupon(true);

    try {
      const { ok, data, error } = await safeFetch<any>('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });

      if (!ok) {
        setCouponError(error || 'Invalid coupon code');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(data);
      }
    } catch (err: any) {
      setCouponError(err?.message || 'Network error while validating coupon');
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

    const addrCheck = validateAddressLine(address, 'Pakistan');
    if (!addrCheck.valid) {
      setCheckoutError(addrCheck.error || 'Please provide a complete street address');
      return;
    }

    if (!isPhoneValid(phone, 'Pakistan')) {
      setCheckoutError('Please provide a valid 11-digit mobile number (e.g. 0300 1234567)');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      sessionId,
      shippingAddress: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: normalizePhone(phone, 'Pakistan'),
        address: address.trim(),
        apartment: apartment.trim() || null,
        city: normalizeCity(city, 'Pakistan'),
        province: province.trim() || null,
        postalCode: postalCode.trim() || null,
        country: 'Pakistan',
      },
      paymentMethod,
      couponCode: appliedCoupon?.code || null,
      notes: notes.trim() || null,
    };

    try {
      const { ok, data, error } = await safeFetch<any>('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!ok) {
        setCheckoutError(error || 'Failed to place order.');
        setIsSubmitting(false);
        return;
      }

      // Refresh cart context (now cleared)
      await refreshCart();

      // Redirect to Order Confirmation Success page
      router.push(`/checkout/success/${data.orderNumber}`);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setCheckoutError(err?.message || 'Network error while placing order.');
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

            <div className="space-y-1">
              <label htmlFor="checkout-email" className="block text-[11px] font-semibold text-muted-foreground">Email Address *</label>
              <input
                id="checkout-email"
                type="email"
                required
                aria-required="true"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              2. Delivery Address
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="checkout-first-name" className="block text-[11px] font-semibold text-muted-foreground">First Name *</label>
                <input
                  id="checkout-first-name"
                  type="text"
                  required
                  aria-required="true"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ahmad"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="checkout-last-name" className="block text-[11px] font-semibold text-muted-foreground">Last Name *</label>
                <input
                  id="checkout-last-name"
                  type="text"
                  required
                  aria-required="true"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Khan"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Standardized Country-Aware Address & Geo Fields */}
            <AddressFields
              idPrefix="checkout"
              country="Pakistan"
              address={address}
              setAddress={setAddress}
              city={city}
              setCity={setCity}
              province={province}
              setProvince={setProvince}
              postalCode={postalCode}
              setPostalCode={setPostalCode}
              phone={phone}
              setPhone={setPhone}
            />

            <div className="space-y-1 pt-1">
              <label htmlFor="checkout-notes" className="block text-[11px] font-semibold text-muted-foreground">Delivery Notes (Optional)</label>
              <textarea
                id="checkout-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gate code, landmarks, special courier instructions..."
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
              {/* Cash On Delivery (Active & Only Option) */}
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
                      Pay in cash when your order arrives at your address. Free delivery across Pakistan.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  Selected
                </span>
              </label>
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
                    {formatCurrency(item.totalItemPrice)}
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
                  <span>Coupon {appliedCoupon.code} applied! (-{formatCurrency(appliedCoupon.discountAmount)})</span>
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
                <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Coupon Discount</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="font-semibold text-foreground">
                  {shippingCost === 0 ? <span className="text-success font-bold">FREE</span> : formatCurrency(shippingCost)}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-t border-border pt-3 text-base font-bold text-foreground">
                <span>Grand Total</span>
                <span className="text-xl font-extrabold text-primary">
                  {formatCurrency(grandTotal)}
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

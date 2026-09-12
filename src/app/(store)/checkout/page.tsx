'use client';
import { formatCurrency } from '@/lib/format';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Truck, ArrowLeft, Loader2, Tag, Check, AlertCircle, Banknote, CreditCard, MessageCircle, Landmark, Copy, Sparkles, Smartphone, CheckCheck } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');

  // Cash on Delivery Settings
  const [codSettings, setCodSettings] = useState<{
    enabled: boolean;
    title: string;
    instructions: string;
    fee: number;
    maxLimit: number;
  }>({
    enabled: true,
    title: 'Cash on Delivery (COD)',
    instructions: 'Pay with cash upon package delivery at your doorstep.',
    fee: 0,
    maxLimit: 0,
  });

  // Bank Transfer & Prepayment Incentive Settings
  const [bankSettings, setBankSettings] = useState<{
    enabled: boolean;
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    bankName2: string;
    accountTitle2: string;
    accountNumber2: string;
    instructions: string;
    discountEnabled: boolean;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    whatsappNumber: string;
  }>({
    enabled: false,
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    bankName2: '',
    accountTitle2: '',
    accountNumber2: '',
    instructions: '',
    discountEnabled: false,
    discountType: 'percentage',
    discountValue: 0,
    whatsappNumber: '',
  });

  const [selectedAccountSlot, setSelectedAccountSlot] = useState<1 | 2>(1);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Store notification settings (WhatsApp vs Email)
  const [isEmailRequired, setIsEmailRequired] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  useEffect(() => {
    safeFetch<any>('/api/settings').then(({ ok, data }) => {
      if (ok && data?.settings) {
        const s = data.settings;
        if (typeof s.emailRequiredAtCheckout === 'boolean') {
          setIsEmailRequired(s.emailRequiredAtCheckout);
        } else {
          const smtp = Boolean(s.emailSmtpEnabled);
          const wa = s.whatsappOrderConfirmationEnabled !== false;
          setIsEmailRequired(smtp || !wa);
        }
        setWhatsappEnabled(s.whatsappOrderConfirmationEnabled !== false);

        const codEn = s.codEnabled !== false;
        const bankEn = Boolean(s.bankTransferEnabled);

        setCodSettings({
          enabled: codEn,
          title: s.codTitle || 'Cash on Delivery (COD)',
          instructions: s.codInstructions || 'Pay with cash upon package delivery at your doorstep.',
          fee: Number(s.codFee) || 0,
          maxLimit: Number(s.codMaxLimit) || 0,
        });

        // Set initial payment method if COD is disabled
        if (!codEn && bankEn) {
          setPaymentMethod('BANK_TRANSFER');
        }

        setBankSettings({
          enabled: bankEn,
          bankName: s.bankName || 'Meezan Bank',
          accountTitle: s.accountTitle || '',
          accountNumber: s.accountNumber || '',
          bankName2: s.bankName2 || '',
          accountTitle2: s.accountTitle2 || '',
          accountNumber2: s.accountNumber2 || '',
          instructions:
            s.bankInstructions ||
            'Please transfer the total order amount to the bank account above and send your payment screenshot with Order # to our WhatsApp for immediate dispatch.',
          discountEnabled: Boolean(s.bankDiscountEnabled),
          discountType: s.bankDiscountType || 'percentage',
          discountValue: Number(s.bankDiscountValue) || 0,
          whatsappNumber: s.whatsappNumber || '',
        });
      }
    });
  }, []);

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
  const couponDiscount = appliedCoupon?.discountAmount || 0;

  // Real-time prepayment incentive discount calculation
  let bankTransferDiscount = 0;
  if (paymentMethod === 'BANK_TRANSFER' && bankSettings.discountEnabled && bankSettings.discountValue > 0) {
    const netEligibleSubtotal = Math.max(0, subtotal - couponDiscount);
    if (bankSettings.discountType === 'percentage') {
      bankTransferDiscount = Math.round(((netEligibleSubtotal * bankSettings.discountValue) / 100) * 100) / 100;
    } else {
      bankTransferDiscount = Math.min(netEligibleSubtotal, bankSettings.discountValue);
    }
  }

  const isCodBlockedByLimit = Boolean(
    codSettings.maxLimit > 0 && subtotal > codSettings.maxLimit
  );

  const appliedCodFee =
    paymentMethod === 'COD' && codSettings.enabled && !isCodBlockedByLimit && codSettings.fee > 0
      ? codSettings.fee
      : 0;

  const discountAmount = Math.min(subtotal, couponDiscount + bankTransferDiscount);
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost + appliedCodFee);

  const handleCopyAccount = (textToCopy: string) => {
    if (!textToCopy) return;
    try {
      navigator.clipboard.writeText(textToCopy);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } catch {
      // ignore
    }
  };

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

  const triggerValidationError = (elementId?: string, errorMsg?: string) => {
    if (errorMsg) setCheckoutError(errorMsg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (elementId) {
      setTimeout(() => {
        document.getElementById(elementId)?.focus();
      }, 150);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (items.length === 0) {
      triggerValidationError(undefined, 'Your shopping bag is empty.');
      return;
    }

    if (isEmailRequired && !email.trim()) {
      triggerValidationError('checkout-email', 'Please provide a valid email address.');
      return;
    }

    if (!firstName.trim()) {
      triggerValidationError('checkout-first-name', 'Please provide your first name.');
      return;
    }

    if (!lastName.trim()) {
      triggerValidationError('checkout-last-name', 'Please provide your last name.');
      return;
    }

    const addrCheck = validateAddressLine(address, 'Pakistan');
    if (!addrCheck.valid) {
      triggerValidationError('checkout-address', addrCheck.error || 'Please provide a complete street address.');
      return;
    }

    if (!isPhoneValid(phone, 'Pakistan')) {
      triggerValidationError('checkout-phone', 'Please provide a valid 11-digit mobile number (e.g. 0300 1234567).');
      return;
    }

    if (!city.trim()) {
      triggerValidationError('checkout-city', 'Please select or enter your city.');
      return;
    }

    if (paymentMethod === 'COD') {
      if (!codSettings.enabled) {
        triggerValidationError(undefined, 'Cash on Delivery is currently disabled. Please choose Direct Bank Transfer.');
        return;
      }
      if (isCodBlockedByLimit) {
        triggerValidationError(
          undefined,
          `Cash on Delivery is only available for orders up to ${formatCurrency(codSettings.maxLimit)}. Please choose Direct Bank Transfer.`
        );
        return;
      }
    } else if (paymentMethod === 'BANK_TRANSFER') {
      if (!bankSettings.enabled) {
        triggerValidationError(undefined, 'Direct Bank Transfer is currently not enabled.');
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      sessionId,
      shippingAddress: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
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
        triggerValidationError(undefined, error || 'Failed to place order.');
        setIsSubmitting(false);
        return;
      }

      // Refresh cart context (now cleared)
      await refreshCart();

      // Redirect to Order Confirmation Success page
      router.push(`/checkout/success/${data.orderNumber}`);
    } catch (err: any) {
      console.error('Checkout error:', err);
      triggerValidationError(undefined, err?.message || 'Network error while placing order.');
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
              <label htmlFor="checkout-email" className="block text-[11px] font-semibold text-muted-foreground">
                {isEmailRequired ? 'Email Address *' : 'Email Address (Optional)'}
              </label>
              <input
                id="checkout-email"
                type="email"
                required={isEmailRequired}
                aria-required={isEmailRequired ? 'true' : undefined}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isEmailRequired ? 'name@example.com' : 'name@example.com (optional)'}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[10px] text-muted-foreground">
                {isEmailRequired
                  ? 'Order receipts and dispatch updates will be sent to this email.'
                  : whatsappEnabled
                  ? 'Order confirmation will be sent via WhatsApp. Enter email if you also want digital receipts.'
                  : 'Optional — enter your email to receive order updates and digital invoice.'}
              </p>
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

            {whatsappEnabled && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-emerald-800 dark:text-emerald-300 text-[11px] animate-in fade-in-50 duration-200">
                <MessageCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  🔒 <strong>WhatsApp Confirmation:</strong> We will send an instant order confirmation to your WhatsApp number.
                </span>
              </div>
            )}

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

            <div className="space-y-3">
              {/* Cash On Delivery */}
              {codSettings.enabled && (
                <label
                  className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                    isCodBlockedByLimit
                      ? 'border-border/60 bg-muted/20 opacity-60 cursor-not-allowed'
                      : paymentMethod === 'COD'
                      ? 'border-primary bg-primary/5 shadow-xs cursor-pointer'
                      : 'border-border bg-card hover:border-border/80 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      disabled={isCodBlockedByLimit}
                      checked={paymentMethod === 'COD'}
                      onChange={() => !isCodBlockedByLimit && setPaymentMethod('COD')}
                      className="text-primary focus:ring-primary h-4 w-4 disabled:opacity-50"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          {codSettings.title || 'Cash On Delivery (COD)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {isCodBlockedByLimit
                          ? `Orders above ${formatCurrency(codSettings.maxLimit)} require Bank Transfer prepayment.`
                          : codSettings.instructions || 'Pay in cash when your parcel arrives at your address.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {codSettings.fee > 0 && !isCodBlockedByLimit && (
                      <span className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold">
                        +{formatCurrency(codSettings.fee)} fee
                      </span>
                    )}
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                      {isCodBlockedByLimit ? 'Unavailable' : 'Standard'}
                    </span>
                  </div>
                </label>
              )}

              {/* Direct Bank Transfer (IBFT / Raast / Wallets) */}
              {bankSettings.enabled && (
                <div
                  className={`rounded-xl border-2 transition-all overflow-hidden ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <label className="flex items-center justify-between p-3.5 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="BANK_TRANSFER"
                        checked={paymentMethod === 'BANK_TRANSFER'}
                        onChange={() => setPaymentMethod('BANK_TRANSFER')}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">Direct Bank Transfer / IBFT</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Meezan, HBL, Raast, Sadapay, Nayapay & Mobile Banking.
                        </p>
                      </div>
                    </div>
                    {bankSettings.discountEnabled && bankSettings.discountValue > 0 ? (
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        {bankSettings.discountType === 'percentage'
                          ? `Save ${bankSettings.discountValue}%`
                          : `Save ${currency} ${bankSettings.discountValue}`}
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Prepaid
                      </span>
                    )}
                  </label>

                  {/* Expandable Bank Details Accordion */}
                  {paymentMethod === 'BANK_TRANSFER' && (
                    <div className="px-4 pb-4 pt-1 border-t border-border/60 space-y-3.5 bg-background/60">
                      {/* Optional Account Switcher Tabs */}
                      {Boolean(bankSettings.bankName2 && bankSettings.accountNumber2) && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedAccountSlot(1)}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                              selectedAccountSlot === 1
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {bankSettings.bankName || 'Account 1'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedAccountSlot(2)}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                              selectedAccountSlot === 2
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {bankSettings.bankName2 || 'Account 2'}
                          </button>
                        </div>
                      )}

                      {/* Active Account Details Box */}
                      {(() => {
                        const activeBank = selectedAccountSlot === 2 ? bankSettings.bankName2 : bankSettings.bankName;
                        const activeTitle = selectedAccountSlot === 2 ? bankSettings.accountTitle2 : bankSettings.accountTitle;
                        const activeNumber = selectedAccountSlot === 2 ? bankSettings.accountNumber2 : bankSettings.accountNumber;

                        return (
                          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-muted-foreground">Bank / Provider</span>
                              <span className="text-xs font-bold text-foreground">{activeBank || 'Bank Transfer'}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-muted-foreground">Account Title</span>
                              <span className="text-xs font-bold text-foreground">{activeTitle || 'Store Account'}</span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-border/60">
                              <div>
                                <span className="text-[11px] font-semibold text-muted-foreground block">Account # / IBAN</span>
                                <span className="text-xs font-mono font-extrabold text-foreground tracking-wider select-all">
                                  {activeNumber}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyAccount(activeNumber)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-bold transition-colors active:scale-95"
                                title="Copy Account Number"
                              >
                                {copiedAccount ? (
                                  <>
                                    <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* WhatsApp Screenshot & Instructions Prompt */}
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Smartphone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>WhatsApp Screenshot Verification:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-90">
                          {bankSettings.instructions ||
                            'Transfer the order total to the account above. After placing the order, send your payment screenshot to our WhatsApp for immediate dispatch.'}
                        </p>
                      </div>

                      {bankTransferDiscount > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-semibold pt-0.5">
                          <Tag className="h-3.5 w-3.5 shrink-0" />
                          <span>You save {formatCurrency(bankTransferDiscount)} on this order with Direct Bank Transfer!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Fallback Banner if no payment methods are active */}
              {!codSettings.enabled && !bankSettings.enabled && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-bold">No payment methods currently active</p>
                  <p className="text-[11px] opacity-90">
                    Online checkout is temporarily paused. Please place your order directly through customer support on WhatsApp.
                  </p>
                </div>
              )}
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

              {couponDiscount > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Coupon Discount {appliedCoupon?.code ? `(${appliedCoupon.code})` : ''}</span>
                  <span>- {formatCurrency(couponDiscount)}</span>
                </div>
              )}

              {paymentMethod === 'BANK_TRANSFER' && bankTransferDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3 shrink-0" />
                    <span>Bank Transfer Discount</span>
                  </span>
                  <span>- {formatCurrency(bankTransferDiscount)}</span>
                </div>
              )}

              {appliedCodFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>COD Handling Surcharge</span>
                  <span className="font-semibold text-foreground">+ {formatCurrency(appliedCodFee)}</span>
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

            {/* Inline validation alert for mobile & desktop visibility */}
            {checkoutError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unable to place order</p>
                  <p className="mt-0.5">{checkoutError}</p>
                </div>
              </div>
            )}

            {/* Submit CTA */}
            {(() => {
              const hasValidMethod =
                (codSettings.enabled && !isCodBlockedByLimit) || bankSettings.enabled;

              return (
                <button
                  type="submit"
                  disabled={isSubmitting || !hasValidMethod}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg hover:bg-primary-hover transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Confirming Order...</span>
                    </>
                  ) : !hasValidMethod ? (
                    <span>No Payment Method Available</span>
                  ) : paymentMethod === 'BANK_TRANSFER' ? (
                    <span>Confirm Bank Transfer Order ({formatCurrency(grandTotal)})</span>
                  ) : (
                    <span>Place Order with Cash on Delivery ({formatCurrency(grandTotal)})</span>
                  )}
                </button>
              );
            })()}

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

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DiscountType } from '@prisma/client';
import { CouponSchema } from '@/lib/validation/coupon';
import {
  Percent,
  Coins,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar,
  Tag,
  ShieldAlert,
} from 'lucide-react';

interface CouponFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export function CouponForm({ initialData, isEditing = false }: CouponFormProps) {
  const router = useRouter();

  const [code, setCode] = useState(initialData?.code || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [discountType, setDiscountType] = useState<DiscountType>(
    initialData?.discountType || DiscountType.PERCENTAGE
  );
  const [discountValue, setDiscountValue] = useState(
    initialData?.discountValue !== undefined ? initialData.discountValue.toString() : '10'
  );
  const [minOrderAmount, setMinOrderAmount] = useState(
    initialData?.minOrderAmount !== undefined && initialData?.minOrderAmount !== null
      ? initialData.minOrderAmount.toString()
      : ''
  );
  const [maxUses, setMaxUses] = useState(
    initialData?.maxUses !== undefined && initialData?.maxUses !== null
      ? initialData.maxUses.toString()
      : ''
  );
  const [startsAt, setStartsAt] = useState(
    initialData?.startsAt ? new Date(initialData.startsAt).toISOString().slice(0, 16) : ''
  );
  const [expiresAt, setExpiresAt] = useState(
    initialData?.expiresAt ? new Date(initialData.expiresAt).toISOString().slice(0, 16) : ''
  );
  const [isActive, setIsActive] = useState(
    initialData?.isActive !== undefined ? initialData.isActive : true
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const usedCount = initialData?.usedCount || 0;
  const isValueLocked = isEditing && usedCount > 0;

  const handleCodeChange = (val: string) => {
    // Auto-uppercase and strip unallowed characters
    const clean = val.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    setCode(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const payload = {
      code,
      description: description || undefined,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : undefined,
      maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive,
    };

    const parsed = CouponSchema.safeParse(payload);
    if (!parsed.success) {
      const firstErr = parsed.error.errors[0]?.message || 'Validation failed';
      setErrorMessage(firstErr);
      setSubmitting(false);
      return;
    }

    try {
      const endpoint = isEditing ? `/api/admin/coupons/${initialData.id}` : '/api/admin/coupons';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save coupon');
      }

      router.push('/admin/coupons');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Used Coupon Lock Notice */}
      {isValueLocked && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div className="space-y-1">
            <span className="font-bold block">Historical Order Protection Active</span>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              This coupon has already been redeemed in <strong>{usedCount}</strong> order(s). The discount type and value are locked to protect the financial integrity of historical order records. All other limits and scheduling remain editable.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Coupon Identity */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Coupon Information</h2>

            {/* Code */}
            <div className="space-y-1.5">
              <label htmlFor="coupon-code" className="block text-xs font-semibold text-foreground">
                Coupon Code *
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="coupon-code"
                  type="text"
                  required
                  aria-required="true"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="e.g. SUMMER20, WELCOME500"
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Customers enter this exact code during checkout. Automatically converted to uppercase.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="coupon-desc" className="block text-xs font-semibold text-foreground">
                Internal Description / Campaign Notes
              </label>
              <textarea
                id="coupon-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. VIP summer launch promotion for newsletter subscribers"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Discount Configuration Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Discount Value</h2>
                <p className="text-[11px] text-muted-foreground">Specify the percentage or fixed amount deducted</p>
              </div>

              {isValueLocked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Locked
                </span>
              )}
            </div>

            {/* Type Switcher */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isValueLocked}
                onClick={() => setDiscountType(DiscountType.PERCENTAGE)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  discountType === DiscountType.PERCENTAGE
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/40'
                } ${isValueLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Percent className="h-5 w-5 text-primary" />
                <div>
                  <span className="text-xs font-bold text-foreground block">Percentage Discount</span>
                  <span className="text-[11px] text-muted-foreground">Deducts 1%–100% from cart</span>
                </div>
              </button>

              <button
                type="button"
                disabled={isValueLocked}
                onClick={() => setDiscountType(DiscountType.FIXED)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  discountType === DiscountType.FIXED
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'border-border bg-card hover:bg-muted/40'
                } ${isValueLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Coins className="h-5 w-5 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold text-foreground block">Fixed Amount</span>
                  <span className="text-[11px] text-muted-foreground">Deducts flat PKR amount</span>
                </div>
              </button>
            </div>

            {/* Discount Value Input */}
            <div className="space-y-1.5">
              <label htmlFor="coupon-value" className="block text-xs font-semibold text-foreground">
                {discountType === DiscountType.PERCENTAGE ? 'Discount Percentage (%) *' : 'Discount Amount (PKR) *'}
              </label>
              <div className="relative">
                <input
                  id="coupon-value"
                  type="number"
                  step="any"
                  required
                  disabled={isValueLocked}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === DiscountType.PERCENTAGE ? '20' : '500'}
                  className={`w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    isValueLocked ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  {discountType === DiscountType.PERCENTAGE ? '%' : 'PKR'}
                </span>
              </div>
            </div>
          </div>

          {/* Usage Limits & Restrictions Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Usage Restrictions</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Min Order Amount */}
              <div className="space-y-1.5">
                <label htmlFor="coupon-min-order" className="block text-xs font-semibold text-foreground">
                  Minimum Order Amount (PKR)
                </label>
                <input
                  id="coupon-min-order"
                  type="number"
                  step="any"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  placeholder="0 (No minimum)"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground">Applies only if cart subtotal reaches this value</p>
              </div>

              {/* Max Uses */}
              <div className="space-y-1.5">
                <label htmlFor="coupon-max-uses" className="block text-xs font-semibold text-foreground">
                  Maximum Total Uses
                </label>
                <input
                  id="coupon-max-uses"
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  {isEditing ? `Currently redeemed: ${usedCount} times` : 'Leave blank for unlimited redemptions'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Scheduling & Controls */}
        <div className="space-y-6">
          {/* Status Toggle Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground">Status & Controls</h2>

            {/* Active Toggle */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-xs font-bold text-foreground block">Active Status</span>
                <span className="text-[11px] text-muted-foreground">Allow customers to apply code</span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
            </div>

            {/* Live Redemption Metric */}
            {isEditing && (
              <div className="pt-2 text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Total Redemptions:</span>
                  <span>{usedCount} {maxUses ? `/ ${maxUses}` : ''}</span>
                </div>
                {maxUses && (
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (usedCount / parseInt(maxUses, 10)) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Validity Timeline Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Validity Dates</span>
            </div>

            {/* Starts At */}
            <div className="space-y-1.5">
              <label htmlFor="coupon-starts-at" className="block text-xs font-semibold text-foreground">
                Start Date (Optional)
              </label>
              <input
                id="coupon-starts-at"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            {/* Expires At */}
            <div className="space-y-1.5">
              <label htmlFor="coupon-expires-at" className="block text-xs font-semibold text-foreground">
                Expiration Date (Optional)
              </label>
              <input
                id="coupon-expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground">Leave blank if this coupon never expires</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isEditing ? 'Save Coupon Changes' : 'Create Coupon'}</span>
            </button>

            <Link
              href="/admin/coupons"
              className="flex items-center justify-center rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}

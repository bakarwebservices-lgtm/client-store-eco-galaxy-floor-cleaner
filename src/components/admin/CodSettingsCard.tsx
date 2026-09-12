'use client';

import React from 'react';
import {
  Banknote,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  PackageCheck,
  Receipt,
  Info,
} from 'lucide-react';
import type { AllSettingsInput } from '@/lib/validation/settings';
import { formatCurrency } from '@/lib/format';

interface CodSettingsCardProps {
  settings: AllSettingsInput;
  handleChange: (field: keyof AllSettingsInput, value: any) => void;
  errors: Record<string, string>;
}

export function CodSettingsCard({
  settings,
  handleChange,
  errors,
}: CodSettingsCardProps) {
  const isEnabled = settings['payment.cod_enabled'] !== false;
  const codTitle = settings['payment.cod_title'] || 'Cash on Delivery (COD)';
  const codInstructions =
    settings['payment.cod_instructions'] ||
    'Pay with cash upon package delivery at your doorstep.';
  const codFee = Number(settings['payment.cod_fee']) || 0;
  const codMaxLimit = Number(settings['payment.cod_max_limit']) || 0;
  const currency = settings['store.currency'] || 'PKR';

  return (
    <div className="max-w-3xl space-y-6 animate-in fade-in-50 duration-200">
      {/* Master COD Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
        {/* Header & Toggle */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Banknote className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-foreground">Cash on Delivery (COD)</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Collect payment in cash from the customer upon package delivery at their doorstep via your courier service.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => handleChange('payment.cod_enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {!isEnabled ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center space-y-2">
            <Banknote className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
            <p className="text-xs font-semibold text-foreground">Cash on Delivery is Disabled</p>
            <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
              Customers will not see the Cash on Delivery option at checkout. To allow customers to place orders, ensure Direct Bank Transfer is enabled.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-1">
            {/* Display Title */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Payment Option Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={codTitle}
                onChange={(e) => handleChange('payment.cod_title', e.target.value)}
                placeholder="Cash on Delivery (COD)"
                className={`w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 ${
                  errors['payment.cod_title']
                    ? 'border-destructive focus:ring-destructive'
                    : 'border-border focus:ring-primary'
                }`}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                The label shown on the checkout page payment method selector.
              </p>
              {errors['payment.cod_title'] && (
                <p className="mt-1 text-[11px] text-destructive">{errors['payment.cod_title']}</p>
              )}
            </div>

            {/* Delivery Instructions */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Customer Delivery Instructions
              </label>
              <textarea
                rows={2}
                value={codInstructions}
                onChange={(e) => handleChange('payment.cod_instructions', e.target.value)}
                placeholder="Pay with cash upon package delivery at your doorstep."
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Short explanatory text shown under the Cash on Delivery option at checkout.
              </p>
            </div>

            {/* Fees & Threshold Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-border">
              {/* Optional COD Handling Fee */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  COD Handling Surcharge ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-muted-foreground font-semibold">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={codFee}
                    onChange={(e) => handleChange('payment.cod_fee', Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full rounded-lg border border-border bg-background pl-14 pr-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Optional extra fee added when COD is selected (e.g. 50 or 100 PKR) to cover courier cash collection charges. Leave 0 for free COD.
                </p>
              </div>

              {/* Maximum Order Value for COD */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Maximum COD Order Limit ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-muted-foreground font-semibold">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={codMaxLimit}
                    onChange={(e) => handleChange('payment.cod_max_limit', Math.max(0, Number(e.target.value)))}
                    placeholder="0 (Unlimited)"
                    className="w-full rounded-lg border border-border bg-background pl-14 pr-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Orders exceeding this amount cannot use COD and must pay via Bank Transfer to prevent fake high-value order losses. Enter 0 for no limit.
                </p>
              </div>
            </div>

            {/* Live Checkout Preview */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <PackageCheck className="h-4 w-4 text-primary" />
                <span>Storefront Checkout Preview:</span>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    checked
                    readOnly
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground">{codTitle}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{codInstructions}</p>
                    {codFee > 0 && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        + {formatCurrency(codFee, currency)} COD handling fee
                      </span>
                    )}
                  </div>
                </div>
                {codMaxLimit > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    Max: {formatCurrency(codMaxLimit, currency)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

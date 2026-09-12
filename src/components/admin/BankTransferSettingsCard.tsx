'use client';

import React from 'react';
import {
  Landmark,
  Percent,
  Copy,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import type { AllSettingsInput } from '@/lib/validation/settings';

interface BankTransferSettingsCardProps {
  settings: AllSettingsInput;
  handleChange: (field: keyof AllSettingsInput, value: any) => void;
  errors: Record<string, string>;
}

export function BankTransferSettingsCard({
  settings,
  handleChange,
  errors,
}: BankTransferSettingsCardProps) {
  const isEnabled = Boolean(settings['payment.bank_transfer_enabled']);
  const discountEnabled = Boolean(settings['payment.bank_discount_enabled']);
  const discountType = settings['payment.bank_discount_type'] || 'percentage';
  const discountValue = Number(settings['payment.bank_discount_value']) || 0;
  const currency = settings['store.currency'] || 'PKR';

  return (
    <div className="max-w-3xl space-y-6 animate-in fade-in-50 duration-200">
      {/* Master Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
        {/* Header & Toggle */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Landmark className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-foreground">Direct Bank Transfer (IBFT / Raast)</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Accept manual bank transfers, Raast, Sadapay, Nayapay, and mobile wallets. Customer transfers funds and sends payment receipt via WhatsApp.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => handleChange('payment.bank_transfer_enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {!isEnabled ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center space-y-2">
            <Landmark className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
            <p className="text-xs font-semibold text-foreground">Direct Bank Transfer is Disabled</p>
            <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
              Toggle the switch above to configure your bank accounts, customize payment instructions, and activate a prepayment discount incentive.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-1">
            {/* Account Slot 1: Primary Bank */}
            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Primary Bank Account
                  </span>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Primary
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Bank / Institution Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings['payment.bank_name'] || ''}
                    onChange={(e) => handleChange('payment.bank_name', e.target.value)}
                    placeholder="e.g. Meezan Bank, HBL, Bank Alfalah"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {errors['payment.bank_name'] && (
                    <p className="mt-1 text-[11px] text-destructive">{errors['payment.bank_name']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Account Title / Beneficiary Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings['payment.account_title'] || ''}
                    onChange={(e) => handleChange('payment.account_title', e.target.value)}
                    placeholder="e.g. Ahmad Khan or Store Pvt Ltd"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {errors['payment.account_title'] && (
                    <p className="mt-1 text-[11px] text-destructive">{errors['payment.account_title']}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Account Number / IBAN <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings['payment.account_number'] || ''}
                    onChange={(e) => handleChange('payment.account_number', e.target.value)}
                    placeholder="e.g. PK00MEZN0001234567890101 or 010203040506"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Customers can copy this account number or IBAN with a single click at checkout.
                  </p>
                  {errors['payment.account_number'] && (
                    <p className="mt-1 text-[11px] text-destructive">{errors['payment.account_number']}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Slot 2: Secondary / Mobile Wallet (Optional) */}
            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Secondary Account / Wallet (Optional)
                  </span>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Optional (Sadapay / Nayapay / Raast)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Provider / Wallet Name
                  </label>
                  <input
                    type="text"
                    value={settings['payment.bank_name_2'] || ''}
                    onChange={(e) => handleChange('payment.bank_name_2', e.target.value)}
                    placeholder="e.g. Sadapay, Nayapay, Raast, JazzCash"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Account Title
                  </label>
                  <input
                    type="text"
                    value={settings['payment.account_title_2'] || ''}
                    onChange={(e) => handleChange('payment.account_title_2', e.target.value)}
                    placeholder="e.g. Ahmad Khan"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Account / Mobile / IBAN Number
                  </label>
                  <input
                    type="text"
                    value={settings['payment.account_number_2'] || ''}
                    onChange={(e) => handleChange('payment.account_number_2', e.target.value)}
                    placeholder="e.g. 03001234567 or PK00SADA000..."
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    If provided, customers can pick either account from a tabbed switcher at checkout.
                  </p>
                </div>
              </div>
            </div>

            {/* Prepayment Incentive Discount */}
            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Prepayment Incentive Discount
                    </h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Incentivize customers to pay via Bank Transfer over COD by offering an instant discount on their order total.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={discountEnabled}
                    onChange={(e) => handleChange('payment.bank_discount_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {discountEnabled && (
                <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Discount Calculation Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleChange('payment.bank_discount_type', 'percentage')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                            discountType === 'percentage'
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <Percent className="h-3.5 w-3.5" />
                          <span>Percentage (%)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChange('payment.bank_discount_type', 'fixed')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                            discountType === 'fixed'
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Fixed ({currency})</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Discount Value ({discountType === 'percentage' ? '%' : currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={discountType === 'percentage' ? '100' : undefined}
                        step={discountType === 'percentage' ? '0.5' : '10'}
                        value={discountValue}
                        onChange={(e) => handleChange('payment.bank_discount_value', Number(e.target.value))}
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {discountType === 'percentage'
                          ? `e.g. 5% discount deduction on subtotal.`
                          : `e.g. Flat ${currency} ${discountValue || 200} off.`}
                      </p>
                    </div>
                  </div>

                  {/* Incentive Badge Preview */}
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold">Storefront Badge Preview:</p>
                      <p className="mt-0.5 text-[11px]">
                        Checkout displays: <span className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-300">
                          ✨ {discountType === 'percentage' ? `${discountValue}% OFF` : `Save ${currency} ${discountValue}`} on Bank Transfer
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Instruction Note & Screenshot Prompt */}
            <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                  Payment Instruction Note
                </label>
              </div>
              <textarea
                rows={3}
                value={settings['payment.bank_instructions'] || ''}
                onChange={(e) => handleChange('payment.bank_instructions', e.target.value)}
                placeholder="Instructions shown to customer below bank details..."
                className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground">
                Displayed directly beneath the bank account details at checkout and on the order confirmation screen.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

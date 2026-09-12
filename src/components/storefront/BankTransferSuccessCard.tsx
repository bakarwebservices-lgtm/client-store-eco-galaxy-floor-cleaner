'use client';

import React, { useState } from 'react';
import { Landmark, Copy, CheckCheck, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface BankTransferSuccessCardProps {
  orderNumber: string;
  totalPrice: number;
  currency: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  bankName2?: string;
  accountTitle2?: string;
  accountNumber2?: string;
  instructions?: string;
  whatsappUrl: string | null;
  storeName: string;
}

export function BankTransferSuccessCard({
  orderNumber,
  totalPrice,
  currency,
  bankName,
  accountTitle,
  accountNumber,
  bankName2,
  accountTitle2,
  accountNumber2,
  instructions,
  whatsappUrl,
  storeName,
}: BankTransferSuccessCardProps) {
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [copied, setCopied] = useState(false);

  const activeBank = activeSlot === 2 ? bankName2 : bankName;
  const activeTitle = activeSlot === 2 ? accountTitle2 : accountTitle;
  const activeNumber = activeSlot === 2 ? accountNumber2 : accountNumber;

  const handleCopy = (text: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-7 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shrink-0 mt-0.5">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Complete Your Bank Transfer — {formatCurrency(totalPrice, currency)}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Please transfer the amount below and send your payment screenshot on WhatsApp. Your order will be dispatched immediately upon verification.
          </p>
        </div>
      </div>

      {/* Account Switcher if 2 accounts exist */}
      {Boolean(bankName2 && accountNumber2) && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveSlot(1)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeSlot === 1
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {bankName || 'Account 1'}
          </button>
          <button
            type="button"
            onClick={() => setActiveSlot(2)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeSlot === 2
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {bankName2 || 'Account 2'}
          </button>
        </div>
      )}

      {/* Bank Account Details Box */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Bank / Provider</span>
            <span className="font-bold text-foreground">{activeBank || 'Bank Account'}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Account Title</span>
            <span className="font-bold text-foreground">{activeTitle || storeName}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block">Account Number / IBAN</span>
            <span className="font-mono text-sm sm:text-base font-extrabold text-foreground tracking-wider select-all">
              {activeNumber}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleCopy(activeNumber || '')}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3.5 py-2 text-xs font-bold transition-all active:scale-95 shrink-0"
          >
            {copied ? (
              <>
                <CheckCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Account #</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Instructions Note */}
      {instructions && (
        <p className="text-xs text-muted-foreground italic bg-muted/30 p-3 rounded-lg border border-border/60">
          ℹ️ {instructions}
        </p>
      )}

      {/* 1-Tap WhatsApp Screenshot CTA */}
      {whatsappUrl && (
        <div className="pt-1">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-[0.99]"
          >
            <MessageSquare className="h-4 w-4" />
            <span>📲 Send Payment Screenshot on WhatsApp</span>
          </a>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Order #{orderNumber} is reserved for 48 hours. Once screenshot is received, tracking ID will be sent to your WhatsApp.
          </p>
        </div>
      )}
    </div>
  );
}

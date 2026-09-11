'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  Check,
  Copy,
  Send,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Clock,
  CheckCircle2,
  PhoneCall,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { safeFetch } from '@/lib/apiClient';

interface WhatsAppAutomationCardProps {
  settings: Record<string, any>;
  handleChange: (key: any, value: any) => void;
}

export function WhatsAppAutomationCard({ settings, handleChange }: WhatsAppAutomationCardProps) {
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Test Ping State
  const [testPhone, setTestPhone] = useState('');
  const [pingLoading, setPingLoading] = useState(false);
  const [pingMsg, setPingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Webhook URL derivation
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://yourstore.com';
  const webhookUrl = `${appOrigin}/api/webhooks/whatsapp`;
  const verifyToken = settings['whatsapp.webhook_verify_token'] || 'wh_sec_verify_token';

  const isEnabled = Boolean(settings['whatsapp.order_confirmation_enabled']);
  const autoBookMode = settings['courier.auto_book_mode'] || 'THRESHOLD';

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendTestPing = async () => {
    if (!testPhone.trim()) {
      setPingMsg({ type: 'error', text: 'Please enter a mobile number (e.g. 0300 1234567) to test.' });
      return;
    }
    setPingLoading(true);
    setPingMsg(null);
    try {
      const { ok, data, error } = await safeFetch<any>('/api/admin/whatsapp/test-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone.trim() }),
      });

      if (!ok) {
        throw new Error(error || 'Failed to dispatch test WhatsApp message.');
      }

      setPingMsg({
        type: 'success',
        text: `Ping sent! Check WhatsApp on ${testPhone.trim()}. (Message ID: ${data.messageId || 'Delivered'})`,
      });
    } catch (err: any) {
      setPingMsg({ type: 'error', text: err.message || 'Connection failed' });
    } finally {
      setPingLoading(false);
    }
  };

  const templateText = `Hi {{1}}, thank you for placing your order #{{2}} with {{3}}! Total (COD): Rs. {{4}} for {{5}} items. Address: {{6}}. Please tap below to confirm so we can dispatch your parcel right away!`;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
      {/* Header with Master Toggle */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <MessageSquare className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Meta WhatsApp Order Confirmation & PostEx Auto-Booking
              </h2>
              <p className="text-xs text-muted-foreground">
                Eliminates fake COD orders with 1-tap customer WhatsApp confirmation & automated courier booking.
              </p>
            </div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => handleChange('whatsapp.order_confirmation_enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      {isEnabled && (
        <div className="space-y-6">
          {/* Card 1: Meta Cloud API Credentials */}
          <div className="rounded-lg border border-border/80 bg-background/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>1. Meta WhatsApp Cloud API Connection</span>
              </h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                Direct Meta Graph API
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Phone Number ID <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={settings['whatsapp.business_phone_number_id'] || ''}
                  onChange={(e) => handleChange('whatsapp.business_phone_number_id', e.target.value.trim())}
                  placeholder="e.g. 109823475928374"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">From Meta Developer Portal &rarr; WhatsApp &rarr; API Setup</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Meta App Secret (for Webhook Validation)
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={settings['whatsapp.meta_app_secret'] || ''}
                    onChange={(e) => handleChange('whatsapp.meta_app_secret', e.target.value.trim())}
                    placeholder="e.g. 3a8f9c1b2..."
                    className="w-full rounded-lg border border-border bg-background pl-3 pr-9 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">App Basic Settings &rarr; App Secret (Secures incoming webhooks)</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                System User Permanent Access Token <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={settings['whatsapp.system_access_token'] || ''}
                  onChange={(e) => handleChange('whatsapp.system_access_token', e.target.value.trim())}
                  placeholder="EAAG..."
                  className="w-full rounded-lg border border-border bg-background pl-3 pr-9 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Never expires. Generate via Business Manager &rarr; System Users &rarr; Generate Token</p>
            </div>

            {/* Read-Only Webhook Handshake Info for Meta */}
            <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground">Copy into Meta Developer Portal &rarr; Webhooks:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Callback URL:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="w-full rounded border border-border bg-background px-2.5 py-1 text-[11px] font-mono text-foreground select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(webhookUrl, 'url')}
                      className="inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-secondary/80"
                    >
                      {copiedField === 'url' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedField === 'url' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Verify Token:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={verifyToken}
                      className="w-full rounded border border-border bg-background px-2.5 py-1 text-[11px] font-mono text-foreground select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(verifyToken, 'token')}
                      className="inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-secondary/80"
                    >
                      {copiedField === 'token' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedField === 'token' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Connection Ping Box */}
            <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 w-full sm:w-auto">
                <span className="text-xs font-semibold text-foreground block">Test Connection Ping</span>
                <p className="text-[11px] text-muted-foreground">Send an instant test WhatsApp ping to verify your Meta keys work.</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="0300 1234567"
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary w-36"
                />
                <button
                  type="button"
                  onClick={handleSendTestPing}
                  disabled={pingLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {pingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>Test Ping</span>
                </button>
              </div>
            </div>
            {pingMsg && (
              <p
                className={`text-xs ${
                  pingMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                }`}
              >
                {pingMsg.text}
              </p>
            )}
          </div>

          {/* Card 2: PostEx Auto-Booking Rules (The 3 Modes) */}
          <div className="rounded-lg border border-border/80 bg-background/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>2. PostEx Fulfillment & Dispatch Rules</span>
              </h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                PostEx Integrated
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Choose how orders are booked with PostEx once the customer taps &quot;Confirm Order&quot; on WhatsApp:
            </p>

            <div className="grid grid-cols-1 gap-3">
              {/* Mode 1: Full Auto */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                  autoBookMode === 'FULL_AUTO'
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                }`}
              >
                <input
                  type="radio"
                  name="autoBookMode"
                  value="FULL_AUTO"
                  checked={autoBookMode === 'FULL_AUTO'}
                  onChange={() => handleChange('courier.auto_book_mode', 'FULL_AUTO')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Mode 1: Full Auto (Zero-Touch)</span>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                      Fastest Dispatch
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Instantly book with PostEx the exact second the customer confirms. Tracking AWB is generated and immediately sent back to the customer on WhatsApp.
                  </p>
                </div>
              </label>

              {/* Mode 2: Manual Review */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                  autoBookMode === 'MANUAL'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                }`}
              >
                <input
                  type="radio"
                  name="autoBookMode"
                  value="MANUAL"
                  checked={autoBookMode === 'MANUAL'}
                  onChange={() => handleChange('courier.auto_book_mode', 'MANUAL')}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Mode 2: Manual Review (High Caution)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    WhatsApp confirmation marks the order with a green &quot;Confirmed by Customer&quot; badge, but allows you to review the address and click &quot;⚡ Book PostEx&quot; manually from the Orders dashboard.
                  </p>
                </div>
              </label>

              {/* Mode 3: Smart Threshold */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                  autoBookMode === 'THRESHOLD'
                    ? 'border-amber-500 bg-amber-500/5'
                    : 'border-border bg-card hover:border-muted-foreground/30'
                }`}
              >
                <input
                  type="radio"
                  name="autoBookMode"
                  value="THRESHOLD"
                  checked={autoBookMode === 'THRESHOLD'}
                  onChange={() => handleChange('courier.auto_book_mode', 'THRESHOLD')}
                  className="mt-0.5 text-amber-500 focus:ring-amber-500"
                />
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Mode 3: Smart Threshold (Hybrid - Recommended)</span>
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                        Balanced Safety
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Auto-book low-value orders automatically, but queue high-value orders for manual review to prevent expensive return losses.
                  </p>

                  {autoBookMode === 'THRESHOLD' && (
                    <div className="mt-3 pt-3 border-t border-border/70 flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">Auto-book if order total is under:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground font-semibold">Rs.</span>
                        <input
                          type="number"
                          value={settings['courier.auto_book_threshold'] ?? 5000}
                          onChange={(e) => handleChange('courier.auto_book_threshold', Number(e.target.value))}
                          className="w-24 rounded border border-border bg-background px-2 py-1 text-xs text-foreground font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* 24h Reminder Toggle */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-foreground block">
                  ⏰ 24-Hour Automated Gentle Reminder
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Sends a polite WhatsApp reminder 24 hours after order placement if the customer has not confirmed yet.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings['whatsapp.auto_reminder_24h'] !== false}
                  onChange={(e) => handleChange('whatsapp.auto_reminder_24h', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>

          {/* Card 3: Pre-Approved Template Reference */}
          <div className="rounded-lg border border-border/80 bg-background/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                <span>3. Message Template Blueprint</span>
              </h3>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                48h Hard Expiry Rule Active
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Standard format sent to customers with interactive buttons:
            </p>

            <div className="rounded-md border border-border bg-muted/30 p-3 font-mono text-[11px] text-foreground leading-relaxed">
              {templateText}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted-foreground">
                Template Name: <code className="text-primary font-bold">order_confirmation_v1</code>
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(templateText, 'template')}
                className="inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                {copiedField === 'template' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedField === 'template' ? 'Copied' : 'Copy Template Text'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

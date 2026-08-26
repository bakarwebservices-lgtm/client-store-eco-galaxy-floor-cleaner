'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  Globe,
  Radio,
  Save,
} from 'lucide-react';
import { safeFetch } from '@/lib/apiClient';

interface CourierAccountItem {
  id: string;
  courierCode: string;
  accountTitle: string;
  isActive: boolean;
  isDefault: boolean;
  maskedIdentifier: string;
  webhookSecret: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AvailableCourier {
  code: string;
  displayName: string;
  supportsWebhooks: boolean;
  supportsLabelGeneration: boolean;
}

export function CourierSettingsTab() {
  const [accounts, setAccounts] = useState<CourierAccountItem[]>([]);
  const [availableCouriers, setAvailableCouriers] = useState<AvailableCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Customer Tracking URL State
  const [customTrackingUrl, setCustomTrackingUrl] = useState('');
  const [savingTrackingUrl, setSavingTrackingUrl] = useState(false);

  // Form state
  const [selectedCourier, setSelectedCourier] = useState('POSTEX');
  const [accountTitle, setAccountTitle] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [pickupAddressCode, setPickupAddressCode] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('production');
  const [isDefault, setIsDefault] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [couriersRes, settingsRes] = await Promise.all([
        safeFetch<any>('/api/admin/couriers'),
        safeFetch<any>('/api/admin/settings'),
      ]);

      if (couriersRes.ok && couriersRes.data) {
        setAccounts(couriersRes.data.accounts || []);
        setAvailableCouriers(couriersRes.data.availableCouriers || []);
      } else {
        setMsg({ type: 'error', text: couriersRes.error || 'Failed to load courier configurations.' });
      }

      if (settingsRes.ok && settingsRes.data?.settings) {
        setCustomTrackingUrl(settingsRes.data.settings['tracking.custom_url'] || '');
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Network error fetching couriers.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrackingUrl = async () => {
    setSavingTrackingUrl(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'tracking.custom_url': customTrackingUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg({ type: 'success', text: 'Customer tracking link updated successfully.' });
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to update tracking URL.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Failed to save tracking URL.' });
    } finally {
      setSavingTrackingUrl(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setSelectedCourier(availableCouriers[0]?.code || 'POSTEX');
    setAccountTitle('');
    setApiToken('');
    setPickupAddressCode('');
    setEnvironment('production');
    setIsDefault(accounts.length === 0);
    setShowModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountTitle.trim()) {
      setMsg({ type: 'error', text: 'Account title is required.' });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const payload: any = {
        courierCode: selectedCourier,
        accountTitle: accountTitle.trim(),
        isDefault,
        isActive: true,
        environment,
        apiToken: apiToken.trim(),
        pickupAddressCode: pickupAddressCode.trim() || undefined,
      };

      if (editingId) {
        payload.id = editingId;
      }

      const res = await fetch('/api/admin/couriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save courier account.');

      setMsg({ type: 'success', text: `Courier account "${accountTitle}" saved successfully.` });
      setShowModal(false);
      await fetchAccounts();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove or deactivate courier account "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/couriers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete courier account.');

      setMsg({ type: 'success', text: `Courier account "${title}" removed.` });
      await fetchAccounts();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-4 text-xs font-medium ${
            msg.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Customer Tracking Portal Link */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">Customer Storefront Tracking URL</h3>
          </div>
          <button
            type="button"
            onClick={handleSaveTrackingUrl}
            disabled={savingTrackingUrl}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {savingTrackingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save Tracking Link</span>
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter your courier&apos;s public tracking page URL (e.g. <code className="font-mono text-primary">https://postex.pk/tracking</code>, <code className="font-mono text-primary">https://trax.pk/tracking</code>, or <code className="font-mono text-primary">https://www.tcsexpress.com/track</code>). When customers click <strong>&quot;Track&quot;</strong> in the header or <strong>&quot;Track Order&quot;</strong> in the footer, they will be redirected straight to this link.
        </p>
        <div className="relative">
          <input
            type="url"
            value={customTrackingUrl}
            onChange={(e) => setCustomTrackingUrl(e.target.value)}
            placeholder="https://postex.pk/tracking"
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Courier Manager Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Integrated Logistics & Courier Accounts</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure business API credentials for PostEx and other delivery partners. Credentials are encrypted at rest via AES-256-GCM.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Courier Account</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading courier configurations...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Truck className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No active courier accounts configured. Add a PostEx API token to start dispatching orders with automated consignment booking and tracking.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Connect PostEx Account</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className={`rounded-xl border p-5 space-y-3 transition-all ${
                  acc.isDefault
                    ? 'border-primary/50 bg-primary/[0.02] shadow-sm'
                    : 'border-border bg-card hover:border-border-hover'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{acc.accountTitle}</span>
                      {acc.isDefault && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded bg-muted text-[10px] font-mono font-medium text-muted-foreground">
                      Provider: {acc.courierCode}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(acc.id, acc.accountTitle)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-colors"
                    title="Remove Account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-success" />
                    <span className="font-mono">Token: {acc.maskedIdentifier}</span>
                  </div>
                  <span className="text-[10px]">
                    Status: <strong className={acc.isActive ? 'text-success' : 'text-muted-foreground'}>{acc.isActive ? 'Active' : 'Disabled'}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Configuration Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {editingId ? 'Edit Courier Account' : 'Connect Courier Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              {/* Courier Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Courier Provider <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedCourier}
                  onChange={(e) => setSelectedCourier(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  {availableCouriers.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.displayName} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Title */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Account Display Label <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                  placeholder="e.g. PostEx Primary Lahore Warehouse"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* API Token / Key */}
              {selectedCourier !== 'MANUAL' && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">
                        API Token / Merchant Key <span className="text-destructive">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3 text-primary" />}
                        <span>{showToken ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showToken ? 'text' : 'password'}
                      required={!editingId}
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      placeholder={editingId ? '•••••••••••• (Leave blank to keep existing)' : 'Paste API Token provided by courier'}
                      className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Stored securely with AES-256-GCM authenticated encryption at rest.
                    </p>
                  </div>

                  {/* Pickup Address Code */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Default Pickup Address Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={pickupAddressCode}
                      onChange={(e) => setPickupAddressCode(e.target.value)}
                      placeholder="e.g. 001 or WAREHOUSE-LHR"
                      className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none font-mono"
                    />
                  </div>

                  {/* Environment Switch */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      API Environment
                    </label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="environment"
                          value="production"
                          checked={environment === 'production'}
                          onChange={() => setEnvironment('production')}
                        />
                        <span>Live / Production</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="environment"
                          value="sandbox"
                          checked={environment === 'sandbox'}
                          onChange={() => setEnvironment('sandbox')}
                        />
                        <span>Sandbox / Staging</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Set as Default Switch */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefaultAccount"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="isDefaultAccount" className="text-xs font-medium text-foreground cursor-pointer">
                  Set as default courier for order dispatches
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Courier Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

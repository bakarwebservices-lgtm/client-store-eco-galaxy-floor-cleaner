'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Building2,
  Phone,
  Palette,
  Truck,
  BarChart3,
  Share2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Trash2,
  Info,
  RefreshCw,
  Sliders,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { MediaUploadModal } from '@/components/admin/MediaUploadModal';
import { CourierSettingsTab } from '@/components/admin/CourierSettingsTab';
import {
  allSettingsSchema,
  DEFAULT_SETTINGS,
  FONT_FAMILIES,
  HEX_COLOR_REGEX,
  type AllSettingsInput,
} from '@/lib/validation/settings';
import { safeFetch } from '@/lib/apiClient';

type SettingsTab = 'identity' | 'contact' | 'theme' | 'shipping' | 'couriers' | 'tracking' | 'social';

const TABS: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'identity', label: 'Store Identity', icon: Building2 },
  { id: 'contact', label: 'Contact Details', icon: Phone },
  { id: 'theme', label: 'Theme & Styling', icon: Palette },
  { id: 'shipping', label: 'Shipping & Taxes', icon: DollarSign },
  { id: 'couriers', label: 'Couriers & Logistics', icon: Truck },
  { id: 'tracking', label: 'Analytics & Pixels', icon: BarChart3 },
  { id: 'social', label: 'Social Channels', icon: Share2 },
];

const COMMON_CURRENCIES = [
  { code: 'PKR', label: 'PKR - Pakistani Rupee (Rs.)' },
  { code: 'USD', label: 'USD - US Dollar ($)' },
  { code: 'EUR', label: 'EUR - Euro (€)' },
  { code: 'GBP', label: 'GBP - British Pound (£)' },
  { code: 'CAD', label: 'CAD - Canadian Dollar (CA$)' },
  { code: 'AUD', label: 'AUD - Australian Dollar (A$)' },
  { code: 'AED', label: 'AED - UAE Dirham (AED)' },
  { code: 'SAR', label: 'SAR - Saudi Riyal (SAR)' },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('identity');
  const [settings, setSettings] = useState<AllSettingsInput>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  // Load current settings from API
  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const { ok, data, error } = await safeFetch<any>('/api/admin/settings');
        if (ok && data) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        } else {
          setErrorMessage(error || 'Failed to load store settings.');
        }
      } catch (err: any) {
        console.error('Error fetching settings:', err);
        setErrorMessage(err?.message || 'Network error while loading settings.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (key: keyof AllSettingsInput, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
    // Clear individual field error if set
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSave = async (sectionKeys?: (keyof AllSettingsInput)[]) => {
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);
    setErrors({});

    // Validate settings with Zod
    const validation = allSettingsSchema.safeParse(settings);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      setErrorMessage('Please correct the highlighted validation errors before saving.');
      setSaving(false);
      return;
    }

    try {
      // If saving specific section or all
      const payload = sectionKeys
        ? sectionKeys.reduce((acc, k) => ({ ...acc, [k]: settings[k] }), {})
        : settings;

      const { ok, data, error } = await safeFetch<any>('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (ok && data) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMessage(error || 'Failed to save store settings.');
      }
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setErrorMessage(err?.message || 'Network error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Loading store configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-semibold leading-tight">Store Settings</h1>
              <p className="text-xs text-muted-foreground">Branding, Currency, Themes & Integrations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 animate-fade-in">
                <CheckCircle2 className="h-4 w-4" />
                <span>Saved to database</span>
              </div>
            )}
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Banner Feedback */}
        {errorMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Horizontal Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-border pb-3 no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrorMessage(null);
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Store Identity */}
        {activeTab === 'identity' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="border-b border-border pb-3">
                  <h2 className="text-sm font-semibold text-foreground">General Store Information</h2>
                  <p className="text-xs text-muted-foreground">
                    Define the public name, tagline, logo, and primary operating currency.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Store Name */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Store Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings['store.name']}
                      onChange={(e) => handleChange('store.name', e.target.value)}
                      placeholder="e.g. Attireburg Luxury"
                      className={`w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 ${
                        errors['store.name']
                          ? 'border-destructive focus:ring-destructive'
                          : 'border-border focus:ring-primary'
                      }`}
                    />
                    {errors['store.name'] && (
                      <p className="mt-1 text-[11px] text-destructive">{errors['store.name']}</p>
                    )}
                  </div>

                  {/* Store Tagline */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Tagline / Slogan
                    </label>
                    <input
                      type="text"
                      value={settings['store.tagline'] || ''}
                      onChange={(e) => handleChange('store.tagline', e.target.value)}
                      placeholder="e.g. Handcrafted Precision & Timeless Jewelry"
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Currency & Country Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Store Base Currency <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={settings['store.currency']}
                        onChange={(e) => handleChange('store.currency', e.target.value)}
                        className={`w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 ${
                          errors['store.currency']
                            ? 'border-destructive focus:ring-destructive'
                            : 'border-border focus:ring-primary'
                        }`}
                      >
                        {COMMON_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      {errors['store.currency'] && (
                        <p className="mt-1 text-[11px] text-destructive">{errors['store.currency']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Default Country <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={settings['store.country']}
                        onChange={(e) => handleChange('store.country', e.target.value)}
                        placeholder="e.g. Pakistan, United States"
                        className={`w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 ${
                          errors['store.country']
                            ? 'border-destructive focus:ring-destructive'
                            : 'border-border focus:ring-primary'
                        }`}
                      />
                      {errors['store.country'] && (
                        <p className="mt-1 text-[11px] text-destructive">{errors['store.country']}</p>
                      )}
                    </div>
                  </div>

                  {/* Currency Behavior Notice */}
                  <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <div>
                      <span className="font-semibold text-foreground">Currency Behavior Note:</span> Changing your base
                      currency immediately changes storefront price displays and new checkouts. Existing completed orders
                      preserve their immutable historical currency recorded at time of purchase.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Logo Column */}
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="border-b border-border pb-3">
                  <h2 className="text-sm font-semibold text-foreground">Brand Logo</h2>
                  <p className="text-xs text-muted-foreground">Select or upload your store navbar & invoice logo.</p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-xl bg-muted/20">
                  {settings['store.logo_url'] ? (
                    <div className="space-y-3 w-full flex flex-col items-center">
                      <div className="relative h-20 w-48 rounded-lg overflow-hidden border border-border bg-card flex items-center justify-center p-2">
                        <Image
                          src={settings['store.logo_url']}
                          alt="Store Logo"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMediaModalOpen(true)}
                          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChange('store.logo_url', '')}
                          className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 py-4">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <p className="text-xs text-muted-foreground">No custom logo uploaded yet.</p>
                      <button
                        type="button"
                        onClick={() => setMediaModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Choose from Media Library</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Contact Details */}
        {activeTab === 'contact' && (
          <div className="max-w-3xl space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-sm font-semibold text-foreground">Customer Support & Location</h2>
                <p className="text-xs text-muted-foreground">
                  Shown on your Contact page, order receipts, and automated customer emails.
                </p>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Support Email Address <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    value={settings['store.email']}
                    onChange={(e) => handleChange('store.email', e.target.value)}
                    placeholder="support@example.com"
                    className={`w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 ${
                      errors['store.email']
                        ? 'border-destructive focus:ring-destructive'
                        : 'border-border focus:ring-primary'
                    }`}
                  />
                  {errors['store.email'] && (
                    <p className="mt-1 text-[11px] text-destructive">{errors['store.email']}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Support Phone Number <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings['store.phone']}
                    onChange={(e) => handleChange('store.phone', e.target.value)}
                    placeholder="+92 300 1234567"
                    className={`w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 ${
                      errors['store.phone']
                        ? 'border-destructive focus:ring-destructive'
                        : 'border-border focus:ring-primary'
                    }`}
                  />
                  {errors['store.phone'] && (
                    <p className="mt-1 text-[11px] text-destructive">{errors['store.phone']}</p>
                  )}
                </div>

                {/* Physical Address */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Physical Store / Headquarters Address <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={settings['store.address']}
                    onChange={(e) => handleChange('store.address', e.target.value)}
                    placeholder="123 Luxury Avenue, Suite 400, Lahore, Pakistan"
                    className={`w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 ${
                      errors['store.address']
                        ? 'border-destructive focus:ring-destructive'
                        : 'border-border focus:ring-primary'
                    }`}
                  />
                  {errors['store.address'] && (
                    <p className="mt-1 text-[11px] text-destructive">{errors['store.address']}</p>
                  )}
                </div>

                {/* Operating Hours */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Customer Service Hours <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings['store.hours']}
                    onChange={(e) => handleChange('store.hours', e.target.value)}
                    placeholder="Mon – Sat: 10:00 AM – 8:00 PM PKT"
                    className={`w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 ${
                      errors['store.hours']
                        ? 'border-destructive focus:ring-destructive'
                        : 'border-border focus:ring-primary'
                    }`}
                  />
                  {errors['store.hours'] && (
                    <p className="mt-1 text-[11px] text-destructive">{errors['store.hours']}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Theme & Styling */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="border-b border-border pb-3">
                  <h2 className="text-sm font-semibold text-foreground">Palette & Typography Tokens</h2>
                  <p className="text-xs text-muted-foreground">
                    Customize your brand colors and typography. Swatches update live on the preview card.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Primary Color Picker */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Primary Theme Color <span className="text-destructive">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center">
                        <input
                          type="color"
                          value={HEX_COLOR_REGEX.test(settings['theme.primary_color']) ? settings['theme.primary_color'] : '#0F172A'}
                          onChange={(e) => handleChange('theme.primary_color', e.target.value.toUpperCase())}
                          className="h-9 w-12 cursor-pointer rounded border border-border bg-background p-0.5"
                        />
                      </div>
                      <input
                        type="text"
                        value={settings['theme.primary_color']}
                        onChange={(e) => handleChange('theme.primary_color', e.target.value)}
                        placeholder="#0F172A"
                        className={`w-40 rounded-lg border bg-background px-3 py-2 text-xs uppercase font-mono text-foreground focus:outline-none focus:ring-1 ${
                          errors['theme.primary_color']
                            ? 'border-destructive focus:ring-destructive'
                            : 'border-border focus:ring-primary'
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">Used for headers, primary CTAs, active pills</span>
                    </div>
                    {errors['theme.primary_color'] && (
                      <p className="mt-1 text-[11px] text-destructive">{errors['theme.primary_color']}</p>
                    )}
                  </div>

                  {/* Accent Color Picker */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Accent / Highlight Color <span className="text-destructive">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center">
                        <input
                          type="color"
                          value={HEX_COLOR_REGEX.test(settings['theme.accent_color']) ? settings['theme.accent_color'] : '#D4AF37'}
                          onChange={(e) => handleChange('theme.accent_color', e.target.value.toUpperCase())}
                          className="h-9 w-12 cursor-pointer rounded border border-border bg-background p-0.5"
                        />
                      </div>
                      <input
                        type="text"
                        value={settings['theme.accent_color']}
                        onChange={(e) => handleChange('theme.accent_color', e.target.value)}
                        placeholder="#D4AF37"
                        className={`w-40 rounded-lg border bg-background px-3 py-2 text-xs uppercase font-mono text-foreground focus:outline-none focus:ring-1 ${
                          errors['theme.accent_color']
                            ? 'border-destructive focus:ring-destructive'
                            : 'border-border focus:ring-primary'
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">Used for sale tags, badges, gold/luxury highlights</span>
                    </div>
                    {errors['theme.accent_color'] && (
                      <p className="mt-1 text-[11px] text-destructive">{errors['theme.accent_color']}</p>
                    )}
                  </div>

                  {/* Font Family Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Primary Storefront Font Family
                    </label>
                    <select
                      value={settings['theme.font_family']}
                      onChange={(e) => handleChange('theme.font_family', e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {FONT_FAMILIES.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Theme Preview Swatch Card */}
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Live Theme Preview</h2>
                </div>

                <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                  {/* Sample Card */}
                  <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider"
                        style={{ backgroundColor: settings['theme.accent_color'] || '#D4AF37' }}
                      >
                        Special Offer
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {settings['theme.font_family']}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-foreground">
                      {settings['store.name'] || 'Sample Product'}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {settings['store.tagline'] || 'Premium materials with custom craftsmanship.'}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs font-bold text-foreground">
                        {settings['store.currency']} 14,500
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                        style={{ backgroundColor: settings['theme.primary_color'] || '#0F172A' }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Shipping & Taxes */}
        {activeTab === 'shipping' && (
          <div className="max-w-3xl space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-sm font-semibold text-foreground">Shipping Thresholds & Rate Calculation</h2>
                <p className="text-xs text-muted-foreground">
                  Control free delivery eligibility and standard checkout shipping costs.
                </p>
              </div>

              <div className="space-y-4">
                {/* Free Shipping Threshold */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Free Shipping Minimum Order Total ({settings['store.currency']}) <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={settings['shipping.free_threshold']}
                      onChange={(e) => handleChange('shipping.free_threshold', Number(e.target.value))}
                      className={`w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 ${
                        errors['shipping.free_threshold']
                          ? 'border-destructive focus:ring-destructive'
                          : 'border-border focus:ring-primary'
                      }`}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Orders with subtotal equal or exceeding this amount receive free shipping at checkout.
                  </p>
                  {errors['shipping.free_threshold'] && (
                    <p className="mt-1 text-[11px] text-destructive">{errors['shipping.free_threshold']}</p>
                  )}
                </div>

                {/* Standard Shipping Cost */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Standard Flat Rate Shipping Cost ({settings['store.currency']}) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settings['shipping.standard_cost']}
                    onChange={(e) => handleChange('shipping.standard_cost', Number(e.target.value))}
                    className={`w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 ${
                      errors['shipping.standard_cost']
                        ? 'border-destructive focus:ring-destructive'
                        : 'border-border focus:ring-primary'
                    }`}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Charged when the cart subtotal is below the free shipping threshold.
                  </p>
                  {errors['shipping.standard_cost'] && (
                    <p className="mt-1 text-[11px] text-destructive">{errors['shipping.standard_cost']}</p>
                  )}
                </div>

                {/* Tax Rate Percentage */}
                <div className="pt-2 border-t border-border">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Default Value-Added Tax / Sales Tax Rate (%) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings['tax.rate']}
                    onChange={(e) => handleChange('tax.rate', Number(e.target.value))}
                    className={`w-full rounded-lg border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 ${
                      errors['tax.rate']
                        ? 'border-destructive focus:ring-destructive'
                        : 'border-border focus:ring-primary'
                    }`}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Percentage tax rate applied at checkout (0 = tax included or exempt).
                  </p>
                  {errors['tax.rate'] && (
                    <p className="mt-1 text-[11px] text-destructive">{errors['tax.rate']}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Couriers & Logistics */}
        {activeTab === 'couriers' && <CourierSettingsTab />}

        {/* Tab 5: Analytics & Tracking */}
        {activeTab === 'tracking' && (
          <div className="max-w-3xl space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-sm font-semibold text-foreground">Analytics & Conversion Tracking</h2>
                <p className="text-xs text-muted-foreground">
                  Connect Meta Pixel and Google Analytics 4 for automated ViewContent, AddToCart, and Purchase events.
                </p>
              </div>

              <div className="space-y-4">
                {/* Meta Pixel */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Meta / Facebook Pixel ID
                  </label>
                  <input
                    type="text"
                    value={settings['tracking.meta_pixel_id'] || ''}
                    onChange={(e) => handleChange('tracking.meta_pixel_id', e.target.value)}
                    placeholder="e.g. 123456789012345"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    15–16 digit numeric ID from your Meta Events Manager.
                  </p>
                </div>

                {/* GA4 Measurement ID */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Google Analytics 4 (GA4) Measurement ID
                  </label>
                  <input
                    type="text"
                    value={settings['tracking.ga4_measurement_id'] || ''}
                    onChange={(e) => handleChange('tracking.ga4_measurement_id', e.target.value)}
                    placeholder="e.g. G-XXXXXXXXXX"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Measurement ID starting with &apos;G-&apos; from Google Analytics stream details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Social Profiles */}
        {activeTab === 'social' && (
          <div className="max-w-3xl space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="border-b border-border pb-3">
                <h2 className="text-sm font-semibold text-foreground">Social Media Profiles</h2>
                <p className="text-xs text-muted-foreground">
                  Links displayed on your storefront header, footer, and email templates.
                </p>
              </div>

              <div className="space-y-4">
                {/* Instagram */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Instagram Profile Link or Handle
                  </label>
                  <input
                    type="text"
                    value={settings['social.instagram'] || ''}
                    onChange={(e) => handleChange('social.instagram', e.target.value)}
                    placeholder="https://instagram.com/yourbrand or @yourbrand"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Facebook */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Facebook Page Link
                  </label>
                  <input
                    type="text"
                    value={settings['social.facebook'] || ''}
                    onChange={(e) => handleChange('social.facebook', e.target.value)}
                    placeholder="https://facebook.com/yourbrand"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* TikTok */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    TikTok Profile Link or Handle
                  </label>
                  <input
                    type="text"
                    value={settings['social.tiktok'] || ''}
                    onChange={(e) => handleChange('social.tiktok', e.target.value)}
                    placeholder="https://tiktok.com/@yourbrand or @yourbrand"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Media Upload & Selection Modal */}
      <MediaUploadModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={(asset) => {
          handleChange('store.logo_url', asset.url);
          setMediaModalOpen(false);
        }}
      />
    </div>
  );
}

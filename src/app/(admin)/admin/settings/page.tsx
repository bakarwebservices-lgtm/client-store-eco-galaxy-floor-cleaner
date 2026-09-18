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
  Mail,
  MessageSquare,
  UserCheck,
  Server,
  Lock,
  Film,
  Play,
  Images,
  CreditCard,
  Landmark,
} from 'lucide-react';
import { MediaUploadModal, SelectedMediaItem } from '@/components/admin/MediaUploadModal';
import { CourierSettingsTab } from '@/components/admin/CourierSettingsTab';
import { WhatsAppAutomationCard } from '@/components/admin/WhatsAppAutomationCard';
import { BankTransferSettingsCard } from '@/components/admin/BankTransferSettingsCard';
import { CodSettingsCard } from '@/components/admin/CodSettingsCard';
import {
  allSettingsSchema,
  DEFAULT_SETTINGS,
  FONT_FAMILIES,
  HEX_COLOR_REGEX,
  type AllSettingsInput,
} from '@/lib/validation/settings';
import { safeFetch } from '@/lib/apiClient';

type SettingsTab = 'identity' | 'contact' | 'theme' | 'shipping' | 'payments' | 'couriers' | 'tracking' | 'notifications' | 'social';

const TABS: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'identity', label: 'Store Identity', icon: Building2 },
  { id: 'contact', label: 'Contact Details', icon: Phone },
  { id: 'theme', label: 'Theme & Styling', icon: Palette },
  { id: 'shipping', label: 'Shipping & Taxes', icon: DollarSign },
  { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  { id: 'couriers', label: 'Couriers & Logistics', icon: Truck },
  { id: 'notifications', label: 'Email & WhatsApp', icon: MessageSquare },
  { id: 'tracking', label: 'Analytics & Tracking', icon: BarChart3 },
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
  const [mediaTargetField, setMediaTargetField] = useState<keyof AllSettingsInput>('hero.image_1_url');

  const openMediaPicker = (field: keyof AllSettingsInput) => {
    setMediaTargetField(field);
    setMediaModalOpen(true);
  };

  const handleMediaSelect = (item: SelectedMediaItem) => {
    if (mediaTargetField) {
      if (mediaTargetField === 'hero.video_url') {
        handleChange('hero.video_url', item.url);
        handleChange('hero.media_type', 'video');
      } else if (mediaTargetField === 'hero.video_poster') {
        // If user accidentally selects a video for poster when video_url is empty, route to video_url
        const isVideo = item.mimeType?.startsWith('video/') || item.url.match(/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i);
        if (isVideo && !settings['hero.video_url']) {
          handleChange('hero.video_url', item.url);
          handleChange('hero.media_type', 'video');
        } else {
          handleChange('hero.video_poster', item.url);
        }
      } else {
        handleChange(mediaTargetField, item.url);
        if (mediaTargetField === 'hero.image_1_url' && item.altText && !settings['hero.image_1_alt']) {
          handleChange('hero.image_1_alt', item.altText);
        } else if (mediaTargetField === 'hero.image_2_url' && item.altText && !settings['hero.image_2_alt']) {
          handleChange('hero.image_2_alt', item.altText);
        } else if (mediaTargetField === 'hero.image_3_url' && item.altText && !settings['hero.image_3_alt']) {
          handleChange('hero.image_3_alt', item.altText);
        }
      }
    }
    setMediaModalOpen(false);
  };

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
                          onClick={() => openMediaPicker('store.logo_url')}
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
                        onClick={() => openMediaPicker('store.logo_url')}
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

              {/* Announcement Bar Customizer Card */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="border-b border-border pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Top Announcement Bar</h2>
                    <p className="text-xs text-muted-foreground">
                      Display a prominent notice banner on your storefront (e.g. Free shipping, sales, promotions).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(settings['announcement.enabled'])}
                      onChange={(e) => handleChange('announcement.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {Boolean(settings['announcement.enabled']) && (
                  <div className="space-y-5 pt-1">
                    {/* Announcement Mode & Dismissible Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-muted/30 p-3.5 border border-border/70">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Display Animation Mode
                        </label>
                        <select
                          value={settings['announcement.mode'] || 'static'}
                          onChange={(e) => handleChange('announcement.mode', e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="static">Static (Stationary)</option>
                          <option value="marquee">Constantly Moving (Smooth Marquee Ticker)</option>
                          <option value="rotate">Auto-Rotating Carousel (Every 4s)</option>
                        </select>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Choose whether banners remain fixed or scroll continuously.
                        </p>
                      </div>

                      <div className="flex flex-col justify-center">
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Cancellable / Dismissible
                        </label>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-0.5">
                          <input
                            type="checkbox"
                            checked={Boolean(settings['announcement.dismissible'])}
                            onChange={(e) => handleChange('announcement.dismissible', e.target.checked)}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          />
                          <span>Allow visitors to dismiss (shows &times; close icon)</span>
                        </label>
                      </div>
                    </div>

                    {/* Announcement Bar 1 (Primary) */}
                    <div className="rounded-lg border border-border p-4 space-y-3 bg-card/40">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="text-xs font-bold text-foreground">Announcement Bar 1 (Primary)</span>
                        <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded">Required</span>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Announcement Message <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={settings['announcement.text'] || ''}
                          onChange={(e) => handleChange('announcement.text', e.target.value)}
                          placeholder="e.g. ✨ Free Nationwide Express Delivery on All Orders!"
                          className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Banner Target Link (Optional)
                        </label>
                        <input
                          type="text"
                          value={settings['announcement.link'] || ''}
                          onChange={(e) => handleChange('announcement.link', e.target.value)}
                          placeholder="e.g. /products or /collections/special-sale"
                          className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Background Color
                          </label>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="color"
                              value={HEX_COLOR_REGEX.test(settings['announcement.bg_color']) ? settings['announcement.bg_color'] : '#0F172A'}
                              onChange={(e) => handleChange('announcement.bg_color', e.target.value.toUpperCase())}
                              className="h-8 w-10 cursor-pointer rounded border border-border bg-background p-0.5"
                            />
                            <input
                              type="text"
                              value={settings['announcement.bg_color'] || '#0F172A'}
                              onChange={(e) => handleChange('announcement.bg_color', e.target.value)}
                              placeholder="#0F172A"
                              className="w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs uppercase font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Text Color
                          </label>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="color"
                              value={HEX_COLOR_REGEX.test(settings['announcement.text_color']) ? settings['announcement.text_color'] : '#FFFFFF'}
                              onChange={(e) => handleChange('announcement.text_color', e.target.value.toUpperCase())}
                              className="h-8 w-10 cursor-pointer rounded border border-border bg-background p-0.5"
                            />
                            <input
                              type="text"
                              value={settings['announcement.text_color'] || '#FFFFFF'}
                              onChange={(e) => handleChange('announcement.text_color', e.target.value)}
                              placeholder="#FFFFFF"
                              className="w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs uppercase font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Announcement Bar 2 (Secondary - Max 2) */}
                    <div className="rounded-lg border border-border p-4 space-y-3 bg-card/40">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div>
                          <span className="text-xs font-bold text-foreground">Announcement Bar 2 (Secondary)</span>
                          <p className="text-[10px] text-muted-foreground">Optional second announcement bar (Max 2 total)</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(settings['announcement.2.enabled'])}
                            onChange={(e) => handleChange('announcement.2.enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      {Boolean(settings['announcement.2.enabled']) && (
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-xs font-medium text-foreground mb-1">
                              Second Announcement Message
                            </label>
                            <input
                              type="text"
                              value={settings['announcement.2.text'] || ''}
                              onChange={(e) => handleChange('announcement.2.text', e.target.value)}
                              placeholder="e.g. 💳 Cash On Delivery Available Nationwide • 2-4 Days Shipping"
                              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-foreground mb-1">
                              Second Banner Target Link (Optional)
                            </label>
                            <input
                              type="text"
                              value={settings['announcement.2.link'] || ''}
                              onChange={(e) => handleChange('announcement.2.link', e.target.value)}
                              placeholder="e.g. /track-order or /faq"
                              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div>
                              <label className="block text-xs font-medium text-foreground mb-1">
                                Background Color
                              </label>
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="color"
                                  value={HEX_COLOR_REGEX.test(settings['announcement.2.bg_color']) ? settings['announcement.2.bg_color'] : '#1E293B'}
                                  onChange={(e) => handleChange('announcement.2.bg_color', e.target.value.toUpperCase())}
                                  className="h-8 w-10 cursor-pointer rounded border border-border bg-background p-0.5"
                                />
                                <input
                                  type="text"
                                  value={settings['announcement.2.bg_color'] || '#1E293B'}
                                  onChange={(e) => handleChange('announcement.2.bg_color', e.target.value)}
                                  placeholder="#1E293B"
                                  className="w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs uppercase font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-foreground mb-1">
                                Text Color
                              </label>
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="color"
                                  value={HEX_COLOR_REGEX.test(settings['announcement.2.text_color']) ? settings['announcement.2.text_color'] : '#FFFFFF'}
                                  onChange={(e) => handleChange('announcement.2.text_color', e.target.value.toUpperCase())}
                                  className="h-8 w-10 cursor-pointer rounded border border-border bg-background p-0.5"
                                />
                                <input
                                  type="text"
                                  value={settings['announcement.2.text_color'] || '#FFFFFF'}
                                  onChange={(e) => handleChange('announcement.2.text_color', e.target.value)}
                                  placeholder="#FFFFFF"
                                  className="w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs uppercase font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Home Page Hero Visual Showcase Card */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Images className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-semibold text-foreground">Hero Section Media Showcase</h2>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Customize what appears on the right column of your home page hero banner.
                      </p>
                    </div>
                  </div>

                  {/* Media Type Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-foreground">Media Display Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange('hero.media_type', 'product')}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                          settings['hero.media_type'] === 'product'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground font-semibold'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
                        }`}
                      >
                        <Building2 className="h-5 w-5 mb-1.5 text-primary" />
                        <span className="text-xs">Featured Product</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">Dynamic product card</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange('hero.media_type', 'image')}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                          settings['hero.media_type'] === 'image'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground font-semibold'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
                        }`}
                      >
                        <Images className="h-5 w-5 mb-1.5 text-primary" />
                        <span className="text-xs">Image Slider</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">Up to 3 images (3s auto)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange('hero.media_type', 'video')}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                          settings['hero.media_type'] === 'video'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground font-semibold'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
                        }`}
                      >
                        <Film className="h-5 w-5 mb-1.5 text-primary" />
                        <span className="text-xs">Video Showcase</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">1 looping MP4/WebM</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Controls based on selected media type */}
                  {settings['hero.media_type'] === 'product' && (
                    <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1.5">
                      <p className="font-semibold text-foreground">Featured Product Active</p>
                      <p>
                        The hero section automatically highlights your primary featured product from your catalog with dynamic live pricing, stock badges, and an instant Add to Cart action.
                      </p>
                    </div>
                  )}

                  {settings['hero.media_type'] === 'image' && (
                    <div className="space-y-5 pt-2">
                      {/* Slide Speed / Interval */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Auto-Advance Interval
                          </label>
                          <select
                            value={Number(settings['hero.slide_interval']) || 3000}
                            onChange={(e) => handleChange('hero.slide_interval', Number(e.target.value))}
                            className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value={3000}>3 Seconds (Default / Recommended)</option>
                            <option value={4000}>4 Seconds</option>
                            <option value={5000}>5 Seconds</option>
                            <option value={7000}>7 Seconds</option>
                            <option value={0}>Manual Arrows Only (No Auto-Advance)</option>
                          </select>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground pt-5">
                          <span>Includes subtle navigation arrows &amp; pagination dots. Pauses automatically on mouse hover or touch.</span>
                        </div>
                      </div>

                      {/* 3 Image Slots */}
                      <div className="space-y-4">
                        <label className="block text-xs font-semibold text-foreground">
                          Slider Images (Up to 3)
                        </label>

                        {[1, 2, 3].map((slot) => {
                          const urlKey = `hero.image_${slot}_url` as keyof AllSettingsInput;
                          const altKey = `hero.image_${slot}_alt` as keyof AllSettingsInput;
                          const linkKey = `hero.image_${slot}_link` as keyof AllSettingsInput;
                          const currentUrl = (settings[urlKey] as string) || '';
                          const currentAlt = (settings[altKey] as string) || '';
                          const currentLink = (settings[linkKey] as string) || '';

                          return (
                            <div key={slot} className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">Slide #{slot}</span>
                                {currentUrl && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleChange(urlKey, '');
                                      handleChange(altKey, '');
                                      handleChange(linkKey, '');
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive hover:underline"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Remove Slide</span>
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                                {/* Thumbnail preview */}
                                <div className="md:col-span-1">
                                  {currentUrl ? (
                                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border bg-card">
                                      <Image
                                        src={currentUrl}
                                        alt={currentAlt || `Slide ${slot}`}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="aspect-video w-full rounded-lg border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-[10px] text-muted-foreground">
                                      <Images className="h-5 w-5 mb-1 opacity-40" />
                                      <span>No Image</span>
                                    </div>
                                  )}
                                </div>

                                {/* Inputs */}
                                <div className="md:col-span-3 space-y-2.5">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={currentUrl}
                                      onChange={(e) => handleChange(urlKey, e.target.value)}
                                      placeholder={`Slide ${slot} Image URL (Cloudinary or HTTPS)`}
                                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => openMediaPicker(urlKey)}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0"
                                    >
                                      <Upload className="h-3.5 w-3.5" />
                                      <span>Browse</span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={currentAlt}
                                      onChange={(e) => handleChange(altKey, e.target.value)}
                                      placeholder="Alt text / description"
                                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <input
                                      type="text"
                                      value={currentLink}
                                      onChange={(e) => handleChange(linkKey, e.target.value)}
                                      placeholder="Click link (e.g. /collections/summer)"
                                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {settings['hero.media_type'] === 'video' && (
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Video (Direct MP4 / WebM / Cloudinary) <span className="text-destructive">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={settings['hero.video_url'] || ''}
                            onChange={(e) => handleChange('hero.video_url', e.target.value)}
                            placeholder="Select or upload video (MP4, WebM, MOV) or paste direct URL..."
                            className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => openMediaPicker('hero.video_url')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 text-xs font-semibold transition-colors shrink-0"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Browse / Upload</span>
                          </button>
                          {settings['hero.video_url'] && (
                            <button
                              type="button"
                              onClick={() => handleChange('hero.video_url', '')}
                              className="inline-flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors shrink-0"
                              title="Remove Video"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Direct video upload or Cloudinary/HTTPS URL. The storefront plays this automatically muted on an infinite loop with a viewer sound unmute button.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Video Poster Image (Thumbnail before playback)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={settings['hero.video_poster'] || ''}
                            onChange={(e) => handleChange('hero.video_poster', e.target.value)}
                            placeholder="https://.../poster.jpg (Optional thumbnail image)"
                            className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => openMediaPicker('hero.video_poster')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shrink-0"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Browse</span>
                          </button>
                          {settings['hero.video_poster'] && (
                            <button
                              type="button"
                              onClick={() => handleChange('hero.video_poster', '')}
                              className="inline-flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors shrink-0"
                              title="Remove Poster"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {settings['hero.video_url'] && (
                        <div className="relative aspect-video w-full max-w-md rounded-xl overflow-hidden border border-border bg-black">
                          <video
                            key={settings['hero.video_url']}
                            src={settings['hero.video_url']}
                            poster={settings['hero.video_poster'] || undefined}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-medium flex items-center gap-1">
                            <Film className="h-3 w-3" /> Live Video Preview
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                  {/* Live Announcement Bar Preview */}
                  {Boolean(settings['announcement.enabled']) && settings['announcement.text'] && (
                    <div className="space-y-1 overflow-hidden rounded-lg shadow-sm">
                      <div
                        style={{
                          backgroundColor: settings['announcement.bg_color'] || '#0F172A',
                          color: settings['announcement.text_color'] || '#FFFFFF',
                        }}
                        className={`relative px-3 py-1.5 text-center text-[11px] font-semibold truncate ${
                          settings['announcement.mode'] === 'marquee' ? 'animate-marquee' : ''
                        }`}
                      >
                        {settings['announcement.text']}
                        {Boolean(settings['announcement.dismissible']) && (
                          <span className="absolute right-2 top-1.5 opacity-60">&times;</span>
                        )}
                      </div>
                      {Boolean(settings['announcement.2.enabled']) && settings['announcement.2.text'] && settings['announcement.mode'] === 'static' && (
                        <div
                          style={{
                            backgroundColor: settings['announcement.2.bg_color'] || '#1E293B',
                            color: settings['announcement.2.text_color'] || '#FFFFFF',
                          }}
                          className="px-3 py-1 text-center text-[10px] font-medium truncate"
                        >
                          {settings['announcement.2.text']}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hero Showcase Preview Miniature */}
                  <div className="rounded-lg border border-border bg-card p-3 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Hero Visual Preview
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {settings['hero.media_type']}
                      </span>
                    </div>

                    {settings['hero.media_type'] === 'video' && settings['hero.video_url'] ? (
                      <div className="relative aspect-video w-full rounded-md overflow-hidden bg-black text-white text-[10px] flex items-center justify-center">
                        <video
                          src={settings['hero.video_url']}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px]">
                          Video Active
                        </div>
                      </div>
                    ) : settings['hero.media_type'] === 'image' && (settings['hero.image_1_url'] || settings['hero.image_2_url'] || settings['hero.image_3_url']) ? (
                      <div className="relative aspect-video w-full rounded-md overflow-hidden border border-border bg-muted">
                        <Image
                          src={settings['hero.image_1_url'] || settings['hero.image_2_url'] || settings['hero.image_3_url'] || ''}
                          alt="Hero Preview"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-[9px]">
                          {settings['hero.slide_interval'] ? `${settings['hero.slide_interval']}s auto` : 'slider'}
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-center text-[11px] text-muted-foreground bg-muted/30 rounded border border-dashed border-border">
                        Featured Product Card (Default)
                      </div>
                    )}
                  </div>

                  {/* Sample Card */}
                  <div
                    className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm"
                    style={{ fontFamily: settings['theme.font_family'] ? `"${settings['theme.font_family']}", sans-serif` : undefined }}
                  >
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

        {/* Tab: Payment Methods (COD, Direct Bank Transfer & Prepayment Incentive) */}
        {activeTab === 'payments' && (
          <div className="space-y-6 max-w-3xl">
            <CodSettingsCard
              settings={settings}
              handleChange={handleChange}
              errors={errors}
            />
            <BankTransferSettingsCard
              settings={settings}
              handleChange={handleChange}
              errors={errors}
            />
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

                {/* Direct Courier Tracking Portal URL */}
                <div className="border-t border-border pt-4">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Direct Courier Tracking Page URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={settings['tracking.custom_url'] || ''}
                    onChange={(e) => handleChange('tracking.custom_url', e.target.value)}
                    placeholder="https://postex.pk/tracking or https://trax.pk/tracking"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    When set, clicking &quot;Track&quot; in the header or &quot;Track Order&quot; in the footer directs customers straight to this courier tracking portal. Leave empty to use the built-in tracking page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Email, WhatsApp & Customer Accounts */}
        {activeTab === 'notifications' && (
          <div className="max-w-3xl space-y-6">
            {/* Storefront WhatsApp Floating Support Widget */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-500" />
                    <span>Storefront WhatsApp Support Button</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Displays a floating WhatsApp icon in the bottom-right corner of your storefront for customer chat assistance.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings['whatsapp.floating_button_enabled'])}
                    onChange={(e) => handleChange('whatsapp.floating_button_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {Boolean(settings['whatsapp.floating_button_enabled']) && (
                <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Support WhatsApp Phone Number
                    </label>
                    <input
                      type="text"
                      value={settings['whatsapp.phone_number'] || ''}
                      onChange={(e) => handleChange('whatsapp.phone_number', e.target.value)}
                      placeholder={settings['store.phone'] || '0300 1234567'}
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Pakistani mobile number customers will reach when tapping the floating bubble. If left blank, defaults to your primary Store Phone.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Pre-filled Customer WhatsApp Message (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={settings['whatsapp.custom_message'] || ''}
                      onChange={(e) => handleChange('whatsapp.custom_message', e.target.value)}
                      placeholder="Hi! I have a question about your products on {store_name}."
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Pre-filled message when a customer taps the chat button. Available tag: {'{store_name}'}
                    </p>
                  </div>
                </div>
              )}

              {!Boolean(settings['whatsapp.floating_button_enabled']) && (
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
                  💡 <strong>Floating Chat Hidden:</strong> The floating WhatsApp button is hidden from storefront visitors.
                </div>
              )}
            </div>

            {/* WhatsApp Order Confirmation & PostEx Auto-Booking Engine */}
            <WhatsAppAutomationCard settings={settings} handleChange={handleChange} />

            {/* Customer Accounts & Authentication Layer */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span>Customer Accounts & Sign-In System</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enable customer login, registration, and account profiles on the storefront.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings['auth.customer_accounts_enabled'])}
                    onChange={(e) => handleChange('auth.customer_accounts_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {!settings['auth.customer_accounts_enabled'] && (
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
                  💡 <strong>Simplified Guest/COD Mode Active:</strong> Customer account buttons are hidden from the header. Customers checkout directly with phone/address, eliminating registration friction.
                </div>
              )}
            </div>

            {/* Outgoing SMTP Email Integration */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    <span>Outgoing SMTP Email Provider</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connect your SMTP server (Resend, SendGrid, Gmail, Mailgun) directly without setting environment variables.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings['email.smtp_enabled'])}
                    onChange={(e) => handleChange('email.smtp_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {settings['email.smtp_enabled'] ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-foreground mb-1">
                        SMTP Host Server
                      </label>
                      <input
                        type="text"
                        value={settings['email.smtp_host'] || ''}
                        onChange={(e) => handleChange('email.smtp_host', e.target.value)}
                        placeholder="smtp.resend.com or smtp.gmail.com"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        value={settings['email.smtp_port'] || 587}
                        onChange={(e) => handleChange('email.smtp_port', Number(e.target.value))}
                        placeholder="587"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        SMTP Username / API Key
                      </label>
                      <input
                        type="text"
                        value={settings['email.smtp_user'] || ''}
                        onChange={(e) => handleChange('email.smtp_user', e.target.value)}
                        placeholder="apikey or your-email@domain.com"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        SMTP Password / Secret
                      </label>
                      <input
                        type="password"
                        value={settings['email.smtp_password'] || ''}
                        onChange={(e) => handleChange('email.smtp_password', e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        From Email Address
                      </label>
                      <input
                        type="email"
                        value={settings['email.smtp_from'] || ''}
                        onChange={(e) => handleChange('email.smtp_from', e.target.value)}
                        placeholder="orders@yourbrand.com"
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        From Sender Name
                      </label>
                      <input
                        type="text"
                        value={settings['email.smtp_from_name'] || ''}
                        onChange={(e) => handleChange('email.smtp_from_name', e.target.value)}
                        placeholder={settings['store.name'] || 'Store Orders'}
                        className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
                  SMTP is currently disabled. All store operations continue normally, and email dispatch will be safely bypassed.
                </div>
              )}
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
        onSelect={handleMediaSelect}
        title={
          mediaTargetField === 'hero.video_url'
            ? 'Select or Upload Hero Video (MP4 / WebM / MOV)'
            : mediaTargetField === 'hero.video_poster'
            ? 'Select or Upload Video Poster Thumbnail'
            : 'Select or Upload Media Asset'
        }
        allowMultiple={false}
      />
    </div>
  );
}

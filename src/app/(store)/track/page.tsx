'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Truck,
  Search,
  Loader2,
  AlertCircle,
  Package,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';
import { TrackingStepper, type TrackingShipmentData } from '@/components/storefront/TrackingStepper';

function TrackContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'tracking' | 'order'>('tracking');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shipment, setShipment] = useState<TrackingShipmentData | null>(null);

  const executeLookup = async (params: { trackingNumber?: string; orderNumber?: string; contact?: string }) => {
    setLoading(true);
    setError(null);
    setShipment(null);

    try {
      const query = new URLSearchParams();
      if (params.trackingNumber) query.set('trackingNumber', params.trackingNumber);
      if (params.orderNumber) query.set('orderNumber', params.orderNumber);
      if (params.contact) query.set('contact', params.contact);

      const res = await fetch(`/api/tracking?${query.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to locate shipment.');
      }

      setShipment(data.shipment);
    } catch (err: any) {
      setError(err.message || 'No tracking information found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const tn = searchParams.get('trackingNumber') || searchParams.get('cn');
    const on = searchParams.get('orderNumber') || searchParams.get('order');
    const ct = searchParams.get('contact') || searchParams.get('email') || searchParams.get('phone');

    if (tn) {
      setTrackingNumber(tn);
      setTab('tracking');
      executeLookup({ trackingNumber: tn });
    } else if (on && ct) {
      setOrderNumber(on);
      setContact(ct);
      setTab('order');
      executeLookup({ orderNumber: on, contact: ct });
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'tracking') {
      if (!trackingNumber.trim()) {
        setError('Please enter your consignment tracking number.');
        return;
      }
      executeLookup({ trackingNumber: trackingNumber.trim() });
    } else {
      if (!orderNumber.trim() || !contact.trim()) {
        setError('Please provide both your order number and email or phone number.');
        return;
      }
      executeLookup({ orderNumber: orderNumber.trim(), contact: contact.trim() });
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Track Shipment' }]} />

      {/* Hero Header */}
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
          <Truck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Track Your Order
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Real-time delivery milestones, courier consignment details, and live journey updates for your order.
        </p>
      </div>

      {/* Lookup Card */}
      <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        {/* Dual Tab Switch */}
        <div className="grid grid-cols-2 rounded-xl bg-muted/60 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('tracking');
              setError(null);
            }}
            className={`rounded-lg py-2 transition-all ${
              tab === 'tracking'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            By Tracking Number
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('order');
              setError(null);
            }}
            className={`rounded-lg py-2 transition-all ${
              tab === 'order'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            By Order & Contact
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {tab === 'tracking' ? (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Consignment Tracking Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. PE1234567890 or MAN-1001-XXXX"
                  className="w-full rounded-xl border border-input bg-background pl-4 pr-10 py-3 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <Truck className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Found on your dispatch confirmation email or SMS.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Order Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. #1001"
                    className="w-full rounded-xl border border-input bg-background pl-4 pr-10 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Package className="absolute right-3.5 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Billing Email or Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. customer@example.com or 03001234567"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Matches the contact info used during checkout for security.
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Locating Consignment...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Track Shipment</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-xl mx-auto flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Stepper & Shipment Details */}
      {shipment && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Live Shipment Status
            </span>
          </div>
          <TrackingStepper shipment={shipment} />
        </div>
      )}
    </main>
  );
}

export default function PublicTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading tracking portal...</span>
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}

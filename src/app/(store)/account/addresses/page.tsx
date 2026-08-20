'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/storefront/Breadcrumbs';

export const dynamic = 'force-dynamic';

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [label, setLabel] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer/addresses');
      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, label, phone, address, city, province, postalCode, isDefault }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save address');

      setIsAdding(false);
      setFirstName('');
      setLastName('');
      setLabel('');
      setPhone('');
      setAddress('');
      setCity('');
      setProvince('');
      setPostalCode('');
      setIsDefault(false);
      await fetchAddresses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await fetch(`/api/customer/addresses/${addressId}`, { method: 'DELETE' });
      await fetchAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Account', href: '/account' }, { label: 'Addresses' }]} />

      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Saved Addresses</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your delivery destinations for instant 1-click checkout.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{isAdding ? 'Cancel' : 'Add New Address'}</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreateAddress} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">New Delivery Address</h2>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ahmad"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Khan"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">Label (Optional)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Home / Office"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03001234567"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-muted-foreground">Street Address *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House #, Street, Block/Sector"
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">City *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Lahore"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">Province</label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Punjab"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-muted-foreground">Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="54000"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            <span>Set as default shipping address</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Address'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Loading saved addresses...</div>
      ) : addresses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className="relative rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <p className="font-bold text-xs text-foreground">{addr.firstName} {addr.lastName}</p>
                </div>
                {addr.isDefault && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Default
                  </span>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>{addr.address}</p>
                <p>{addr.city}, {addr.province || ''} {addr.postalCode || ''}</p>
                <p>{addr.country}</p>
                <p className="pt-1 font-semibold text-foreground">Phone: {addr.phone}</p>
              </div>

              <div className="border-t border-border pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border py-12 text-center space-y-2">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="text-xs font-semibold text-foreground">No saved addresses</h2>
          <p className="text-[11px] text-muted-foreground">Add your home or office address for faster checkout.</p>
        </div>
      )}
    </main>
  );
}

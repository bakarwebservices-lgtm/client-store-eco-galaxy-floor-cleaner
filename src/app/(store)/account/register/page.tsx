'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { safeFetch } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

function CustomerRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';
  const { refreshCart } = useCart();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { ok, data, error: fetchErr } = await safeFetch<any>('/api/auth/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone: phone || null, password }),
      });

      if (!ok) {
        setError(fetchErr || 'Failed to register account. Please check your information.');
        setLoading(false);
        return;
      }

      await refreshCart();
      router.push(redirect);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during registration.');
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Customer Account</h1>
        <p className="text-xs text-muted-foreground">
          Join our store to track orders and save your delivery details.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="reg-first-name" className="block text-xs font-semibold text-foreground">First Name *</label>
            <input
              id="reg-first-name"
              type="text"
              required
              aria-required="true"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ahmad"
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-last-name" className="block text-xs font-semibold text-foreground">Last Name *</label>
            <input
              id="reg-last-name"
              type="text"
              required
              aria-required="true"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Khan"
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="block text-xs font-semibold text-foreground">Email Address *</label>
          <input
            id="reg-email"
            type="email"
            required
            aria-required="true"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-phone" className="block text-xs font-semibold text-foreground">Phone Number</label>
          <input
            id="reg-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="03001234567"
            className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="block text-xs font-semibold text-foreground">Password *</label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              aria-required="true"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-input bg-background p-2.5 pr-10 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
        </button>
      </form>

      <div className="text-center text-xs text-muted-foreground">
        <span>Already have an account? </span>
        <Link href={`/account/login?redirect=${encodeURIComponent(redirect)}`} className="font-bold text-primary hover:underline">
          Log in
        </Link>
      </div>
    </main>
  );
}

export default function CustomerRegisterPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-muted-foreground">Loading registration...</div>}>
      <CustomerRegisterForm />
    </Suspense>
  );
}


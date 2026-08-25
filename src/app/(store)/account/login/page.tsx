'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { safeFetch } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

function CustomerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';
  const { refreshCart } = useCart();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { ok, data, error: fetchErr } = await safeFetch<any>('/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!ok) {
        setError(fetchErr || 'Failed to log in. Please verify your email and password.');
        setLoading(false);
        return;
      }

      await refreshCart();
      if (data?.role === 'admin' || data?.redirectUrl === '/admin') {
        router.push('/admin');
      } else {
        router.push(redirect);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during login.');
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign In to Your Account</h1>
        <p className="text-xs text-muted-foreground">
          Track your orders, view receipts, and manage saved addresses.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="block text-xs font-semibold text-foreground">Email Address</label>
          <input
            id="login-email"
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
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="block text-xs font-semibold text-foreground">Password</label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              aria-required="true"
              autoComplete="current-password"
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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
        </button>
      </form>

      <div className="text-center text-xs text-muted-foreground">
        <span>Don't have an account yet? </span>
        <Link href={`/account/register?redirect=${encodeURIComponent(redirect)}`} className="font-bold text-primary hover:underline">
          Create one here
        </Link>
      </div>
    </main>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-16 space-y-6 min-h-[580px]" aria-busy="true">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted animate-pulse" />
            <div className="h-8 w-48 bg-muted rounded mx-auto animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded mx-auto animate-pulse" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 min-h-[220px]">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted/50 rounded-lg animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted/50 rounded-lg animate-pulse" />
            </div>
            <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
          </div>
        </main>
      }
    >
      <CustomerLoginForm />
    </Suspense>
  );
}

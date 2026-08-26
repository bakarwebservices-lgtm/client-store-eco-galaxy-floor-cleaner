'use client';

import React, { useState } from 'react';
import { Mail, Check, AlertCircle, Loader2 } from 'lucide-react';
import { safeFetch } from '@/lib/apiClient';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatus(null);

    try {
      const { ok, data, error } = await safeFetch<any>('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!ok) {
        setStatus({ type: 'error', message: error || 'Failed to subscribe. Please try again.' });
      } else {
        setStatus({ type: 'success', message: data?.message || 'Thank you for subscribing!' });
        setEmail('');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Join Our Newsletter
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Receive exclusive drops, seasonal sales, and member-only promotions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <label htmlFor="newsletter-email" className="sr-only">
              Email Address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              aria-required="true"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email..."
              className="w-full rounded-xl border border-input bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover disabled:opacity-50 transition-colors shrink-0"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            <span>Join</span>
          </button>
        </div>

        {status && (
          <div
            className={`flex items-center gap-1.5 text-[11px] p-2 rounded-lg ${
              status.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-700 font-medium'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {status.type === 'success' ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}
      </form>
    </div>
  );
}

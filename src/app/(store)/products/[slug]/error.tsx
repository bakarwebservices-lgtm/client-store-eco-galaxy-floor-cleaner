'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react';

export default function ProductDetailErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-sm">
        <AlertCircle className="h-7 w-7" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Product Information Unavailable</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          We encountered an issue loading this product details. Please try reloading or explore other items in our catalog.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>

        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Browse Catalog</span>
        </Link>
      </div>
    </main>
  );
}

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function CollectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Collection page error caught by boundary:', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Unable to Load Collection Products
        </h1>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          We encountered an issue retrieving items in this collection. Please try again or browse our full catalog.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Browse All Products
        </Link>
      </div>
    </main>
  );
}

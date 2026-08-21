'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CollectionForm } from '@/components/admin/CollectionForm';

export default function NewCollectionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/collections"
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Collections</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-base font-bold leading-tight">Create Collection</h1>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CollectionForm />
      </main>
    </div>
  );
}

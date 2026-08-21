'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { PageForm } from '@/components/admin/PageForm';

export default function EditCMSPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPage() {
      try {
        const res = await fetch(`/api/pages/${id}?admin=true`);
        if (!res.ok) throw new Error('Page not found');
        const data = await res.json();
        setPage(data.page);
      } catch (err: any) {
        setError(err.message || 'Failed to load page');
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, [id]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/pages"
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Pages</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-base font-bold leading-tight">
              Edit Page: <span className="text-primary">{page?.title || '...'}</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Loading page data...</p>
          </div>
        ) : error || !page ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center space-y-3">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
            <h2 className="text-sm font-bold text-destructive">Unable to load page</h2>
            <p className="text-xs text-destructive/80">{error || 'Page record does not exist.'}</p>
            <Link
              href="/admin/pages"
              className="inline-flex items-center rounded-lg bg-card px-4 py-2 text-xs font-semibold text-foreground border border-border"
            >
              Return to Pages List
            </Link>
          </div>
        ) : (
          <PageForm initialData={page} isEditing />
        )}
      </main>
    </div>
  );
}

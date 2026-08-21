'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { FaqForm } from '@/components/admin/FaqForm';

export default function EditFAQPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [faq, setFaq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFaq() {
      try {
        const res = await fetch(`/api/faq/${id}?admin=true`);
        if (!res.ok) throw new Error('FAQ not found');
        const data = await res.json();
        setFaq(data.faq);
      } catch (err: any) {
        setError(err.message || 'Failed to load FAQ');
      } finally {
        setLoading(false);
      }
    }
    fetchFaq();
  }, [id]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/faq"
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to FAQs</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-base font-bold leading-tight">Edit FAQ Item</h1>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Loading FAQ data...</p>
          </div>
        ) : error || !faq ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center space-y-3">
            <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
            <h2 className="text-sm font-bold text-destructive">Unable to load FAQ</h2>
            <p className="text-xs text-destructive/80">{error || 'FAQ record does not exist.'}</p>
            <Link
              href="/admin/faq"
              className="inline-flex items-center rounded-lg bg-card px-4 py-2 text-xs font-semibold text-foreground border border-border"
            >
              Return to FAQs List
            </Link>
          </div>
        ) : (
          <FaqForm initialData={faq} isEditing />
        )}
      </main>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export const dynamic = 'force-dynamic';

export default function AdminFaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/faq?admin=true&search=${encodeURIComponent(search)}&category=${selectedCategory}`);
      if (!res.ok) throw new Error('Failed to load FAQs');
      const data = await res.json();
      setFaqs(data.faqs || []);
      setCategories(data.categories || []);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error loading FAQs' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFaqs();
  };

  const handleToggle = async (faqId: string) => {
    setTogglingId(faqId);
    setNotification(null);
    try {
      const res = await fetch(`/api/faq/${faqId}`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle FAQ');

      setNotification({ type: 'success', text: data.message });
      fetchFaqs();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (faqId: string, question: string) => {
    if (!confirm(`Are you sure you want to delete FAQ "${question}"?`)) return;

    setDeletingId(faqId);
    setNotification(null);
    try {
      const res = await fetch(`/api/faq/${faqId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete FAQ');

      setNotification({ type: 'success', text: `FAQ deleted successfully.` });
      fetchFaqs();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Admin Hub</span>
            </Link>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div>
              <h1 className="text-base font-bold leading-tight">FAQ Management</h1>
              <p className="text-xs text-muted-foreground">Manage customer help questions and categories</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/faq"
              target="_blank"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
            >
              <span>View Store FAQ</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/faq/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New FAQ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {notification && (
          <div
            className={`rounded-xl border p-4 text-xs font-medium flex items-center justify-between ${
              notification.type === 'success'
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            <span>{notification.text}</span>
            <button onClick={() => setNotification(null)} className="text-xs font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Toolbar & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search question or answer..."
              className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                    selectedCategory === c
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* FAQ Table */}
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Loading FAQ items...</p>
          </div>
        ) : faqs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center space-y-3">
            <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <h2 className="text-sm font-bold text-foreground">No FAQ items found</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add common questions and answers to support your customers self-service.
            </p>
            <Link
              href="/admin/faq/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              <span>Create FAQ</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Question & Answer</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-center">Sort Order</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {faqs.map((faq) => (
                  <tr key={faq.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 max-w-md">
                      <div className="space-y-1">
                        <span className="font-bold text-foreground block">{faq.question}</span>
                        <div
                          className="text-[11px] text-muted-foreground line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: faq.answer }}
                        />
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-[10px] font-bold text-foreground">
                        {faq.category || 'General'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center text-muted-foreground font-semibold">
                      {faq.sortOrder}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        disabled={togglingId === faq.id}
                        onClick={() => handleToggle(faq.id)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-transform active:scale-95 ${
                          faq.isActive
                            ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                        title="Click to toggle active state"
                      >
                        {togglingId === faq.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : faq.isActive ? (
                          'Active'
                        ) : (
                          'Hidden'
                        )}
                      </button>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/faq/${faq.id}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Edit FAQ"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === faq.id}
                          onClick={() => handleDelete(faq.id, faq.question)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                          title="Delete FAQ"
                        >
                          {deletingId === faq.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

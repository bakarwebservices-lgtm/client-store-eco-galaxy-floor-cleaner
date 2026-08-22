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
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { BulkActionBar, BulkActionOption } from '@/components/admin/BulkActionBar';
import { safeFetch } from '@/lib/apiClient';

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

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/faq?admin=true&search=${encodeURIComponent(search)}&category=${selectedCategory}`);
      if (!res.ok) throw new Error('Failed to load FAQs');
      const data = await res.json();
      setFaqs(data.faqs || []);
      setCategories(data.categories || []);
      setSelectedIds([]);
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (selectedIds.length === faqs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(faqs.map((f) => f.id));
    }
  };

  const handleExecuteBulkAction = async (actionKey: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);

    try {
      const { ok, error } = await safeFetch('/api/admin/faq/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          action: actionKey,
        }),
      });

      if (!ok) {
        setNotification({ type: 'error', text: error || 'Bulk action failed' });
      } else {
        setNotification({ type: 'success', text: 'Bulk FAQ action completed successfully.' });
        await fetchFaqs();
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'Bulk action failed' });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkActions: BulkActionOption[] = [
    { label: 'Activate Selected', actionKey: 'ACTIVATE', variant: 'success' },
    { label: 'Deactivate Selected', actionKey: 'DEACTIVATE', variant: 'outline' },
    {
      label: 'Delete Selected',
      actionKey: 'DELETE',
      variant: 'destructive',
      icon: Trash2,
      confirmMessage: `Permanently delete ${selectedIds.length} selected FAQ items?`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">FAQ Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage frequently asked questions, customer answers, and categorized help accordion.
          </p>
        </div>

        <Link
          href="/admin/faq/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>New FAQ</span>
        </Link>
      </div>

      {notification && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-medium ${
            notification.type === 'success'
              ? 'border border-success/30 bg-success/10 text-success'
              : 'border border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or answers..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FAQs Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading FAQs...</span>
          </div>
        ) : faqs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={faqs.length > 0 && selectedIds.length === faqs.length}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all FAQs"
                      className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                    />
                  </th>
                  <th className="py-3 px-4">Question</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Sort Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {faqs.map((f) => {
                  const isSelected = selectedIds.includes(f.id);
                  return (
                    <tr
                      key={f.id}
                      className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(f.id)}
                          aria-label={`Select FAQ ${f.question}`}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                        />
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <p className="line-clamp-1">{f.question}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                          {f.answer}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {f.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            f.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {f.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                        {f.sortOrder}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggle(f.id)}
                            disabled={togglingId === f.id}
                            className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            {f.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <Link
                            href={`/admin/faq/${f.id}`}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label={`Edit FAQ`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(f.id, f.question)}
                            disabled={deletingId === f.id}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
                            aria-label={`Delete FAQ`}
                          >
                            {deletingId === f.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">No FAQs created yet.</p>
            <Link
              href="/admin/faq/new"
              className="inline-block rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow"
            >
              Create First FAQ
            </Link>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={faqs.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={() => setSelectedIds(faqs.map((f) => f.id))}
        isAllSelected={selectedIds.length === faqs.length}
        isLoading={isBulkLoading}
        actions={bulkActions}
        onExecuteAction={handleExecuteBulkAction}
      />
    </div>
  );
}

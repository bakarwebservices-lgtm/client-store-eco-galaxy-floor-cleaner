'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageStatus } from '@prisma/client';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { BulkActionBar, BulkActionOption } from '@/components/admin/BulkActionBar';
import { safeFetch } from '@/lib/apiClient';

interface PageItem {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  createdAt: string;
  updatedAt: string;
}

export const dynamic = 'force-dynamic';

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pages?admin=true&search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Failed to load pages');
      const data = await res.json();
      setPages(data.pages || []);
      setSelectedIds([]);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error loading pages' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPages();
  };

  const handleDelete = async (pageId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete page "${title}"?`)) return;

    setDeletingId(pageId);
    setNotification(null);
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete page');

      setNotification({ type: 'success', text: `Page "${title}" deleted successfully.` });
      fetchPages();
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
    if (selectedIds.length === pages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pages.map((p) => p.id));
    }
  };

  const handleExecuteBulkAction = async (actionKey: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);

    try {
      const { ok, error } = await safeFetch('/api/admin/pages/bulk', {
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
        setNotification({ type: 'success', text: 'Bulk page action completed successfully.' });
        await fetchPages();
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'Bulk action failed' });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkActions: BulkActionOption[] = [
    { label: 'Publish Selected', actionKey: 'PUBLISH', variant: 'success' },
    { label: 'Draft Selected', actionKey: 'DRAFT', variant: 'outline' },
    {
      label: 'Delete Selected',
      actionKey: 'DELETE',
      variant: 'destructive',
      icon: Trash2,
      confirmMessage: `Permanently delete ${selectedIds.length} selected pages?`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Custom Pages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage static CMS pages (About, Policies, Terms, Brand Story).
          </p>
        </div>

        <Link
          href="/admin/pages/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>New Page</span>
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

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages by title or slug..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>
      </div>

      {/* Pages Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading custom pages...</span>
          </div>
        ) : pages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={pages.length > 0 && selectedIds.length === pages.length}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all pages"
                      className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                    />
                  </th>
                  <th className="py-3 px-4">Page Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">URL Slug</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pages.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          aria-label={`Select page ${p.title}`}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                        />
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {p.title}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            p.status === 'PUBLISHED'
                              ? 'bg-success/10 text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        /pages/{p.slug}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.status === 'PUBLISHED' && (
                            <Link
                              href={`/pages/${p.slug}`}
                              target="_blank"
                              className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              title="View on Storefront"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          <Link
                            href={`/admin/pages/${p.id}`}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label={`Edit ${p.title}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.title)}
                            disabled={deletingId === p.id}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
                            aria-label={`Delete ${p.title}`}
                          >
                            {deletingId === p.id ? (
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
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">No pages created yet.</p>
            <Link
              href="/admin/pages/new"
              className="inline-block rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow"
            >
              Create First Page
            </Link>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={pages.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={() => setSelectedIds(pages.map((p) => p.id))}
        isAllSelected={selectedIds.length === pages.length}
        isLoading={isBulkLoading}
        actions={bulkActions}
        onExecuteAction={handleExecuteBulkAction}
      />
    </div>
  );
}

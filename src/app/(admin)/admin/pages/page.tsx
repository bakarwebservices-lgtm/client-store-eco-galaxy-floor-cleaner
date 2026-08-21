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
  ArrowLeft,
} from 'lucide-react';

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

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pages?admin=true&search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Failed to load pages');
      const data = await res.json();
      setPages(data.pages || []);
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
              <h1 className="text-base font-bold leading-tight">Custom Pages</h1>
              <p className="text-xs text-muted-foreground">Manage static CMS pages (About, Policies, Terms)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/pages/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Page</span>
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

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or slug..."
              className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>

          <div className="text-xs text-muted-foreground font-medium">
            {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
          </div>
        </div>

        {/* Pages Table */}
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Loading custom pages...</p>
          </div>
        ) : pages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center space-y-3">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
            <h2 className="text-sm font-bold text-foreground">No pages created yet</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create essential store policy and information pages like About Us, Shipping & Returns.
            </p>
            <Link
              href="/admin/pages/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              <span>Create Custom Page</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Page Title</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3">Last Updated</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span>{page.title}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
                      /pages/{page.slug}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {page.status === PageStatus.ACTIVE ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Hidden
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground text-[11px]">
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {page.status === PageStatus.ACTIVE && (
                          <Link
                            href={`/pages/${page.slug}`}
                            target="_blank"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="View live page"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        <Link
                          href={`/admin/pages/${page.id}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Edit page"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === page.id}
                          onClick={() => handleDelete(page.id, page.title)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                          title="Delete page"
                        >
                          {deletingId === page.id ? (
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

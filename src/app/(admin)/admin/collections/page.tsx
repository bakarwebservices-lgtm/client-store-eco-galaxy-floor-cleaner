'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Sparkles,
  ListOrdered,
  ArrowLeft,
} from 'lucide-react';

interface CollectionItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  type: 'MANUAL' | 'SMART';
  ruleField?: string | null;
  ruleOperator?: string | null;
  ruleValue?: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: {
    products: number;
  };
}

export const dynamic = 'force-dynamic';

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/collections?admin=true');
      if (!res.ok) throw new Error('Failed to load collections');
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error loading collections' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleDelete = async (colId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete collection "${name}"?`)) return;

    setDeletingId(colId);
    setNotification(null);
    try {
      const res = await fetch(`/api/collections/${colId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete collection');
      }

      setNotification({ type: 'success', text: `Collection "${name}" removed successfully.` });
      fetchCollections();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCollections = collections.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

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
              <h1 className="text-base font-bold leading-tight">Collections</h1>
              <p className="text-xs text-muted-foreground">Manage manual and dynamic smart collections</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/categories"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Categories
            </Link>
            <Link
              href="/admin/collections/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Collection</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
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
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search collection name or slug..."
              className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="text-xs text-muted-foreground font-medium">
            {filteredCollections.length} {filteredCollections.length === 1 ? 'Collection' : 'Collections'}
          </div>
        </div>

        {/* Collections Table */}
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Loading collections...</p>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center space-y-3">
            <Layers className="h-8 w-8 text-muted-foreground mx-auto" />
            <h2 className="text-sm font-bold text-foreground">No collections created yet</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create manual product groupings or smart automated rule collections to showcase across the store.
            </p>
            <Link
              href="/admin/collections/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              <span>Create Collection</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Collection</th>
                  <th className="px-5 py-3">Type & Rule</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCollections.map((col) => (
                  <tr key={col.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {col.imageUrl ? (
                          <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-border bg-muted shrink-0">
                            <Image
                              src={col.imageUrl}
                              alt={col.imageAlt || col.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground font-bold shrink-0">
                            <Layers className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-foreground block">{col.name}</span>
                          {col.description && (
                            <span className="text-[11px] text-muted-foreground line-clamp-1">
                              {col.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {col.type === 'SMART' ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            <Sparkles className="h-3 w-3" />
                            <span>Smart Rule</span>
                          </span>
                          <span className="block font-mono text-[10px] text-muted-foreground">
                            {col.ruleField} {col.ruleOperator} &quot;{col.ruleValue}&quot;
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            <ListOrdered className="h-3 w-3" />
                            <span>Manual ({col._count?.products || 0} items)</span>
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
                      /collections/{col.slug}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {col.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Hidden
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/collections/${col.slug}`}
                          target="_blank"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="View on storefront"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          href={`/admin/collections/${col.id}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Edit collection"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === col.id}
                          onClick={() => handleDelete(col.id, col.name)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                          title="Delete collection"
                        >
                          {deletingId === col.id ? (
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

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
  CheckCircle,
  Sparkles,
  ListOrdered,
} from 'lucide-react';
import { BulkActionBar, BulkActionOption } from '@/components/admin/BulkActionBar';
import { safeFetch } from '@/lib/apiClient';

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

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/collections?admin=true');
      if (!res.ok) throw new Error('Failed to load collections');
      const data = await res.json();
      setCollections(data.collections || []);
      setSelectedIds([]);
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (selectedIds.length === filteredCollections.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCollections.map((c) => c.id));
    }
  };

  const handleExecuteBulkAction = async (actionKey: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);

    try {
      const { ok, error } = await safeFetch('/api/admin/collections/bulk', {
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
        setNotification({ type: 'success', text: `Bulk action completed successfully.` });
        await fetchCollections();
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'Bulk action failed' });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkActions: BulkActionOption[] = [
    { label: 'Activate', actionKey: 'ACTIVATE', variant: 'success' },
    { label: 'Deactivate', actionKey: 'DEACTIVATE', variant: 'outline' },
    {
      label: 'Delete Selected',
      actionKey: 'DELETE',
      variant: 'destructive',
      icon: Trash2,
      confirmMessage: `Are you sure you want to delete ${selectedIds.length} selected collections?`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Collections Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Curate manual and automated smart collections for storefront merchandizing.
          </p>
        </div>

        <Link
          href="/admin/collections/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>New Collection</span>
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
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search collections by name or slug..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Collections Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading collections...</span>
          </div>
        ) : filteredCollections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={filteredCollections.length > 0 && selectedIds.length === filteredCollections.length}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all collections"
                      className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                    />
                  </th>
                  <th className="py-3 px-4">Collection</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Products</th>
                  <th className="py-3 px-4 text-center">Sort Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCollections.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                          aria-label={`Select collection ${c.name}`}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/20 flex items-center justify-center">
                            {c.imageUrl ? (
                              <Image
                                src={c.imageUrl}
                                alt={c.imageAlt || c.name}
                                fill
                                sizes="40px"
                                className="object-cover object-center"
                              />
                            ) : (
                              <Layers className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-xs line-clamp-1">{c.name}</p>
                            <p className="text-[11px] text-muted-foreground">slug: {c.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            c.type === 'SMART'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {c.type === 'SMART' ? <Sparkles className="h-2.5 w-2.5" /> : <ListOrdered className="h-2.5 w-2.5" />}
                          <span>{c.type}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            c.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-muted-foreground">
                        {c._count?.products || 0}
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground font-mono">
                        {c.sortOrder}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/collections/${c.slug}`}
                            target="_blank"
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="View on Storefront"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            href={`/admin/collections/${c.id}`}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label={`Edit ${c.name}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            disabled={deletingId === c.id}
                            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
                            aria-label={`Delete ${c.name}`}
                          >
                            {deletingId === c.id ? (
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
            <Layers className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">No collections found.</p>
            <Link
              href="/admin/collections/new"
              className="inline-block rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow"
            >
              Create Collection
            </Link>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filteredCollections.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={() => setSelectedIds(filteredCollections.map((c) => c.id))}
        isAllSelected={selectedIds.length === filteredCollections.length}
        isLoading={isBulkLoading}
        actions={bulkActions}
        onExecuteAction={handleExecuteBulkAction}
      />
    </div>
  );
}

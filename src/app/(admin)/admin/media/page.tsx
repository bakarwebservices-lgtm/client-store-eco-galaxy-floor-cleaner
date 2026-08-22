'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Search, Trash2, Copy, Check, Image as ImageIcon, Edit3, Loader2 } from 'lucide-react';
import { MediaUploadModal } from '@/components/admin/MediaUploadModal';
import { BulkActionBar, BulkActionOption } from '@/components/admin/BulkActionBar';
import { safeFetch } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '24',
        ...(search ? { q: search } : {}),
      });

      const res = await fetch(`/api/media?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Failed to load media assets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [page, search]);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

    try {
      const { ok, error } = await safeFetch<any>(`/api/media/${id}`, { method: 'DELETE' });
      if (ok) {
        fetchAssets();
      } else {
        alert(error || 'Failed to delete media asset');
      }
    } catch (err: any) {
      console.error('Delete error', err);
      alert(err?.message || 'Failed to delete media asset');
    }
  };

  const handleEditAltText = async (id: string, currentAlt: string) => {
    const newAlt = prompt('Edit Alt Text for Accessibility & SEO:', currentAlt);
    if (!newAlt || newAlt.trim() === currentAlt) return;

    try {
      const { ok, error } = await safeFetch<any>(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altText: newAlt.trim() }),
      });
      if (ok) {
        fetchAssets();
      } else {
        alert(error || 'Failed to update alt text');
      }
    } catch (err: any) {
      console.error('Update error', err);
      alert(err?.message || 'Failed to update alt text');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    if (selectedIds.length === assets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assets.map((a) => a.id));
    }
  };

  const handleExecuteBulkAction = async (actionKey: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);

    try {
      const { ok, error } = await safeFetch('/api/admin/media/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!ok) {
        alert(error || 'Bulk delete failed');
      } else {
        await fetchAssets();
      }
    } catch (err: any) {
      alert(err?.message || 'Bulk delete failed');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const bulkActions: BulkActionOption[] = [
    {
      label: 'Delete Selected',
      actionKey: 'DELETE',
      variant: 'destructive',
      icon: Trash2,
      confirmMessage: `Permanently delete ${selectedIds.length} selected media assets?`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Media Library</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Store and manage product photography, banners, and marketing assets.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>Upload Media</span>
        </button>
      </div>

      {/* Search and Select Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search media files by name, filename, or alt text..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {assets.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={assets.length > 0 && selectedIds.length === assets.length}
              onChange={toggleSelectAllVisible}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/20"
            />
            <span>Select all {assets.length} on page</span>
          </label>
        )}
      </div>

      {/* Media Grid View */}
      {loading ? (
        <div className="py-24 text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Loading media assets...</span>
        </div>
      ) : assets.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {assets.map((asset) => {
            const isSelected = selectedIds.includes(asset.id);
            return (
              <div
                key={asset.id}
                className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:border-primary/50 ${
                  isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-border'
                }`}
              >
                {/* Select Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(asset.id)}
                    aria-label={`Select ${asset.filename}`}
                    className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary/20 shadow"
                  />
                </div>

                {/* Thumbnail Preview */}
                <div className="relative aspect-square w-full bg-muted/20 overflow-hidden">
                  <Image
                    src={asset.url}
                    alt={asset.altText || asset.filename}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Details Footer */}
                <div className="p-2.5 space-y-1 bg-card">
                  <p className="text-[11px] font-semibold text-foreground truncate" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate" title={asset.altText || 'No Alt Text'}>
                    {asset.altText || <span className="italic">No Alt Text</span>}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-border mt-1">
                    <button
                      onClick={() => handleCopyUrl(asset.url, asset.id)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                      title="Copy URL"
                    >
                      {copiedId === asset.id ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditAltText(asset.id, asset.altText || '')}
                      className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                      title="Edit Alt Text"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id, asset.filename)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10"
                      title="Delete Asset"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center space-y-3 bg-card rounded-2xl border border-dashed border-border p-8">
          <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">No media assets found in library.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Upload Your First Image</span>
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Prev
          </button>
          <span className="text-xs text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Media Upload Modal */}
      {modalOpen && (
        <MediaUploadModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            fetchAssets();
            setModalOpen(false);
          }}
        />
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={assets.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={() => setSelectedIds(assets.map((a) => a.id))}
        isAllSelected={selectedIds.length === assets.length}
        isLoading={isBulkLoading}
        actions={bulkActions}
        onExecuteAction={handleExecuteBulkAction}
      />
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Search, Trash2, Copy, Check, Image as ImageIcon, Edit3 } from 'lucide-react';
import { MediaUploadModal } from '@/components/admin/MediaUploadModal';

export const dynamic = 'force-dynamic';

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        setTotalPages(data.pagination.totalPages || 1);
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
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAssets();
      } else {
        alert('Failed to delete media asset');
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const handleEditAltText = async (id: string, currentAlt: string) => {
    const newAlt = prompt('Edit Alt Text for Accessibility & SEO:', currentAlt);
    if (!newAlt || newAlt.trim() === currentAlt) return;

    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altText: newAlt.trim() }),
      });
      if (res.ok) {
        fetchAssets();
      }
    } catch (err) {
      console.error('Update error', err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/admin" className="hover:underline">Admin</Link>
              <span>/</span>
              <span className="text-foreground font-medium">Media Library</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-1">Media Asset Management</h1>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary-hover transition-colors w-fit"
          >
            <Plus className="h-4 w-4" />
            <span>Upload New Asset</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Search & Filter */}
        <div className="flex items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search media by filename or alt text..."
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Media Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
            Loading media library...
          </div>
        ) : assets.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
              >
                {/* Thumbnail */}
                <div className="relative aspect-square w-full bg-muted/20 overflow-hidden">
                  <Image
                    src={asset.url}
                    alt={asset.altText || asset.filename}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Info & Actions */}
                <div className="p-3 space-y-1.5 flex flex-col flex-1">
                  <p className="text-xs font-semibold text-foreground truncate" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate" title={asset.altText}>
                    alt: <span className="italic">{asset.altText || 'None'}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {(asset.sizeBytes / 1024).toFixed(1)} KB
                  </p>

                  <div className="flex items-center justify-between border-t border-border pt-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(asset.url, asset.id)}
                      className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy Image URL"
                    >
                      {copiedId === asset.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedId === asset.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditAltText(asset.id, asset.altText || '')}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Edit Alt Text"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(asset.id, asset.filename)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Delete Asset"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-3 rounded-2xl border border-dashed border-border">
            <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">No media assets found in library.</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-block rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow"
            >
              Upload First Asset
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
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
      </main>

      {/* Upload & Picker Modal */}
      <MediaUploadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={() => {
          fetchAssets();
        }}
      />
    </div>
  );
}

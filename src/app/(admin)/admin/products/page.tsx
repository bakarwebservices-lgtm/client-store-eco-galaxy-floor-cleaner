'use client';
import { formatCurrency } from '@/lib/format';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { safeFetch } from '@/lib/apiClient';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search ? { q: search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      const { ok, data } = await safeFetch<any>(`/api/products?${params.toString()}`);
      if (ok && data) {
        setProducts(data.products || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load admin products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleSoftDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive and soft-delete "${name}"?`)) return;

    try {
      const { ok, error } = await safeFetch<any>(`/api/products/${id}`, { method: 'DELETE' });
      if (ok) {
        fetchProducts();
      } else {
        alert(error || 'Failed to delete product');
      }
    } catch (err: any) {
      console.error('Delete error', err);
      alert(err?.message || 'Failed to delete product');
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
              <span className="text-foreground font-medium">Products</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-1">Product Catalog</h1>
          </div>

          <Link
            href="/admin/products/new"
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary-hover transition-colors w-fit"
          >
            <Plus className="h-4 w-4" />
            <span>Create Product</span>
          </Link>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
          <form onSubmit={handleSearch} className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, tag, or description..."
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground animate-pulse">
              Loading product catalog...
            </div>
          ) : products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Variants</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => {
                    const img = p.images[0];
                    return (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/20">
                              {img ? (
                                <Image
                                  src={img.url}
                                  alt={img.altText || p.name}
                                  fill
                                  sizes="40px"
                                  className="object-cover object-center"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                  N/A
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-xs line-clamp-1">{p.name}</p>
                              <p className="text-[11px] text-muted-foreground">slug: {p.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              p.status === 'ACTIVE'
                                ? 'bg-success/10 text-success'
                                : p.status === 'DRAFT'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {formatCurrency(p.price)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {p.hasVariants ? `${p.variants.length} variations` : 'Single SKU'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              aria-label={`Edit ${p.name}`}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => handleSoftDelete(p.id, p.name)}
                              className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                              aria-label={`Archive ${p.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
              <Package className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">No products in catalog yet.</p>
              <Link
                href="/admin/products/new"
                className="inline-block rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow"
              >
                Create First Product
              </Link>
            </div>
          )}
        </div>

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
      </main>
    </div>
  );
}

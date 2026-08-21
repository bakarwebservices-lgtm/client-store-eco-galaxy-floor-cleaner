'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BlogStatus } from '@prisma/client';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  author?: string | null;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  status: BlogStatus;
  publishedAt?: string | null;
  tags: string[];
  createdAt: string;
}

export const dynamic = 'force-dynamic';

export default function AdminBlogPage() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blog?admin=true&limit=50&search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Failed to load articles');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error loading articles' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles();
  };

  const handleDelete = async (articleId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete article "${title}"?`)) return;

    setDeletingId(articleId);
    setNotification(null);
    try {
      const res = await fetch(`/api/blog/${articleId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete article');

      setNotification({ type: 'success', text: `Article "${title}" removed successfully.` });
      fetchArticles();
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
              <h1 className="text-base font-bold leading-tight">Blog & Editorial</h1>
              <p className="text-xs text-muted-foreground">Manage journal articles, guides, and brand stories</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/blog/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Article</span>
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
              placeholder="Search title or excerpt..."
              className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>

          <div className="text-xs text-muted-foreground font-medium">
            {articles.length} {articles.length === 1 ? 'Article' : 'Articles'}
          </div>
        </div>

        {/* Articles Table */}
        {loading ? (
          <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p>Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center space-y-3">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
            <h2 className="text-sm font-bold text-foreground">No articles created yet</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Start building your content marketing strategy with editorial journal articles.
            </p>
            <Link
              href="/admin/blog/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              <span>Create Article</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Article</th>
                  <th className="px-5 py-3">Author</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-muted/30 transition-colors">
                    {/* Thumbnail & Title */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {article.featuredImageUrl ? (
                          <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-border bg-muted shrink-0">
                            <Image
                              src={article.featuredImageUrl}
                              alt={article.featuredImageAlt || article.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground font-bold shrink-0">
                            <BookOpen className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-foreground block">{article.title}</span>
                          {article.excerpt && (
                            <span className="text-[11px] text-muted-foreground line-clamp-1">
                              {article.excerpt}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Author */}
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {article.author || 'Editorial'}
                    </td>

                    {/* Slug */}
                    <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
                      /blog/{article.slug}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 text-center">
                      {article.status === BlogStatus.PUBLISHED ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                          Draft
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-muted-foreground text-[11px]">
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString()
                        : 'Unpublished'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {article.status === BlogStatus.PUBLISHED && (
                          <Link
                            href={`/blog/${article.slug}`}
                            target="_blank"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="View live article"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        <Link
                          href={`/admin/blog/${article.id}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Edit article"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === article.id}
                          onClick={() => handleDelete(article.id, article.title)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                          title="Delete article"
                        >
                          {deletingId === article.id ? (
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

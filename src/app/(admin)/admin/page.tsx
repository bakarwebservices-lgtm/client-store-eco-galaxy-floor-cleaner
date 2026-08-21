'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, ShieldCheck, UserCheck, Package, ShoppingCart, Layers, MessageSquare, FolderTree, Tag, BookOpen, FileText, HelpCircle, Mail, Bell } from 'lucide-react';

interface AdminUserSession {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/admin/me');
        if (!res.ok) {
          router.push('/admin/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error('Failed to load admin session', err);
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/admin/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Logout failed', err);
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              AW
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Store Admin</h1>
              <p className="text-xs text-muted-foreground">Operations & Catalog Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-full px-3 py-1 bg-muted/30">
                <span className="h-2 w-2 rounded-full bg-success inline-block"></span>
                <span className="font-medium text-foreground">{user.name}</span>
                <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {user.role}
                </span>
              </div>
            )}

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Banner */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">
                Welcome back, {user?.name || 'Administrator'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Admin authentication verified. Ready to start vertical feature development.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-success bg-success/10 border border-success/20 px-3 py-1.5 rounded-lg w-fit">
              <ShieldCheck className="h-4 w-4" />
              <span>Admin Middleware Active</span>
            </div>
          </div>
        </section>

        {/* Quick Domain Navigation Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/products" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Catalog</span>
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">Products & SKUs</div>
            <p className="text-xs text-muted-foreground">Manage catalog items, variants & pricing</p>
          </Link>

          <Link href="/admin/categories" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Taxonomy</span>
              <FolderTree className="h-4 w-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">Categories</div>
            <p className="text-xs text-muted-foreground">Storefront navigation hierarchy & filters</p>
          </Link>

          <Link href="/admin/collections" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Curations</span>
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">Collections</div>
            <p className="text-xs text-muted-foreground">Manual groupings & dynamic smart rules</p>
          </Link>

          <Link href="/admin/orders" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Fulfillment</span>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">Orders & Returns</div>
            <p className="text-xs text-muted-foreground">Payment status, shipping, RMA returns</p>
          </Link>

          <Link href="/admin/reviews" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Feedback</span>
              <MessageSquare className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-foreground">Review Moderation</div>
            <p className="text-xs text-muted-foreground">Moderate customer ratings & photo reviews</p>
          </Link>

          <Link href="/admin/coupons" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Promotions</span>
              <Tag className="h-4 w-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">Coupons & Discounts</div>
            <p className="text-xs text-muted-foreground">Manage promo codes, percentages & fixed vouchers</p>
          </Link>

          <Link href="/admin/blog" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Journal</span>
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">Blog Articles</div>
            <p className="text-xs text-muted-foreground">Editorial stories, styling guides & news</p>
          </Link>

          <Link href="/admin/pages" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Content</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">Custom Pages</div>
            <p className="text-xs text-muted-foreground">Static policy, about, terms & custom CMS pages</p>
          </Link>

          <Link href="/admin/faq" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Support</span>
              <HelpCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">FAQ Management</div>
            <p className="text-xs text-muted-foreground">Customer questions, answers & category grouping</p>
          </Link>

          <Link href="/admin/newsletter" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Audience</span>
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">Newsletter Subscribers</div>
            <p className="text-xs text-muted-foreground">Marketing subscribers & CSV exports</p>
          </Link>

          <Link href="/admin/contact" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Inbound</span>
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">Customer Messages</div>
            <p className="text-xs text-muted-foreground">Storefront contact inquiries & email replies</p>
          </Link>

          <Link href="/admin/waitlist" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Inventory</span>
              <Bell className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-foreground">Waitlist & Restock</div>
            <p className="text-xs text-muted-foreground">Backorder queues, ETA dates & restock alerts</p>
          </Link>

          <Link href="/admin/media" className="rounded-xl border border-border bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-wider">Assets</span>
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">Media Library</div>
            <p className="text-xs text-muted-foreground">Upload and manage media with alt text</p>
          </Link>
        </section>
      </main>
    </div>
  );
}

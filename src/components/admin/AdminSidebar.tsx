'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Layers,
  ShoppingBag,
  Ticket,
  Star,
  BookOpen,
  FileText,
  HelpCircle,
  Mail,
  MessageSquare,
  Image as ImageIcon,
  Clock,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Shield,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { safeFetch } from '@/lib/apiClient';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Categories', href: '/admin/categories', icon: FolderTree },
      { label: 'Collections', href: '/admin/collections', icon: Layers },
      { label: 'Media Library', href: '/admin/media', icon: ImageIcon },
    ],
  },
  {
    title: 'Sales & Customers',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
      { label: 'Coupons', href: '/admin/coupons', icon: Ticket },
      { label: 'Reviews', href: '/admin/reviews', icon: Star },
      { label: 'Waitlist', href: '/admin/waitlist', icon: Clock },
    ],
  },
  {
    title: 'Content & Marketing',
    items: [
      { label: 'Blog Articles', href: '/admin/blog', icon: BookOpen },
      { label: 'Custom Pages', href: '/admin/pages', icon: FileText },
      { label: 'FAQ Manager', href: '/admin/faq', icon: HelpCircle },
      { label: 'Newsletter', href: '/admin/newsletter', icon: Mail },
      { label: 'Inbound Contact', href: '/admin/contact', icon: MessageSquare },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Store Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

function getStoreInitials(name?: string): string {
  if (!name || !name.trim()) return 'AD';
  const clean = name.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function AdminShell({
  children,
  initialStoreName = 'Store',
  initialLogoUrl,
}: {
  children: React.ReactNode;
  initialStoreName?: string;
  initialLogoUrl?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<{ email?: string; name?: string; role?: string } | null>(null);
  const [storeName, setStoreName] = useState(initialStoreName);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(initialLogoUrl);

  // If on login page, don't show admin shell
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) return;

    async function loadAdminUser() {
      try {
        const { ok, data } = await safeFetch<any>('/api/auth/admin/me');
        if (ok && data?.user) {
          setAdminUser(data.user);
        }
      } catch {
        // Ignored
      }
    }

    async function loadSettings() {
      try {
        const { ok, data } = await safeFetch<any>('/api/settings');
        if (ok && data?.settings) {
          if (data.settings.storeName) setStoreName(data.settings.storeName);
          if (data.settings.logoUrl) setLogoUrl(data.settings.logoUrl);
        }
      } catch {
        // Ignored
      }
    }

    loadAdminUser();
    loadSettings();
  }, [isLoginPage]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await safeFetch('/api/auth/admin/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch {
      router.push('/admin/login');
    }
  };

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-card text-card-foreground border-r border-border">
      {/* Top Brand Header */}
      <div>
        <div className="flex h-16 items-center justify-between px-5 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground group min-w-0">
            {logoUrl ? (
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-muted/30 p-1 shadow-xs">
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-black shadow-sm tracking-wider">
                {getStoreInitials(storeName)}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm leading-tight font-extrabold truncate max-w-[125px]" title={storeName}>
                {storeName}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                Store Manager
              </span>
            </div>
          </Link>
          <div className="flex items-center shrink-0">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              title="Open live storefront in new tab"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-xs"
            >
              <span>View Store</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-6 px-3 py-4 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </h3>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        active
                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        <span>{item.label}</span>
                      </div>
                      {active && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom User Profile & Logout */}
      <div className="p-3 border-t border-border bg-card/50 space-y-2">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:text-primary transition-all shadow-xs"
        >
          <span>Back to Storefront</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </Link>

        <div className="flex items-center justify-between rounded-xl bg-muted/40 p-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">
                {adminUser?.name || 'Staff User'}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="inline-block rounded bg-primary/15 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-primary">
                  {adminUser?.role || 'Admin'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out of Admin"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Backdrop Drawer */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 border-b border-border bg-card/90 backdrop-blur z-40 px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-foreground hover:bg-muted"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href="/admin" className="flex items-center gap-2 font-bold tracking-tight text-foreground min-w-0">
          {logoUrl ? (
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded border border-border/80 bg-muted/40 p-0.5">
              <img
                src={logoUrl}
                alt={storeName}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-black tracking-wider">
              {getStoreInitials(storeName)}
            </div>
          )}
          <span className="text-sm font-extrabold truncate max-w-[140px]" title={storeName}>
            {storeName}
          </span>
        </Link>

        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title="View Store"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-xs"
        >
          <span>Store</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-card shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pt-16 lg:pt-0">
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Users,
  Globe,
  ShoppingCart,
  ArrowUpRight,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
  PieChart,
  Repeat,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { safeFetch } from '@/lib/apiClient';

interface AnalyticsData {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    currency: string;
    averageOrderValue: number;
  };
  customerSplit: {
    firstTimeOrders: number;
    firstTimeRevenue: number;
    firstTimePct: number;
    returningOrders: number;
    returningRevenue: number;
    returningPct: number;
  };
  channels: Array<{
    channel: string;
    orders: number;
    revenue: number;
    percentage: number;
  }>;
  abandonedCheckouts: {
    total: number;
    totalLostRevenue: number;
    recoveredCount: number;
    recoveredRevenue: number;
    recoveryRate: number;
  };
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const { ok, data: resData } = await safeFetch<AnalyticsData>('/api/admin/analytics');
      if (ok && resData) {
        setData(resData);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Calculating store analytics & conversion attribution...</span>
        </div>
      </div>
    );
  }

  const currency = data?.summary.currency || 'PKR';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Marketing & Store Analytics</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-3 w-3" />
              <span>1st-Party Attribution</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time attribution, acquisition channels, and customer retention metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Sales</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {formatCurrency(data?.summary.totalRevenue || 0, currency)}
          </div>
          <p className="text-[11px] text-muted-foreground">Across {data?.summary.totalOrders || 0} customer orders</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Average Order Value</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {formatCurrency(data?.summary.averageOrderValue || 0, currency)}
          </div>
          <p className="text-[11px] text-muted-foreground">Average spend per conversion</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Customer Retention</span>
            <Repeat className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {data?.customerSplit.returningPct || 0}%
          </div>
          <p className="text-[11px] text-muted-foreground">
            {data?.customerSplit.returningOrders || 0} repeat buyer orders
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Cart Recovery Rate</span>
            <ShoppingCart className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {data?.abandonedCheckouts.recoveryRate || 0}%
          </div>
          <p className="text-[11px] text-muted-foreground">
            {data?.abandonedCheckouts.recoveredCount || 0} of {data?.abandonedCheckouts.total || 0} carts recovered
          </p>
        </div>
      </div>

      {/* Two Columns: Channels vs Customer Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales by Acquisition Channel */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Sales by Marketing Channel</h2>
              <p className="text-xs text-muted-foreground">First-touch and UTM-attributed orders</p>
            </div>
            <Globe className="h-4 w-4 text-primary" />
          </div>

          <div className="space-y-4">
            {data?.channels && data.channels.length > 0 ? (
              data.channels.map((ch, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      {ch.channel}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{ch.orders} order{ch.orders !== 1 ? 's' : ''} ({ch.percentage}%)</span>
                      <span className="font-bold text-foreground font-mono">
                        {formatCurrency(ch.revenue, currency)}
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.max(ch.percentage, 4)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No orders tracked yet. Marketing channels will populate automatically as visits convert.
              </div>
            )}
          </div>
        </div>

        {/* Customer Cohort Breakdown */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Customer Cohorts</h2>
              <p className="text-xs text-muted-foreground">First-time vs. repeat revenue</p>
            </div>
            <Users className="h-4 w-4 text-blue-500" />
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">1st-Time Buyers</span>
                <span className="font-mono font-bold text-foreground">
                  {data?.customerSplit.firstTimePct || 0}%
                </span>
              </div>
              <div className="text-lg font-black text-foreground">
                {formatCurrency(data?.customerSplit.firstTimeRevenue || 0, currency)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {data?.customerSplit.firstTimeOrders || 0} orders from new customers
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-600 dark:text-blue-400">Repeat Customers</span>
                <span className="font-mono font-bold text-foreground">
                  {data?.customerSplit.returningPct || 0}%
                </span>
              </div>
              <div className="text-lg font-black text-foreground">
                {formatCurrency(data?.customerSplit.returningRevenue || 0, currency)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {data?.customerSplit.returningOrders || 0} orders from brand advocates
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Abandoned Checkouts Section */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground">Abandoned Checkouts Summary</h2>
            <p className="text-xs text-muted-foreground">
              Captured sessions where customers dropped off before completing checkout.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <span>View Orders</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Abandoned
            </span>
            <p className="text-xl font-bold text-foreground">{data?.abandonedCheckouts.total || 0} carts</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Recovered Revenue
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(data?.abandonedCheckouts.recoveredRevenue || 0, currency)}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Unrecovered Pipeline
            </span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(data?.abandonedCheckouts.totalLostRevenue || 0, currency)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

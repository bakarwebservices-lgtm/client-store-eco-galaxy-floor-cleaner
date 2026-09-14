import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    await requireAdminAuth();

    // 1. Fetch Orders with paymentMeta for attribution & channel analysis
    const orders = await db.order.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        orderNumber: true,
        totalPrice: true,
        currency: true,
        paymentStatus: true,
        customerId: true,
        paymentMeta: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const storeCurrency = orders[0]?.currency || 'PKR';

    // 2. Marketing Channel Breakdown
    const channelMap: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      const meta = (o.paymentMeta as any) || {};
      const attr = meta.attribution || {};
      const source = attr.source || 'Direct';
      
      let bucket = 'Direct';
      const s = source.toLowerCase();
      if (s.includes('instagram')) bucket = 'Instagram';
      else if (s.includes('facebook') || s.includes('fb')) bucket = 'Facebook';
      else if (s.includes('google')) bucket = 'Google Search / Ads';
      else if (s.includes('tiktok')) bucket = 'TikTok';
      else if (s.includes('whatsapp')) bucket = 'WhatsApp';
      else if (s.includes('youtube')) bucket = 'YouTube';
      else bucket = 'Direct / Organic';

      if (!channelMap[bucket]) {
        channelMap[bucket] = { count: 0, revenue: 0 };
      }
      channelMap[bucket].count += 1;
      channelMap[bucket].revenue += o.totalPrice || 0;
    });

    const channelStats = Object.entries(channelMap).map(([channel, data]) => ({
      channel,
      orders: data.count,
      revenue: Math.round(data.revenue),
      percentage: totalOrders > 0 ? Math.round((data.count / totalOrders) * 100) : 0,
    })).sort((a, b) => b.orders - a.orders);

    // 3. First-Time vs. Returning Customer Ratio
    const customerOrderCounts: Record<string, number> = {};
    orders.forEach((o) => {
      customerOrderCounts[o.customerId] = (customerOrderCounts[o.customerId] || 0) + 1;
    });

    let firstTimeOrders = 0;
    let returningOrders = 0;
    let firstTimeRevenue = 0;
    let returningRevenue = 0;

    orders.forEach((o) => {
      if (customerOrderCounts[o.customerId] === 1) {
        firstTimeOrders += 1;
        firstTimeRevenue += o.totalPrice || 0;
      } else {
        returningOrders += 1;
        returningRevenue += o.totalPrice || 0;
      }
    });

    // 4. Abandoned Checkout Statistics
    const abandoned = await db.abandonedCheckout.findMany({
      select: {
        id: true,
        total: true,
        recoveredAt: true,
        createdAt: true,
      },
    });

    const totalAbandoned = abandoned.length;
    const totalLostRevenue = abandoned.filter((a) => !a.recoveredAt).reduce((sum, a) => sum + (a.total || 0), 0);
    const recoveredCount = abandoned.filter((a) => Boolean(a.recoveredAt)).length;
    const recoveredRevenue = abandoned.filter((a) => Boolean(a.recoveredAt)).reduce((sum, a) => sum + (a.total || 0), 0);
    const recoveryRate = totalAbandoned > 0 ? Math.round((recoveredCount / totalAbandoned) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue),
        currency: storeCurrency,
        averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      },
      customerSplit: {
        firstTimeOrders,
        firstTimeRevenue: Math.round(firstTimeRevenue),
        firstTimePct: totalOrders > 0 ? Math.round((firstTimeOrders / totalOrders) * 100) : 0,
        returningOrders,
        returningRevenue: Math.round(returningRevenue),
        returningPct: totalOrders > 0 ? Math.round((returningOrders / totalOrders) * 100) : 0,
      },
      channels: channelStats,
      abandonedCheckouts: {
        total: totalAbandoned,
        totalLostRevenue: Math.round(totalLostRevenue),
        recoveredCount,
        recoveredRevenue: Math.round(recoveredRevenue),
        recoveryRate,
      },
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Failed to get analytics data:', error);
    return NextResponse.json({ error: 'Failed to retrieve analytics' }, { status: 500 });
  }
}

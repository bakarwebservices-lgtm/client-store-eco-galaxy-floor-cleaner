import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Test direct database connection query
    await db.$queryRaw`SELECT 1 as ping`;

    // 2. Query seeded record counts to verify tables and data
    const [adminCount, settingsCount, productCount] = await Promise.all([
      db.adminUser.count(),
      db.setting.count(),
      db.product.count({ where: { deletedAt: null } }),
    ]);

    const latencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'healthy',
        database: {
          connected: true,
          provider: 'Supabase PostgreSQL',
          latency: `${latencyMs}ms`,
          stats: {
            adminUsers: adminCount,
            storeSettings: settingsCount,
            activeProducts: productCount,
          },
        },
        environment: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error('Health check database connection error:', error);

    return NextResponse.json(
      {
        status: 'degraded',
        database: {
          connected: false,
          latency: `${latencyMs}ms`,
          error: error?.message || 'Unable to connect to database',
        },
        environment: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { BulkIdsSchema } from '@/lib/validation/bulk';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();

    const body = await req.json();
    const parsed = BulkIdsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bulk media payload' }, { status: 400 });
    }

    const { ids } = parsed.data;

    const deleted = await db.mediaAsset.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      success: true,
      count: deleted.count,
      message: `Deleted ${deleted.count} media assets.`,
    });
  } catch (error: any) {
    console.error('Bulk media error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk media action failed' }, { status: error?.status || 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { BulkToggleActionSchema } from '@/lib/validation/bulk';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();

    const body = await req.json();
    const parsed = BulkToggleActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bulk collection payload' }, { status: 400 });
    }

    const { ids, action } = parsed.data;

    if (action === 'ACTIVATE' || action === 'DEACTIVATE') {
      const isActive = action === 'ACTIVATE';
      const updated = await db.collection.updateMany({
        where: { id: { in: ids } },
        data: { isActive },
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `${isActive ? 'Activated' : 'Deactivated'} ${updated.count} collections.`,
      });
    }

    if (action === 'DELETE') {
      const deleted = await db.$transaction(async (tx) => {
        await tx.collectionProduct.deleteMany({ where: { collectionId: { in: ids } } });
        return tx.collection.deleteMany({ where: { id: { in: ids } } });
      });

      return NextResponse.json({
        success: true,
        count: deleted.count,
        message: `Deleted ${deleted.count} collections.`,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk collection error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk collection action failed' }, { status: error?.status || 500 });
  }
}

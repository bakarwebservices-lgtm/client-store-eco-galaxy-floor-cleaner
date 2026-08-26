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
      return NextResponse.json({ error: 'Invalid bulk FAQ payload' }, { status: 400 });
    }

    const { ids, action } = parsed.data;

    if (action === 'ACTIVATE' || action === 'DEACTIVATE') {
      const isActive = action === 'ACTIVATE';
      const updated = await db.faqItem.updateMany({
        where: { id: { in: ids } },
        data: { isActive },
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `${isActive ? 'Activated' : 'Deactivated'} ${updated.count} FAQ items.`,
      });
    }

    if (action === 'DELETE') {
      const deleted = await db.faqItem.deleteMany({
        where: { id: { in: ids } },
      });

      return NextResponse.json({
        success: true,
        count: deleted.count,
        message: `Deleted ${deleted.count} FAQ items.`,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk FAQ error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk FAQ action failed' }, { status: error?.status || 500 });
  }
}

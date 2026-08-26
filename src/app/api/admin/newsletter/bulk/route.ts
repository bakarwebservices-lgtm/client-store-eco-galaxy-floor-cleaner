import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { BulkNewsletterActionSchema } from '@/lib/validation/bulk';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();

    const body = await req.json();
    const parsed = BulkNewsletterActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bulk newsletter payload' }, { status: 400 });
    }

    const { ids, action } = parsed.data;

    if (action === 'SUBSCRIBE' || action === 'UNSUBSCRIBE') {
      const isActive = action === 'SUBSCRIBE';
      const updated = await db.newsletter.updateMany({
        where: { id: { in: ids } },
        data: { isActive },
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `${isActive ? 'Resubscribed' : 'Unsubscribed'} ${updated.count} subscribers.`,
      });
    }

    if (action === 'DELETE') {
      const deleted = await db.newsletter.deleteMany({
        where: { id: { in: ids } },
      });

      return NextResponse.json({
        success: true,
        count: deleted.count,
        message: `Deleted ${deleted.count} subscribers.`,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk newsletter error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk newsletter action failed' }, { status: error?.status || 500 });
  }
}

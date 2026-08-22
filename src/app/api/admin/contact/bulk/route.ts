import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { BulkContactActionSchema } from '@/lib/validation/bulk';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();

    const body = await req.json();
    const parsed = BulkContactActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bulk contact payload' }, { status: 400 });
    }

    const { ids, action } = parsed.data;

    if (action === 'MARK_READ' || action === 'MARK_UNREAD') {
      const read = action === 'MARK_READ';
      const updated = await db.contactInquiry.updateMany({
        where: { id: { in: ids } },
        data: { read },
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `Marked ${updated.count} messages as ${read ? 'read' : 'unread'}.`,
      });
    }

    if (action === 'DELETE') {
      const deleted = await db.contactInquiry.deleteMany({
        where: { id: { in: ids } },
      });

      return NextResponse.json({
        success: true,
        count: deleted.count,
        message: `Deleted ${deleted.count} messages.`,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk contact error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk contact action failed' }, { status: error?.status || 500 });
  }
}

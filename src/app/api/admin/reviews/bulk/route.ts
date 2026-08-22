import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { BulkReviewActionSchema } from '@/lib/validation/bulk';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();

    const body = await req.json();
    const parsed = BulkReviewActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bulk review payload' }, { status: 400 });
    }

    const { ids, action } = parsed.data;

    if (action === 'APPROVE' || action === 'UNAPPROVE') {
      const isApproved = action === 'APPROVE';
      const updated = await db.review.updateMany({
        where: { id: { in: ids } },
        data: { isApproved },
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `${isApproved ? 'Approved' : 'Unapproved'} ${updated.count} reviews.`,
      });
    }

    if (action === 'DELETE') {
      const deleted = await db.review.deleteMany({
        where: { id: { in: ids } },
      });

      return NextResponse.json({
        success: true,
        count: deleted.count,
        message: `Deleted ${deleted.count} reviews.`,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk review error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk review action failed' }, { status: error?.status || 500 });
  }
}

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
      return NextResponse.json({ error: 'Invalid bulk coupon payload' }, { status: 400 });
    }

    const { ids, action } = parsed.data;

    if (action === 'ACTIVATE' || action === 'DEACTIVATE') {
      const isActive = action === 'ACTIVATE';
      const updated = await db.coupon.updateMany({
        where: { id: { in: ids } },
        data: { isActive },
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `${isActive ? 'Activated' : 'Deactivated'} ${updated.count} coupons.`,
      });
    }

    if (action === 'DELETE') {
      // For coupons with orders, deactivate instead of breaking history
      const coupons = await db.coupon.findMany({
        where: { id: { in: ids } },
        select: { id: true, usedCount: true },
      });

      const usedIds = coupons.filter((c) => c.usedCount > 0).map((c) => c.id);
      const unusedIds = coupons.filter((c) => c.usedCount === 0).map((c) => c.id);

      await db.$transaction(async (tx) => {
        if (usedIds.length > 0) {
          await tx.coupon.updateMany({
            where: { id: { in: usedIds } },
            data: { isActive: false },
          });
        }
        if (unusedIds.length > 0) {
          await tx.coupon.deleteMany({
            where: { id: { in: unusedIds } },
          });
        }
      });

      return NextResponse.json({
        success: true,
        count: ids.length,
        message: `Processed ${ids.length} coupons (${unusedIds.length} deleted, ${usedIds.length} deactivated due to order history).`,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk coupon error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk coupon action failed' }, { status: error?.status || 500 });
  }
}

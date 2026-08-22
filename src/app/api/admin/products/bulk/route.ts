import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { BulkProductActionSchema } from '@/lib/validation/bulk';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();

    const body = await req.json();
    const parsed = BulkProductActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid bulk product payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { ids, action } = parsed.data;

    if (action === 'SET_ACTIVE' || action === 'SET_DRAFT' || action === 'SET_ARCHIVED') {
      const statusMap = {
        SET_ACTIVE: 'ACTIVE',
        SET_DRAFT: 'DRAFT',
        SET_ARCHIVED: 'ARCHIVED',
      } as const;

      const status = statusMap[action];

      const updated = await db.$transaction(async (tx) => {
        return tx.product.updateMany({
          where: { id: { in: ids } },
          data: { status },
        });
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `Updated status to ${status} for ${updated.count} products.`,
      });
    }

    if (action === 'DELETE') {
      const deleted = await db.$transaction(async (tx) => {
        // Remove relationships
        await tx.categoryProduct.deleteMany({ where: { productId: { in: ids } } });
        await tx.collectionProduct.deleteMany({ where: { productId: { in: ids } } });
        await tx.productVariant.deleteMany({ where: { productId: { in: ids } } });
        await tx.productImage.deleteMany({ where: { productId: { in: ids } } });
        await tx.review.deleteMany({ where: { productId: { in: ids } } });
        await tx.waitlistSubscription.deleteMany({ where: { productId: { in: ids } } });

        return tx.product.deleteMany({
          where: { id: { in: ids } },
        });
      });

      return NextResponse.json({
        success: true,
        count: deleted.count,
        message: `Deleted ${deleted.count} products.`,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk product error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk product action failed' }, { status: error?.status || 500 });
  }
}

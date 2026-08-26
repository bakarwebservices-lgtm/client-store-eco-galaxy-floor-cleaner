import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const cancelParamsSchema = z.object({
  id: z.string().uuid('Invalid order ID format, must be a valid UUID'),
});

/**
 * Cancel Order & Reverse Inventory
 * - Sets cancelledAt timestamp
 * - In the same transaction, restores stock back to ProductVariant.inventoryQty for all order line items
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const rawParams = await params;
    const parsedParams = cancelParamsSchema.safeParse(rawParams);

    if (!parsedParams.success) {
      return NextResponse.json(
        { error: 'Invalid order ID', details: parsedParams.error.format() },
        { status: 400 }
      );
    }

    const { id } = parsedParams.data;

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.cancelledAt) {
      return NextResponse.json({ error: 'This order is already cancelled.' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      // 1. Mark order cancelled
      await tx.order.update({
        where: { id },
        data: {
          cancelledAt: new Date(),
        },
      });

      // 2. Re-increment variant inventory for each line item
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { inventoryQty: { increment: item.quantity } },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Order cancelled and stock inventory reversed successfully.' });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Cancel order error:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}

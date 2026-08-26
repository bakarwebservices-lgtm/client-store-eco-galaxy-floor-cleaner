import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { FulfillmentStatus, PaymentStatus } from '@prisma/client';
import { dispatchRestockAlerts } from '@/lib/email/restock';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const returnOrderSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500).default('Customer Return'),
  restockInventory: z.boolean().default(true),
  refundPayment: z.boolean().default(true),
});

/**
 * Process Return (RMA) for Dispatched / Fulfilled Orders
 * Step 1: Sets fulfillmentStatus = RETURNED
 * Step 2: Optionally sets paymentStatus = REFUNDED
 * Step 3: If restockInventory = true (items inspected and returned to shelf), atomically increments ProductVariant stock
 * Step 4: Appends return audit notes
 * Step 5: If variant stock transitions from 0 to >0, triggers restock waitlist notification via after() hook
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAuth();
    const { id } = await params;
    const body = await req.json();

    const parsed = returnOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid return request data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { reason, restockInventory, refundPayment } = parsed.data;

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.fulfillmentStatus === FulfillmentStatus.RETURNED) {
      return NextResponse.json({ error: 'This order has already been processed as returned.' }, { status: 400 });
    }

    const replenishedVariantsToAlert: { productId: string; variantId: string }[] = [];

    await db.$transaction(async (tx) => {
      const returnNote = `\n[${new Date().toISOString()}] Return Processed by ${admin.name}: Reason: "${reason}". Restocked: ${restockInventory ? 'YES' : 'NO'}. Refunded: ${refundPayment ? 'YES' : 'NO'}.`;

      // 1. Update Order Statuses
      await tx.order.update({
        where: { id },
        data: {
          fulfillmentStatus: FulfillmentStatus.RETURNED,
          paymentStatus: refundPayment ? PaymentStatus.REFUNDED : order.paymentStatus,
          notes: (order.notes || '') + returnNote,
        },
      });

      // 2. If Restock Requested: Atomically re-increment inventory and detect 0 -> positive transition
      if (restockInventory) {
        for (const item of order.items) {
          if (item.variantId) {
            const currentVariant = await tx.productVariant.findUnique({
              where: { id: item.variantId },
              select: { id: true, productId: true, inventoryQty: true },
            });
            if (currentVariant) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { inventoryQty: { increment: item.quantity } },
              });
              // If previous inventory was 0, it is now replenished to positive!
              if (currentVariant.inventoryQty === 0 && item.quantity > 0) {
                replenishedVariantsToAlert.push({
                  productId: currentVariant.productId,
                  variantId: currentVariant.id,
                });
              }
            }
          }
        }
      }
    });

    // Trigger restock waitlist notification email dispatch in background
    if (replenishedVariantsToAlert.length > 0) {
      after(async () => {
        try {
          for (const target of replenishedVariantsToAlert) {
            await dispatchRestockAlerts({
              productId: target.productId,
              variantId: target.variantId,
            });
          }
        } catch (dispatchErr) {
          console.error('[RMA Restock Hook Error]', dispatchErr);
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Return processed successfully.${restockInventory ? ' Inventory restocked.' : ' Stock left unchanged.'}`,
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Process return error:', error);
    return NextResponse.json({ error: 'Failed to process return' }, { status: 500 });
  }
}

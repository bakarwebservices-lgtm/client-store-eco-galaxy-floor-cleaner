import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { FulfillmentStatus } from '@prisma/client';
import { dispatchRestockAlerts } from '@/lib/email/restock';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const cancelParamsSchema = z.object({
  id: z.string().uuid('Invalid order ID format, must be a valid UUID'),
});

const cancelBodySchema = z.object({
  reason: z.string().max(500).optional(),
  restockInventory: z.boolean().default(true),
});

/**
 * Cancel Order & Safe Inventory Restock
 * - Enforces idempotency (rejects if already cancelled)
 * - Restocks variant inventory if requested and not already returned
 * - Defensively checks variant existence to avoid P2025 crashes
 * - Dispatches restock alert emails if stock transitions 0 -> >0
 * - Formats and stamps audit log note to order.notes
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAuth();
    const rawParams = await params;
    const parsedParams = cancelParamsSchema.safeParse(rawParams);

    if (!parsedParams.success) {
      return NextResponse.json(
        { error: 'Invalid order ID', details: parsedParams.error.format() },
        { status: 400 }
      );
    }

    const { id } = parsedParams.data;

    let bodyData = { reason: '', restockInventory: true };
    try {
      const json = await req.json();
      const parsedBody = cancelBodySchema.safeParse(json);
      if (parsedBody.success) {
        bodyData = {
          reason: parsedBody.data.reason || '',
          restockInventory: parsedBody.data.restockInventory ?? true,
        };
      }
    } catch {
      // Body is optional, defaults applied
    }

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Safety Lock 1: Reject if already cancelled (prevents double-action)
    if (order.cancelledAt) {
      return NextResponse.json({ error: 'This order is already cancelled.' }, { status: 400 });
    }

    // Safety Lock 2: If order was already RETURNED, its stock was already returned to shelves!
    const isAlreadyRestockedByReturn = order.fulfillmentStatus === FulfillmentStatus.RETURNED;
    const shouldRestock = bodyData.restockInventory && !isAlreadyRestockedByReturn;

    const replenishedVariantsToAlert: { productId: string; variantId: string }[] = [];

    await db.$transaction(async (tx) => {
      const cancelReasonText = bodyData.reason.trim() || 'Admin Cancellation';
      const restockAuditText = isAlreadyRestockedByReturn
        ? 'ALREADY_RESTOCKED_BY_PREVIOUS_RETURN'
        : shouldRestock
        ? 'YES'
        : 'NO';

      const cancelNote = `\n[${new Date().toISOString()}] Cancelled by Admin (${admin.name}): Reason: "${cancelReasonText}". Restocked: ${restockAuditText}.`;

      // 1. Mark order cancelled and append ledger audit note
      await tx.order.update({
        where: { id },
        data: {
          cancelledAt: new Date(),
          notes: (order.notes || '') + cancelNote,
        },
      });

      // 2. Re-increment variant inventory for each line item (if requested)
      if (shouldRestock) {
        for (const item of order.items) {
          if (item.variantId) {
            // Defensive Check: verify variant exists in DB
            const currentVariant = await tx.productVariant.findUnique({
              where: { id: item.variantId },
              select: { id: true, productId: true, inventoryQty: true },
            });

            if (currentVariant) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { inventoryQty: { increment: item.quantity } },
              });

              // Check if stock transitioned from 0 -> >0 for waitlist notifications
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

    // Background Hook: Send restock waitlist notification emails if any variant was replenished
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
          console.error('[Cancel Restock Waitlist Alert Error]', dispatchErr);
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Order cancelled successfully.${shouldRestock ? ' Inventory restocked.' : ' Stock left unchanged.'}`,
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Cancel order error:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}

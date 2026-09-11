import { db } from '@/lib/db';
import { FulfillmentStatus } from '@prisma/client';

/**
 * Idempotently cancels an order and safely restocks inventory.
 * Guards against double-restocks if an order was already returned or cancelled.
 */
export async function cancelAndRestockOrder(
  orderId: string,
  reason: string,
  restockInventory = true,
  performedBy = 'System'
): Promise<{ success: boolean; alreadyCancelled?: boolean }> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return { success: false };
  }

  // Idempotency: Ignore if already cancelled
  if (order.cancelledAt) {
    return { success: true, alreadyCancelled: true };
  }

  const isAlreadyRestockedByReturn = order.fulfillmentStatus === FulfillmentStatus.RETURNED;
  const shouldRestock = restockInventory && !isAlreadyRestockedByReturn;

  await db.$transaction(async (tx) => {
    const cancelReasonText = reason.trim() || 'Order Cancellation';
    const restockAuditText = isAlreadyRestockedByReturn
      ? 'ALREADY_RESTOCKED_BY_PREVIOUS_RETURN'
      : shouldRestock
      ? 'YES'
      : 'NO';

    const cancelNote = `\n[${new Date().toISOString()}] Cancelled by ${performedBy}: "${cancelReasonText}". Restocked: ${restockAuditText}.`;

    // 1. Mark order cancelled and append ledger memo
    await tx.order.update({
      where: { id: orderId },
      data: {
        cancelledAt: new Date(),
        whatsappConfirmationStatus: 'CANCELLED',
        notes: (order.notes || '') + cancelNote,
      },
    });

    // 2. Re-increment variant inventory for each line item (if requested)
    if (shouldRestock) {
      for (const item of order.items) {
        if (item.variantId) {
          const currentVariant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { id: true, inventoryQty: true },
          });

          if (currentVariant) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { inventoryQty: { increment: item.quantity } },
            });
          }
        }
      }
    }
  });

  return { success: true };
}

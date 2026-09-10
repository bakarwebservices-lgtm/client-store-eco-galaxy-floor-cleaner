import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { BulkOrderActionSchema } from '@/lib/validation/bulk';
import { sendFulfillmentUpdateEmail } from '@/lib/email';
import { dispatchRestockAlerts } from '@/lib/email/restock';
import { refreshShipmentTracking } from '@/lib/couriers/service';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminAuth();

    const body = await req.json();
    const parsed = BulkOrderActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid bulk order payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { ids, action, fulfillmentStatus, paymentStatus, sendNotification, restockInventory, reason } = parsed.data;

    if (action === 'UPDATE_FULFILLMENT' && fulfillmentStatus) {
      // Find eligible orders before update
      const orders = await db.order.findMany({
        where: { id: { in: ids } },
        include: {
          items: true,
          customer: { select: { email: true } },
        },
      });

      const isBecomingReturned = fulfillmentStatus === 'RETURNED';
      const shouldRestock = isBecomingReturned && restockInventory !== false;
      const replenishedVariantsToAlert: { productId: string; variantId: string }[] = [];

      await db.$transaction(async (tx) => {
        if (shouldRestock) {
          const variantDeltas = new Map<string, number>();
          for (const ord of orders) {
            // Safety check: skip if already returned or cancelled
            if (ord.fulfillmentStatus === 'RETURNED' || ord.cancelledAt) continue;
            for (const it of ord.items) {
              if (it.variantId) {
                variantDeltas.set(it.variantId, (variantDeltas.get(it.variantId) || 0) + it.quantity);
              }
            }
          }

          for (const [variantId, qty] of variantDeltas) {
            const currentVariant = await tx.productVariant.findUnique({
              where: { id: variantId },
              select: { id: true, productId: true, inventoryQty: true },
            });
            if (currentVariant) {
              await tx.productVariant.update({
                where: { id: variantId },
                data: { inventoryQty: { increment: qty } },
              });
              if (currentVariant.inventoryQty === 0 && qty > 0) {
                replenishedVariantsToAlert.push({
                  productId: currentVariant.productId,
                  variantId: currentVariant.id,
                });
              }
            }
          }
        }

        for (const ord of orders) {
          let updatedNotes = ord.notes || '';
          if (isBecomingReturned && ord.fulfillmentStatus !== 'RETURNED') {
            const isAlreadyReleased = Boolean(ord.cancelledAt);
            const restockAudit = isAlreadyReleased ? 'ALREADY_RELEASED' : (shouldRestock ? 'YES' : 'NO');
            updatedNotes += `\n[${new Date().toISOString()}] Bulk Fulfillment Marked RETURNED by ${admin.name}: Reason: "${reason || 'Bulk Return'}". Restocked: ${restockAudit}.`;
          } else if (reason?.trim()) {
            updatedNotes += `\n[${new Date().toISOString()}] Bulk Status Updated by ${admin.name}: Reason: "${reason.trim()}"`;
          }

          await tx.order.update({
            where: { id: ord.id },
            data: {
              fulfillmentStatus,
              notes: updatedNotes,
            },
          });
        }
      });

      if (replenishedVariantsToAlert.length > 0) {
        after(async () => {
          try {
            for (const target of replenishedVariantsToAlert) {
              await dispatchRestockAlerts({ productId: target.productId, variantId: target.variantId });
            }
          } catch (err) {
            console.error('[Bulk Return Restock Alert Error]', err);
          }
        });
      }

      // If status is FULFILLED and sendNotification is true, dispatch notifications
      if (fulfillmentStatus === 'FULFILLED' && sendNotification) {
        for (const ord of orders) {
          const addr = (ord.shippingAddress as any) || {};
          const targetEmail = ord.customer?.email || addr.email;
          if (targetEmail && ord.fulfillmentStatus !== 'FULFILLED') {
            try {
              await sendFulfillmentUpdateEmail({
                orderNumber: ord.orderNumber,
                email: targetEmail,
                currency: ord.currency,
                totalPrice: ord.totalPrice,
                shippingAddress: {
                  firstName: addr.firstName || '',
                  lastName: addr.lastName || '',
                  addressLine1: addr.addressLine1 || '',
                  addressLine2: addr.addressLine2,
                  city: addr.city || '',
                  province: addr.province,
                  postalCode: addr.postalCode,
                  phone: addr.phone,
                },
              });
            } catch (emailErr) {
              console.warn(`[BulkOrders] Failed to dispatch email for order ${ord.orderNumber}:`, emailErr);
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        count: orders.length,
        message: `Updated fulfillment status for ${orders.length} orders.${shouldRestock ? ' Inventory restocked.' : ''}`,
      });
    }

    if (action === 'UPDATE_PAYMENT' && paymentStatus) {
      const orders = await db.order.findMany({
        where: { id: { in: ids } },
        include: { items: true },
      });

      const isBecomingRefunded = paymentStatus === 'REFUNDED';
      const shouldRestock = isBecomingRefunded && restockInventory === true;
      const replenishedVariantsToAlert: { productId: string; variantId: string }[] = [];

      await db.$transaction(async (tx) => {
        if (shouldRestock) {
          const variantDeltas = new Map<string, number>();
          for (const ord of orders) {
            if (ord.paymentStatus === 'REFUNDED' || ord.fulfillmentStatus === 'RETURNED' || ord.cancelledAt) continue;
            for (const it of ord.items) {
              if (it.variantId) {
                variantDeltas.set(it.variantId, (variantDeltas.get(it.variantId) || 0) + it.quantity);
              }
            }
          }

          for (const [variantId, qty] of variantDeltas) {
            const currentVariant = await tx.productVariant.findUnique({
              where: { id: variantId },
              select: { id: true, productId: true, inventoryQty: true },
            });
            if (currentVariant) {
              await tx.productVariant.update({
                where: { id: variantId },
                data: { inventoryQty: { increment: qty } },
              });
              if (currentVariant.inventoryQty === 0 && qty > 0) {
                replenishedVariantsToAlert.push({
                  productId: currentVariant.productId,
                  variantId: currentVariant.id,
                });
              }
            }
          }
        }

        for (const ord of orders) {
          let updatedNotes = ord.notes || '';
          if (isBecomingRefunded && ord.paymentStatus !== 'REFUNDED') {
            const isAlreadyReleased = Boolean(ord.cancelledAt) || ord.fulfillmentStatus === 'RETURNED';
            const restockAudit = isAlreadyReleased ? 'ALREADY_RELEASED' : (shouldRestock ? 'YES' : 'NO');
            updatedNotes += `\n[${new Date().toISOString()}] Bulk Payment Marked REFUNDED by ${admin.name}: Reason: "${reason || 'Bulk Refund'}". Restocked: ${restockAudit}.`;
          } else if (reason?.trim()) {
            updatedNotes += `\n[${new Date().toISOString()}] Bulk Status Updated by ${admin.name}: Reason: "${reason.trim()}"`;
          }

          await tx.order.update({
            where: { id: ord.id },
            data: {
              paymentStatus,
              notes: updatedNotes,
            },
          });
        }
      });

      if (replenishedVariantsToAlert.length > 0) {
        after(async () => {
          try {
            for (const target of replenishedVariantsToAlert) {
              await dispatchRestockAlerts({ productId: target.productId, variantId: target.variantId });
            }
          } catch (err) {
            console.error('[Bulk Refund Restock Alert Error]', err);
          }
        });
      }

      return NextResponse.json({
        success: true,
        count: orders.length,
        message: `Updated payment status for ${orders.length} orders.${shouldRestock ? ' Inventory restocked.' : ''}`,
      });
    }

    if (action === 'CANCEL') {
      // Safety Lock 1: Query only eligible orders that are NOT already cancelled
      const eligibleOrders = await db.order.findMany({
        where: { id: { in: ids }, cancelledAt: null },
        include: { items: true },
      });

      if (eligibleOrders.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          message: 'Selected orders were already cancelled.',
        });
      }

      const shouldRestock = restockInventory !== false;
      const cancelReasonText = reason?.trim() || 'Bulk Cancellation';
      const replenishedVariantsToAlert: { productId: string; variantId: string }[] = [];

      await db.$transaction(async (tx) => {
        // Safety Lock 2: In-Memory Variant Aggregation Pattern (Zero DB row locks)
        if (shouldRestock) {
          const variantDeltas = new Map<string, number>();
          for (const ord of eligibleOrders) {
            // Safety check: if order was already returned, items were already returned to shelf!
            if (ord.fulfillmentStatus === 'RETURNED') continue;
            for (const it of ord.items) {
              if (it.variantId) {
                variantDeltas.set(it.variantId, (variantDeltas.get(it.variantId) || 0) + it.quantity);
              }
            }
          }

          for (const [variantId, qty] of variantDeltas) {
            const currentVariant = await tx.productVariant.findUnique({
              where: { id: variantId },
              select: { id: true, productId: true, inventoryQty: true },
            });
            if (currentVariant) {
              await tx.productVariant.update({
                where: { id: variantId },
                data: { inventoryQty: { increment: qty } },
              });
              if (currentVariant.inventoryQty === 0 && qty > 0) {
                replenishedVariantsToAlert.push({
                  productId: currentVariant.productId,
                  variantId: currentVariant.id,
                });
              }
            }
          }
        }

        // Safety Lock 3: Update orders and append audit memo to ledger notes
        for (const ord of eligibleOrders) {
          const isAlreadyReturned = ord.fulfillmentStatus === 'RETURNED';
          const restockAudit = isAlreadyReturned ? 'ALREADY_RETURNED' : (shouldRestock ? 'YES' : 'NO');
          const memo = `\n[${new Date().toISOString()}] Bulk Cancelled by Admin (${admin.name}): Reason: "${cancelReasonText}". Restocked: ${restockAudit}.`;

          await tx.order.update({
            where: { id: ord.id },
            data: {
              cancelledAt: new Date(),
              notes: (ord.notes || '') + memo,
            },
          });
        }
      });

      // Background Hook: Send restock waitlist alerts if variants were replenished
      if (replenishedVariantsToAlert.length > 0) {
        after(async () => {
          try {
            for (const target of replenishedVariantsToAlert) {
              await dispatchRestockAlerts({ productId: target.productId, variantId: target.variantId });
            }
          } catch (err) {
            console.error('[Bulk Cancel Restock Alert Error]', err);
          }
        });
      }

      return NextResponse.json({
        success: true,
        count: eligibleOrders.length,
        message: `Cancelled ${eligibleOrders.length} orders.${shouldRestock ? ' Inventory restocked.' : ' Stock left unchanged.'}`,
      });
    }

    if (action === 'DELETE') {
      // Delete associated items and orders in transaction
      const deleted = await db.$transaction(async (tx) => {
        await tx.orderItem.deleteMany({
          where: { orderId: { in: ids } },
        });
        return tx.order.deleteMany({
          where: { id: { in: ids } },
        });
      });

      return NextResponse.json({
        success: true,
        count: deleted.count,
        message: `Deleted ${deleted.count} orders.`,
      });
    }

    if (action === 'SYNC_COURIER') {
      const shipments = await db.shipment.findMany({
        where: {
          orderId: { in: ids },
          trackingNumber: { not: '' },
        },
        select: { id: true, orderId: true, status: true },
      });

      if (shipments.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          message: 'No active shipments found for selected orders to sync.',
        });
      }

      let updatedCount = 0;
      for (const sh of shipments) {
        try {
          const res = await refreshShipmentTracking(sh.id);
          if (res.success && res.status !== sh.status) {
            updatedCount++;
          }
        } catch {
          // ignore error to keep bulk operation moving
        }
      }

      return NextResponse.json({
        success: true,
        count: shipments.length,
        message: `Synced ${shipments.length} shipment(s) across selected orders (${updatedCount} status change(s)).`,
      });
    }

    return NextResponse.json({ error: 'Unsupported bulk action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk order error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk order action failed' }, { status: 500 });
  }
}

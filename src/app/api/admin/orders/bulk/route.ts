import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { BulkOrderActionSchema } from '@/lib/validation/bulk';
import { sendFulfillmentUpdateEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();

    const body = await req.json();
    const parsed = BulkOrderActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid bulk order payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { ids, action, fulfillmentStatus, paymentStatus, sendNotification } = parsed.data;

    if (action === 'UPDATE_FULFILLMENT' && fulfillmentStatus) {
      // Find eligible orders before update to check which ones transition to FULFILLED
      const orders = await db.order.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          orderNumber: true,
          currency: true,
          totalPrice: true,
          shippingAddress: true,
          fulfillmentStatus: true,
          customer: {
            select: { email: true },
          },
        },
      });

      const updated = await db.$transaction(async (tx) => {
        return tx.order.updateMany({
          where: { id: { in: ids } },
          data: { fulfillmentStatus },
        });
      });

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
        count: updated.count,
        message: `Updated fulfillment status for ${updated.count} orders.`,
      });
    }

    if (action === 'UPDATE_PAYMENT' && paymentStatus) {
      const updated = await db.$transaction(async (tx) => {
        return tx.order.updateMany({
          where: { id: { in: ids } },
          data: { paymentStatus },
        });
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `Updated payment status for ${updated.count} orders.`,
      });
    }

    if (action === 'CANCEL') {
      const updated = await db.$transaction(async (tx) => {
        return tx.order.updateMany({
          where: { id: { in: ids } },
          data: {
            cancelledAt: new Date(),
          },
        });
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `Cancelled ${updated.count} orders.`,
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

    return NextResponse.json({ error: 'Unsupported bulk action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk order error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk order action failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { PaymentStatus, FulfillmentStatus } from '@prisma/client';
import { z } from 'zod';

import { sendFulfillmentUpdateEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const updateOrderSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  fulfillmentStatus: z.nativeEnum(FulfillmentStatus).optional(),
  notes: z.string().max(5000).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const { id } = await params;

    const order = await db.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        deletedAt: null,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: { select: { slug: true, images: { take: 1 } } },
            variant: { select: { id: true, title: true, sku: true, inventoryQty: true } },
          },
        },
        shipments: {
          include: {
            events: {
              orderBy: { eventTime: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to retrieve order' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const { id } = await params;
    const body = await req.json();

    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid order update payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { paymentStatus, fulfillmentStatus, notes } = parsed.data;

    // Fetch previous order state to detect fulfillment transition
    const existing = await db.order.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updated = await db.order.update({
      where: { id },
      data: {
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
        ...(typeof notes === 'string' ? { notes } : {}),
      },
    });

    // If transitioned to FULFILLED, dispatch fulfillment notification email
    if (
      fulfillmentStatus === FulfillmentStatus.FULFILLED &&
      existing.fulfillmentStatus !== FulfillmentStatus.FULFILLED
    ) {
      try {
        const addr = (existing.shippingAddress as any) || {};
        const targetEmail = existing.customer?.email || addr.email;
        if (targetEmail) {
          await sendFulfillmentUpdateEmail({
            orderNumber: existing.orderNumber,
            email: targetEmail,
            currency: existing.currency,
            totalPrice: existing.totalPrice,
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
        }
      } catch (emailErr) {
        console.error('[Admin Orders] Failed to dispatch fulfillment update email:', emailErr);
      }
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

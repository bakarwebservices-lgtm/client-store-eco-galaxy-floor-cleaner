import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { PaymentStatus, FulfillmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

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

    const updateData: any = {};
    if (body.paymentStatus && Object.values(PaymentStatus).includes(body.paymentStatus)) {
      updateData.paymentStatus = body.paymentStatus;
    }
    if (body.fulfillmentStatus && Object.values(FulfillmentStatus).includes(body.fulfillmentStatus)) {
      updateData.fulfillmentStatus = body.fulfillmentStatus;
    }
    if (typeof body.notes === 'string') {
      updateData.notes = body.notes;
    }

    const updated = await db.order.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

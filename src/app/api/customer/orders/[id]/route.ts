import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth/customer';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Strict access control: customerId must match
    const order = await db.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        customerId: session.customerId,
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            product: { select: { slug: true, images: { take: 1 } } },
          },
        },
        shipments: {
          include: {
            events: {
              orderBy: { eventTime: 'asc' },
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
  } catch (error) {
    console.error('Failed to get order detail:', error);
    return NextResponse.json({ error: 'Failed to retrieve order' }, { status: 500 });
  }
}

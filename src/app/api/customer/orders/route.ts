import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth/customer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await db.order.findMany({
      where: {
        customerId: session.customerId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: { select: { slug: true, images: { take: 1 } } },
          },
        },
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Failed to get customer orders:', error);
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 });
  }
}

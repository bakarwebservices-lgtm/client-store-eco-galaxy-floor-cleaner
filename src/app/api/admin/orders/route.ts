import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { PaymentStatus, FulfillmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const paymentStatus = searchParams.get('paymentStatus') as PaymentStatus | null;
    const fulfillmentStatus = searchParams.get('fulfillmentStatus') as FulfillmentStatus | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (paymentStatus && Object.values(PaymentStatus).includes(paymentStatus)) {
      where.paymentStatus = paymentStatus;
    }

    if (fulfillmentStatus && Object.values(FulfillmentStatus).includes(fulfillmentStatus)) {
      where.fulfillmentStatus = fulfillmentStatus;
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          items: true,
          shipments: {
            where: { status: { not: ShipmentStatus.CANCELLED } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              courierCode: true,
              courierName: true,
              trackingNumber: true,
              status: true,
            },
          },
        },
      }),
      db.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to get admin orders:', error);
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 });
  }
}

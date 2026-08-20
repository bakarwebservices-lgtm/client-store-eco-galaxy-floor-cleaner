import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentCustomer } from '@/lib/auth/customer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Security Gate: If email is unverified, do not expose past guest orders placed before account registration!
    const whereClause: any = {
      customerId: customer.id,
      deletedAt: null,
    };

    if (!customer.isEmailVerified) {
      // Restrict only to orders placed after the customer record was converted into registered account
      whereClause.createdAt = { gte: customer.createdAt };
    }

    const orders = await db.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: { select: { slug: true, images: { take: 1 } } },
          },
        },
      },
    });

    return NextResponse.json({
      orders,
      isEmailVerified: customer.isEmailVerified,
    });
  } catch (error) {
    console.error('Failed to get customer orders:', error);
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 });
  }
}

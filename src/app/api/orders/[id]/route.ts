import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/auth/admin';
import { verifyOrderAccessToken } from '@/lib/auth/token';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[id]
 * Access Control Policy:
 * Requires either an active Admin session OR a valid signed Order Access Token
 * (via cookie, Bearer authorization header, or ?token= query param).
 * Unauthenticated requests are strictly rejected with 401 Unauthorized.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    // 1. Check Admin session
    const admin = await getAdminSession();

    // 2. Fetch target order
    const order = await db.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                slug: true,
                images: { take: 1 },
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 3. If not admin, verify signed order access token
    if (!admin) {
      const cookieStore = await cookies();
      const tokenFromCookie =
        cookieStore.get(`aw_order_access_${order.orderNumber}`)?.value ||
        cookieStore.get(`aw_order_access_${order.id}`)?.value;

      const authHeader = req.headers.get('authorization');
      const tokenFromHeader = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

      const tokenFromQuery = searchParams.get('token');

      const tokenToVerify = tokenFromCookie || tokenFromHeader || tokenFromQuery;

      if (!tokenToVerify) {
        return NextResponse.json(
          { error: 'Unauthorized. Admin session or valid signed order access token required.' },
          { status: 401 }
        );
      }

      const verified = await verifyOrderAccessToken(tokenToVerify);
      if (
        !verified ||
        (verified.orderId !== order.id && verified.orderNumber !== order.orderNumber)
      ) {
        return NextResponse.json(
          { error: 'Forbidden. Invalid or expired order access token.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Failed to get order:', error);
    return NextResponse.json({ error: 'Failed to retrieve order' }, { status: 500 });
  }
}

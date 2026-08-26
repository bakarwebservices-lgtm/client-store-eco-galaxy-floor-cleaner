import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { dispatchRestockAlerts } from '@/lib/email/restock';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, variantId, limit } = body;

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'Valid productId is required' }, { status: 400 });
    }

    const result = await dispatchRestockAlerts({
      productId,
      variantId: variantId || null,
      limit: limit ? Math.min(200, Math.max(1, parseInt(limit, 10))) : 100,
    });

    return NextResponse.json({
      success: true,
      message: `Dispatched ${result.emailsSent} restock email(s) for ${result.productName}.`,
      result,
    });
  } catch (error: any) {
    console.error('Error triggering restock notification alerts:', error);
    return NextResponse.json({ error: 'Failed to dispatch restock notifications' }, { status: 500 });
  }
}

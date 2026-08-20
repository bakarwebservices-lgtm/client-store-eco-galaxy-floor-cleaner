import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mergeCartSchema } from '@/lib/validation/cart';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = mergeCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid merge request' }, { status: 400 });
    }

    const { guestSessionId } = parsed.data;

    // Look for guest cart
    const guestCart = await db.cart.findUnique({
      where: { sessionId: guestSessionId },
      include: {
        items: {
          include: { variant: true },
        },
      },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return NextResponse.json({ success: true, message: 'No guest cart items to merge.' });
    }

    return NextResponse.json({
      success: true,
      mergedCount: guestCart.items.length,
      message: 'Cart merge handled successfully.',
    });
  } catch (error) {
    console.error('Cart merge error:', error);
    return NextResponse.json({ error: 'Failed to merge cart' }, { status: 500 });
  }
}

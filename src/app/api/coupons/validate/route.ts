import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateCouponSchema } from '@/lib/validation/checkout';
import { DiscountType } from '@prisma/client';
import { formatCurrency } from '@/lib/format';
import { getSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid coupon request' }, { status: 400 });
    }

    const { code, subtotal } = parsed.data;

    const coupon = await db.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ error: 'Coupon code is invalid or has expired.' }, { status: 404 });
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      return NextResponse.json({ error: 'This coupon is not active yet.' }, { status: 400 });
    }

    if (coupon.expiresAt && now > coupon.expiresAt) {
      return NextResponse.json({ error: 'This coupon has expired.' }, { status: 400 });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: 'This coupon has reached its maximum usage limit.' }, { status: 400 });
    }

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      const currency = await getSetting<string>('store.currency', 'PKR');
      return NextResponse.json(
        { error: `Minimum order amount of ${formatCurrency(coupon.minOrderAmount, currency)} required for this coupon.` },
        { status: 400 }
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (subtotal * coupon.discountValue) / 100;
    } else if (coupon.discountType === DiscountType.FIXED) {
      discountAmount = Math.min(subtotal, coupon.discountValue);
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      description: coupon.description,
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}

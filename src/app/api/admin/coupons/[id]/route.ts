import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CouponSchema } from '@/lib/validation/coupon';
import { getAdminSession } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { id } = await params;
    const coupon = await db.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const now = new Date();
    const isExpired = coupon.expiresAt ? new Date(coupon.expiresAt) <= now : false;
    const isDepleted = coupon.maxUses ? coupon.usedCount >= coupon.maxUses : false;
    const isScheduled = coupon.startsAt ? new Date(coupon.startsAt) > now : false;

    let computedState = 'ACTIVE';
    if (!coupon.isActive) computedState = 'INACTIVE';
    else if (isExpired) computedState = 'EXPIRED';
    else if (isDepleted) computedState = 'DEPLETED';
    else if (isScheduled) computedState = 'SCHEDULED';

    return NextResponse.json({
      coupon: {
        ...coupon,
        computedState,
      },
    });
  } catch (error: any) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json({ error: 'Failed to fetch coupon' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = CouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const existing = await db.coupon.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxUses,
      startsAt,
      expiresAt,
      isActive,
    } = parsed.data;

    // Check code collision
    const conflict = await db.coupon.findFirst({
      where: { code, id: { not: id } },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `Coupon code "${code}" is already in use by another coupon` },
        { status: 409 }
      );
    }

    // FIELD LOCKING POLICY:
    // If coupon has been used in live orders (usedCount > 0), preserve historical financial integrity
    // by keeping existing discountType and discountValue.
    const hasLiveUsage = existing.usedCount > 0;
    const finalDiscountType = hasLiveUsage ? existing.discountType : discountType;
    const finalDiscountValue = hasLiveUsage ? existing.discountValue : discountValue;

    const updated = await db.coupon.update({
      where: { id },
      data: {
        code,
        description: description || null,
        discountType: finalDiscountType,
        discountValue: finalDiscountValue,
        minOrderAmount: minOrderAmount !== undefined ? minOrderAmount : null,
        maxUses: maxUses !== undefined ? maxUses : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      coupon: updated,
      valueLockedNotice: hasLiveUsage
        ? 'Discount type and value were preserved because this coupon has completed order history.'
        : undefined,
    });
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { id } = await params;
    const coupon = await db.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // SAFE DELETION POLICY:
    // If usedCount === 0: hard delete record.
    // If usedCount > 0: soft deactivate to preserve order audit history.
    if (coupon.usedCount === 0) {
      await db.coupon.delete({ where: { id } });
      return NextResponse.json({
        success: true,
        action: 'deleted',
        message: `Coupon "${coupon.code}" deleted permanently.`,
      });
    } else {
      const deactivated = await db.coupon.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        action: 'deactivated',
        message: `Coupon "${coupon.code}" has ${coupon.usedCount} order usage(s) and was deactivated to preserve historical order records.`,
        coupon: deactivated,
      });
    }
  } catch (error: any) {
    console.error('Error deleting/deactivating coupon:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { id } = await params;
    const coupon = await db.coupon.findUnique({ where: { id } });
    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const updated = await db.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    });

    return NextResponse.json({
      success: true,
      coupon: updated,
      message: `Coupon "${coupon.code}" is now ${updated.isActive ? 'Active' : 'Inactive'}.`,
    });
  } catch (error: any) {
    console.error('Error toggling coupon status:', error);
    return NextResponse.json({ error: 'Failed to toggle coupon status' }, { status: 500 });
  }
}

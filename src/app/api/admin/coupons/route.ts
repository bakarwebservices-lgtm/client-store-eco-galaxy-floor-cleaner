import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CouponSchema, CouponFilterSchema } from '@/lib/validation/coupon';
import { getAdminSession } from '@/lib/auth/admin';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsedFilter = CouponFilterSchema.safeParse({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || 'all',
      discountType: searchParams.get('discountType') || 'all',
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    if (!parsedFilter.success) {
      return NextResponse.json(
        { error: 'Invalid query filters', details: parsedFilter.error.format() },
        { status: 400 }
      );
    }

    const { search, status, discountType, page, limit } = parsedFilter.data;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.CouponWhereInput = {
      ...(search
        ? {
            OR: [
              { code: { contains: search.toUpperCase() } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(discountType !== 'all' ? { discountType } : {}),
      ...(status === 'active'
        ? {
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          }
        : {}),
      ...(status === 'expired'
        ? {
            expiresAt: { lte: now },
          }
        : {}),
      ...(status === 'inactive'
        ? {
            isActive: false,
          }
        : {}),
    };

    const [coupons, total] = await Promise.all([
      db.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.coupon.count({ where }),
    ]);

    // Enhance response with computed operational status
    const formattedCoupons = coupons.map((c) => {
      const isExpired = c.expiresAt ? new Date(c.expiresAt) <= now : false;
      const isDepleted = c.maxUses ? c.usedCount >= c.maxUses : false;
      const isScheduled = c.startsAt ? new Date(c.startsAt) > now : false;

      let state = 'ACTIVE';
      if (!c.isActive) state = 'INACTIVE';
      else if (isExpired) state = 'EXPIRED';
      else if (isDepleted) state = 'DEPLETED';
      else if (isScheduled) state = 'SCHEDULED';

      return {
        ...c,
        computedState: state,
      };
    });

    return NextResponse.json({
      coupons: formattedCoupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin coupons:', error);
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
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

    // Check code uniqueness
    const existing = await db.coupon.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Coupon code "${code}" already exists` },
        { status: 409 }
      );
    }

    const created = await db.coupon.create({
      data: {
        code,
        description: description || null,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount !== undefined ? minOrderAmount : null,
        maxUses: maxUses !== undefined ? maxUses : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive,
      },
    });

    return NextResponse.json({ success: true, coupon: created }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}

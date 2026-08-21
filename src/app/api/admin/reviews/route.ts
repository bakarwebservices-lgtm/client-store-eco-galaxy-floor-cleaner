import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/auth/admin';
import { AdminReviewFilterSchema } from '@/lib/validation/review';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawParams = {
      status: searchParams.get('status') || 'ALL',
      productId: searchParams.get('productId') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    };

    const parsed = AdminReviewFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { status, productId, search, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status === 'PENDING') {
      where.isApproved = false;
    } else if (status === 'APPROVED') {
      where.isApproved = true;
    }

    if (productId) {
      where.productId = productId;
    }

    if (search) {
      where.OR = [
        { reviewerName: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [reviews, totalCount, pendingCount, approvedCount] = await Promise.all([
      db.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true, altText: true },
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
      }),
      db.review.count({ where }),
      db.review.count({ where: { isApproved: false } }),
      db.review.count({ where: { isApproved: true } }),
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        total: pendingCount + approvedCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

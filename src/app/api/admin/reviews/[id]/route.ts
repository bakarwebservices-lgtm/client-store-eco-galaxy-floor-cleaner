import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/auth/admin';
import { AdminUpdateReviewSchema } from '@/lib/validation/review';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid review ID format' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = AdminUpdateReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid review update payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const existing = await db.review.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const updated = await db.review.update({
      where: { id },
      data: { isApproved: parsed.data.isApproved },
    });

    return NextResponse.json({
      success: true,
      review: updated,
      message: parsed.data.isApproved ? 'Review approved successfully' : 'Review set to pending',
    });
  } catch (error: any) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'Failed to update review status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid review ID format' }, { status: 400 });
    }

    const existing = await db.review.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    await db.review.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Review permanently removed',
    });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth/customer';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const customer = await getCustomerSession();
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json({ error: 'Invalid review ID format' }, { status: 400 });
    }

    const review = await db.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Access control: only the review's owning customer can delete it
    if (review.customerId !== customer.customerId) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot delete another customer review' },
        { status: 403 }
      );
    }

    await db.review.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting customer review:', error);
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}

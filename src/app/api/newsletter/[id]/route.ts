import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

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
    const subscriber = await db.newsletter.findUnique({ where: { id } });
    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    const updated = await db.newsletter.update({
      where: { id },
      data: { isActive: !subscriber.isActive },
    });

    return NextResponse.json({
      success: true,
      subscriber: updated,
      message: `Subscriber is now ${updated.isActive ? 'Subscribed' : 'Unsubscribed'}.`,
    });
  } catch (error: any) {
    console.error('Error toggling subscriber status:', error);
    return NextResponse.json({ error: 'Failed to update subscriber' }, { status: 500 });
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
    const subscriber = await db.newsletter.findUnique({ where: { id } });
    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    await db.newsletter.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Subscriber removed.' });
  } catch (error: any) {
    console.error('Error deleting subscriber:', error);
    return NextResponse.json({ error: 'Failed to delete subscriber' }, { status: 500 });
  }
}

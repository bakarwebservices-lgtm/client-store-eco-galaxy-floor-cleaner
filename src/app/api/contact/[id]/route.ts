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
    const body = await request.json().catch(() => ({}));

    const message = await db.contactMessage.findUnique({ where: { id } });
    if (!message) {
      return NextResponse.json({ error: 'Contact message not found' }, { status: 404 });
    }

    const isRead = typeof body.isRead === 'boolean' ? body.isRead : !message.isRead;

    const updated = await db.contactMessage.update({
      where: { id },
      data: { isRead },
    });

    return NextResponse.json({
      success: true,
      message: `Message marked as ${isRead ? 'read' : 'unread'}.`,
      item: updated,
    });
  } catch (error: any) {
    console.error('Error updating contact message:', error);
    return NextResponse.json({ error: 'Failed to update contact message' }, { status: 500 });
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
    const message = await db.contactMessage.findUnique({ where: { id } });
    if (!message) {
      return NextResponse.json({ error: 'Contact message not found' }, { status: 404 });
    }

    await db.contactMessage.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Message deleted.' });
  } catch (error: any) {
    console.error('Error deleting contact message:', error);
    return NextResponse.json({ error: 'Failed to delete contact message' }, { status: 500 });
  }
}

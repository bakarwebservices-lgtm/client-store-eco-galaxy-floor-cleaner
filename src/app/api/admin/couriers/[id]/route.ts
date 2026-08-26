import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const { id } = await params;

    const existing = await db.courierAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: { shipments: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Courier account not found' }, { status: 404 });
    }

    // If account has existing shipments, soft-deactivate instead of breaking foreign keys
    if (existing._count.shipments > 0) {
      await db.courierAccount.update({
        where: { id },
        data: { isActive: false, isDefault: false },
      });
      return NextResponse.json({ success: true, message: 'Courier account deactivated.' });
    }

    await db.courierAccount.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Courier account removed.' });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to delete courier account' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin';
import { refreshShipmentTracking } from '@/lib/couriers/service';
import { db } from '@/lib/db';
import { ShipmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const { id } = await params;

    const activeShipment = await db.shipment.findFirst({
      where: {
        orderId: id,
        status: {
          notIn: [ShipmentStatus.CANCELLED, ShipmentStatus.RETURNED_TO_ORIGIN],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeShipment) {
      return NextResponse.json({ error: 'No active shipment found for this order.' }, { status: 404 });
    }

    const result = await refreshShipmentTracking(activeShipment.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to refresh tracking status from courier' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      eventsAdded: result.eventsAdded,
      message: 'Tracking timeline updated.',
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message || 'Failed to refresh tracking' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { getCourierAdapter } from '@/lib/couriers/registry';
import { resolveCourierCredentials } from '@/lib/couriers/service';
import { ShipmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
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
          notIn: [ShipmentStatus.CANCELLED],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeShipment) {
      return NextResponse.json({ error: 'No active shipment found for this order.' }, { status: 404 });
    }

    if (activeShipment.labelUrl) {
      return NextResponse.json({ labelUrl: activeShipment.labelUrl });
    }

    // Try resolving from courier adapter
    const adapter = getCourierAdapter(activeShipment.courierCode);
    if (adapter.getShippingLabel) {
      const { credentials } = await resolveCourierCredentials(
        activeShipment.courierCode,
        activeShipment.courierAccountId || undefined
      );
      const labelRes = await adapter.getShippingLabel(activeShipment.trackingNumber, credentials);
      if (labelRes.labelUrl) {
        return NextResponse.json({ labelUrl: labelRes.labelUrl });
      }
    }

    return NextResponse.json({ error: 'Label generation not supported for this courier.' }, { status: 400 });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to retrieve shipping label' }, { status: 500 });
  }
}

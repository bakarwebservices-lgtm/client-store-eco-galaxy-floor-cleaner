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

    const adapter = getCourierAdapter(activeShipment.courierCode);
    if (adapter.getShippingLabel) {
      const { credentials } = await resolveCourierCredentials(
        activeShipment.courierCode,
        activeShipment.courierAccountId || undefined
      );
      const labelRes = await adapter.getShippingLabel(activeShipment.trackingNumber, credentials);

      if (labelRes.pdfBuffer) {
        return new NextResponse(new Uint8Array(labelRes.pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="airway-bill-${activeShipment.trackingNumber}.pdf"`,
            'Cache-Control': 'no-cache',
          },
        });
      }

      if (labelRes.labelUrl) {
        // If client expects JSON, return JSON, otherwise redirect
        const acceptHeader = _req.headers.get('accept') || '';
        if (acceptHeader.includes('application/json')) {
          return NextResponse.json({ labelUrl: labelRes.labelUrl });
        }
        return NextResponse.redirect(labelRes.labelUrl);
      }

      if (labelRes.error) {
        return NextResponse.json({ error: labelRes.error }, { status: 400 });
      }
    }

    if (activeShipment.labelUrl && !activeShipment.labelUrl.includes('/api/admin/orders/')) {
      return NextResponse.redirect(activeShipment.labelUrl);
    }

    return NextResponse.json({ error: 'Label generation not supported for this courier.' }, { status: 400 });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error?.message || 'Failed to retrieve shipping label' }, { status: 500 });
  }
}

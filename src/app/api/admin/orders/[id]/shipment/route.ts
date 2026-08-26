import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin';
import { bookShipmentForOrder, cancelShipmentForOrder } from '@/lib/couriers/service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bookShipmentSchema = z.object({
  courierCode: z.string().min(1, 'Courier code is required'),
  courierAccountId: z.string().uuid().optional(),
  pickupAddressCode: z.string().optional(),
  customCodAmount: z.number().min(0).optional(),
  weightKg: z.number().positive().optional(),
  pieces: z.number().int().min(1).default(1),
  orderNotes: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const { id } = await params;
    const body = await req.json();

    const parsed = bookShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid booking parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await bookShipmentForOrder({
      orderId: id,
      ...parsed.data,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Courier dispatch booking failed', details: result },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      shipmentId: result.shipmentId,
      trackingNumber: result.trackingNumber,
      status: result.normalizedStatus,
      rawStatus: result.rawStatus,
      labelUrl: result.labelUrl,
      trackingUrl: result.trackingUrl,
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message || 'Failed to dispatch shipment' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const { id } = await params;

    // Resolve active shipment for this order
    const { db } = await import('@/lib/db');
    const { ShipmentStatus } = await import('@prisma/client');

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

    const result = await cancelShipmentForOrder(activeShipment.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to cancel shipment with courier.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Shipment booking cancelled successfully.' });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message || 'Failed to cancel shipment' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin';
import { refreshShipmentTracking } from '@/lib/couriers/service';
import { db } from '@/lib/db';
import { ShipmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const orderIds: string[] | undefined =
      Array.isArray(body.orderIds) && body.orderIds.length > 0 ? body.orderIds : undefined;
    const courierCode: string | undefined = body.courierCode || undefined;

    // Find eligible shipments to sync
    const whereClause: any = {
      trackingNumber: { not: '' },
      status: {
        notIn: [ShipmentStatus.CANCELLED],
      },
    };

    if (orderIds) {
      whereClause.orderId = { in: orderIds };
    } else {
      // If syncing all in-flight orders, exclude already DELIVERED or RETURNED_TO_ORIGIN to optimize API calls
      whereClause.status.notIn.push(ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED_TO_ORIGIN);
    }

    if (courierCode) {
      whereClause.courierCode = courierCode.toUpperCase();
    }

    const shipments = await db.shipment.findMany({
      where: whereClause,
      select: {
        id: true,
        orderId: true,
        courierCode: true,
        trackingNumber: true,
        status: true,
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    if (shipments.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        synced: 0,
        updated: 0,
        errors: 0,
        message: orderIds
          ? 'No active shipments found for the selected orders.'
          : 'No in-flight courier shipments currently awaiting status updates.',
      });
    }

    let synced = 0;
    let updated = 0;
    let errors = 0;
    const results: any[] = [];

    for (const shipment of shipments) {
      try {
        const prevStatus = shipment.status;
        const res = await refreshShipmentTracking(shipment.id);
        if (res.success) {
          synced++;
          const statusChanged = res.status !== prevStatus;
          const eventsAdded = res.eventsAdded > 0;
          if (statusChanged || eventsAdded) {
            updated++;
          }
          results.push({
            orderNumber: shipment.order?.orderNumber,
            trackingNumber: shipment.trackingNumber,
            status: res.status,
            previousStatus: prevStatus,
            eventsAdded: res.eventsAdded,
            updated: statusChanged || eventsAdded,
          });
        } else {
          errors++;
          results.push({
            orderNumber: shipment.order?.orderNumber,
            trackingNumber: shipment.trackingNumber,
            error: res.error || 'Failed to sync with courier',
          });
        }
      } catch (err: any) {
        errors++;
        results.push({
          orderNumber: shipment.order?.orderNumber,
          trackingNumber: shipment.trackingNumber,
          error: err?.message || 'Error tracking shipment',
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: shipments.length,
      synced,
      updated,
      errors,
      message: `Checked ${shipments.length} shipment(s): ${updated} updated, ${errors} error(s).`,
      results,
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[Courier Sync Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync courier statuses' }, { status: 500 });
  }
}

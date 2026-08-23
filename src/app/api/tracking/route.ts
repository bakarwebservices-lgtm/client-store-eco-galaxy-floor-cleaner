import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

function maskName(name?: string | null): string {
  if (!name) return 'Customer';
  const parts = name.trim().split(/\s+/);
  return parts
    .map((part) => (part.length > 2 ? part[0] + '*'.repeat(part.length - 2) + part[part.length - 1] : part[0] + '*'))
    .join(' ');
}

export async function GET(req: NextRequest) {
  try {
    // Rate limit public lookup endpoint by client IP (30 queries per minute)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
    const rateLimitResult = checkRateLimit(`tracking-lookup:${ip}`, { limit: 30, windowMs: 60 * 1000 });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many tracking requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const trackingNumber = searchParams.get('trackingNumber')?.trim();
    const orderNumber = searchParams.get('orderNumber')?.trim();
    const contact = searchParams.get('contact')?.trim().toLowerCase();

    if (!trackingNumber && (!orderNumber || !contact)) {
      return NextResponse.json(
        {
          error:
            'Please provide a Consignment Tracking Number OR your Order Number along with your Email or Phone Number.',
        },
        { status: 400 }
      );
    }

    let shipment = null;

    if (trackingNumber) {
      shipment = await db.shipment.findUnique({
        where: { trackingNumber },
        include: {
          order: {
            include: {
              customer: true,
            },
          },
          events: {
            orderBy: { eventTime: 'asc' },
          },
        },
      });
    } else if (orderNumber && contact) {
      const order = await db.order.findFirst({
        where: {
          OR: [{ orderNumber }, { orderNumber: `#${orderNumber.replace(/^#/, '')}` }],
          deletedAt: null,
        },
        include: {
          customer: true,
          shipments: {
            include: {
              events: {
                orderBy: { eventTime: 'asc' },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (order) {
        const shippingAddress = (order.shippingAddress as Record<string, any>) || {};
        const customerEmail = (order.customer?.email || '').toLowerCase().trim();
        const customerPhone = (order.customer?.phone || '').replace(/[^0-9]/g, '');
        const shippingEmail = (shippingAddress.email || '').toLowerCase().trim();
        const shippingPhone = (shippingAddress.phone || '').replace(/[^0-9]/g, '');
        const cleanContact = contact.replace(/[^0-9]/g, '');

        const isEmailMatch =
          contact.includes('@') && (customerEmail === contact || shippingEmail === contact);
        const isPhoneMatch =
          cleanContact.length >= 7 &&
          (customerPhone.includes(cleanContact) || shippingPhone.includes(cleanContact));

        if (isEmailMatch || isPhoneMatch) {
          shipment =
            order.shipments.find((s) => s.status !== 'CANCELLED') || order.shipments[0] || null;
          if (shipment) {
            (shipment as any).order = order;
          }
        }
      }
    }

    if (!shipment) {
      return NextResponse.json(
        { error: 'No matching shipment tracking record found. Please verify your tracking or order details.' },
        { status: 404 }
      );
    }

    const orderObj = (shipment as any).order;
    const shippingAddress = (orderObj?.shippingAddress as Record<string, any>) || {};

    const sanitizedData = {
      trackingNumber: shipment.trackingNumber,
      courierName: shipment.courierName,
      courierCode: shipment.courierCode,
      status: shipment.status,
      rawStatus: shipment.rawCourierStatus,
      isCod: shipment.isCod,
      codAmount: shipment.codAmount,
      currency: shipment.currency,
      bookedAt: shipment.bookedAt,
      deliveredAt: shipment.deliveredAt,
      trackingUrl: shipment.trackingUrl,
      recipient: {
        name: maskName(shippingAddress.name || `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`),
        city: shippingAddress.city || 'Unknown',
        country: shippingAddress.country || 'Pakistan',
      },
      events: shipment.events.map((evt) => ({
        id: evt.id,
        status: evt.status,
        rawStatus: evt.rawStatus,
        description: evt.description,
        location: evt.location,
        eventTime: evt.eventTime,
      })),
    };

    return NextResponse.json({
      success: true,
      shipment: sanitizedData,
    });
  } catch (error: any) {
    console.error('[Public Tracking Lookup Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred retrieving tracking details.' },
      { status: 500 }
    );
  }
}

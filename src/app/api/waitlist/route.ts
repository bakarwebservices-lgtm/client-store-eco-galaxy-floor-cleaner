import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { WaitlistSubscriptionSchema } from '@/lib/validation/communication';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { getCustomerSession } from '@/lib/auth/customer';
import { getAdminSession } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Resolve optional customer session from auth cookies
    const customer = await getCustomerSession();

    // 2. Rate limiting: per customerId if authenticated, or per IP if guest (5 per 15 min)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown-ip';
    const rateLimitKey = customer ? `waitlist:cust:${customer.customerId}` : `waitlist:ip:${ip}`;
    const rateLimit = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 15 * 60 * 1000 });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 3. Validate payload
    const body = await request.json();
    const parsed = WaitlistSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid subscription data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, productId, variantId } = parsed.data;

    // 4. Verify product existence
    const product = await db.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 5. Upsert subscription
    const subscription = await db.waitlistSubscription.upsert({
      where: {
        email_productId_variantId: {
          email,
          productId,
          variantId: variantId || null as any,
        },
      },
      create: {
        email,
        productId,
        variantId: variantId || null,
        customerId: customer?.customerId || null,
        isActive: true,
      },
      update: {
        isActive: true,
        customerId: customer?.customerId || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'You have been added to the waitlist! We will notify you as soon as this item is back in stock.',
      subscriptionId: subscription.id,
    });
  } catch (error: any) {
    console.error('Error creating waitlist subscription:', error);
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const variantId = searchParams.get('variantId');

    const subscriptions = await db.waitlistSubscription.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(variantId ? { variantId } : {}),
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        variant: { select: { id: true, sku: true, title: true, color: true, size: true, inventoryQty: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        notifications: { select: { id: true, sentAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute summary by product/variant
    const summaryMap = new Map<string, any>();
    for (const sub of subscriptions) {
      const key = `${sub.productId}_${sub.variantId || 'base'}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          productId: sub.productId,
          productName: sub.product.name,
          productSlug: sub.product.slug,
          variantId: sub.variantId,
          variantSku: sub.variant?.sku || null,
          variantTitle: sub.variant?.title || null,
          currentStock: sub.variant ? sub.variant.inventoryQty : 0,
          totalSubscribers: 0,
          activeSubscribers: 0,
          notificationsSent: 0,
        });
      }
      const item = summaryMap.get(key);
      item.totalSubscribers++;
      if (sub.isActive) item.activeSubscribers++;
      item.notificationsSent += sub.notifications.length;
    }

    const groupedSummaries = Array.from(summaryMap.values());

    return NextResponse.json({
      subscriptions,
      groupedSummaries,
      total: subscriptions.length,
    });
  } catch (error: any) {
    console.error('Error fetching waitlist subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch waitlist subscriptions' }, { status: 500 });
  }
}

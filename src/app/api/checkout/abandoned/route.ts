import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AbandonedCheckoutSchema } from '@/lib/validation/abandonedCheckout';
import { getCustomerSession } from '@/lib/auth/customer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AbandonedCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid abandoned checkout payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      sessionId,
      name,
      phone,
      email,
      address,
      city,
      province,
      cart,
      subtotal,
      discount,
      total,
    } = parsed.data;

    // Check optional authenticated customer session
    const customer = await getCustomerSession();
    const customerId = customer?.customerId || null;

    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    const record = await db.abandonedCheckout.upsert({
      where: { sessionId },
      create: {
        sessionId,
        customerId,
        name: name?.trim() || null,
        phone: phone?.trim() || null,
        email: normalizedEmail,
        address: address?.trim() || null,
        city: city?.trim() || null,
        province: province?.trim() || null,
        cart: cart || [],
        subtotal,
        discount,
        total,
      },
      update: {
        ...(customerId ? { customerId } : {}),
        ...(name ? { name: name.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(address ? { address: address.trim() } : {}),
        ...(city ? { city: city.trim() } : {}),
        ...(province ? { province: province.trim() } : {}),
        cart: cart || [],
        subtotal,
        discount,
        total,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, id: record.id });
  } catch (error: any) {
    console.error('[Abandoned Checkout] Error capturing session:', error);
    return NextResponse.json(
      { error: 'Failed to capture abandoned checkout session' },
      { status: 500 }
    );
  }
}

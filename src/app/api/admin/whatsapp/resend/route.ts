import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendWhatsAppOrderConfirmation } from '@/lib/whatsapp/client';

export const dynamic = 'force-dynamic';

const COOLDOWN_SECONDS = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.whatsappConfirmationStatus === 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Order is already confirmed by the customer.' },
        { status: 400 }
      );
    }

    if (order.cancelledAt || order.whatsappConfirmationStatus === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot resend confirmation for a cancelled order.' },
        { status: 400 }
      );
    }

    // Cooldown check (5 minutes anti-spam guard)
    if (order.whatsappLastSentAt) {
      const elapsedSeconds = (Date.now() - new Date(order.whatsappLastSentAt).getTime()) / 1000;
      if (elapsedSeconds < COOLDOWN_SECONDS) {
        const remaining = Math.ceil(COOLDOWN_SECONDS - elapsedSeconds);
        return NextResponse.json(
          {
            error: `Please wait ${remaining} seconds before resending WhatsApp confirmation to prevent rate-limiting.`,
            remainingSeconds: remaining,
          },
          { status: 429 }
        );
      }
    }

    const result = await sendWhatsAppOrderConfirmation(order.id, true);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to resend message.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp confirmation resent successfully.',
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error('[Admin WhatsApp Resend] Error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

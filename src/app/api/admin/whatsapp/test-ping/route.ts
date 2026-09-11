import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppTestPing } from '@/lib/whatsapp/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Please enter a valid phone number (e.g. 0300 1234567) to receive the test ping.' },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppTestPing(phone);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Meta API returned an error.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test message delivered to your WhatsApp number!',
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error('[Admin WhatsApp Test Ping] Error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

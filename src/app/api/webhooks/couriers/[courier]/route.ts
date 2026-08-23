import { NextRequest, NextResponse } from 'next/server';
import { handleInboundWebhook } from '@/lib/couriers/service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courier: string }> }
) {
  try {
    const { courier } = await params;
    const courierCode = courier.toUpperCase().trim();

    let payload: any = {};
    try {
      payload = await req.json();
    } catch {
      // Fallback for form-encoded or raw text payloads
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { rawBody: text };
      }
    }

    // Convert headers to a standard record
    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    const result = await handleInboundWebhook(courierCode, payload, headers);

    if (!result.success) {
      // Return 200 with error note or 400 depending on error to ensure couriers don't retry perpetually on non-recoverable bad payloads
      console.warn(`[Courier Webhook] Ingestion note for ${courierCode}:`, result.message);
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      trackingNumber: result.trackingNumber,
    });
  } catch (error: any) {
    console.error('[Courier Webhook Error]:', error);
    // Respond with 200 or 500
    return NextResponse.json(
      { error: error?.message || 'Internal error processing courier webhook' },
      { status: 500 }
    );
  }
}

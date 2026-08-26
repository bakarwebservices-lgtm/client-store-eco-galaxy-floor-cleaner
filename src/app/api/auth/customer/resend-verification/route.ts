import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/auth/customer';
import { signEmailVerificationToken } from '@/lib/auth/token';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { sendVerificationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const customer = await getCurrentCustomer();
    if (!customer || !customer.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`resend_verif:${customer.id}`, { limit: 3, windowMs: 15 * 60 * 1000 });
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many verification requests. Please wait a few minutes.' }, { status: 429 });
    }

    const verificationToken = await signEmailVerificationToken({
      customerId: customer.id,
      email: customer.email,
    });

    const verificationUrl = `${req.nextUrl.origin}/api/auth/customer/verify-email?token=${verificationToken}`;

    await sendVerificationEmail(customer.email, verificationUrl);

    return NextResponse.json({
      success: true,
      message: 'Verification link sent to your email.',
      verificationUrl: process.env.NODE_ENV !== 'production' ? verificationUrl : undefined,
    });
  } catch (error) {
    console.error('Failed to resend verification:', error);
    return NextResponse.json({ error: 'Failed to send verification link' }, { status: 500 });
  }
}

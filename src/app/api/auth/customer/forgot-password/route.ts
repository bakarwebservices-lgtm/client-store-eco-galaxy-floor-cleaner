import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { ForgotPasswordSchema } from '@/lib/validation/passwordReset';
import { signPasswordResetToken } from '@/lib/auth/token';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateLimitResult = checkRateLimit(`cust_forgot:${ip}`, { limit: 5, windowMs: 60 * 1000 });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many reset requests. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Look up customer
    const customer = await db.customer.findUnique({
      where: { email },
    });

    // If customer exists and has an active passwordHash (registered account)
    if (customer && customer.passwordHash) {
      const resetToken = await signPasswordResetToken({
        customerId: customer.id,
        email: customer.email!,
      });

      const origin =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        req.headers.get('origin') ||
        'http://localhost:3000';

      const resetUrl = `${origin}/account/reset-password?token=${resetToken}`;

      try {
        await sendPasswordResetEmail(customer.email!, resetUrl);
      } catch (emailErr) {
        console.error('[Forgot Password] Failed to dispatch reset email:', emailErr);
      }
    }

    // Always return success message to prevent user enumeration attacks
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email address, you will receive password reset instructions shortly.',
    });
  } catch (error: any) {
    console.error('[Forgot Password] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

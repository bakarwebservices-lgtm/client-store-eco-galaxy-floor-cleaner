import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { ResetPasswordSchema } from '@/lib/validation/passwordReset';
import { verifyPasswordResetToken } from '@/lib/auth/token';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateLimitResult = checkRateLimit(`cust_reset:${ip}`, { limit: 10, windowMs: 60 * 1000 });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid password reset submission' },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    // Verify token validity and signature
    const payload = await verifyPasswordResetToken(token);
    if (!payload || !payload.customerId || !payload.email) {
      return NextResponse.json(
        { error: 'The password reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Verify customer exists in database
    const customer = await db.customer.findUnique({
      where: { id: payload.customerId },
    });

    if (!customer || customer.email !== payload.email) {
      return NextResponse.json(
        { error: 'Account not found. Please request a new password reset link.' },
        { status: 400 }
      );
    }

    // Hash the new password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Update passwordHash
    await db.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset. You can now sign in with your new password.',
    });
  } catch (error: any) {
    console.error('[Reset Password] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}

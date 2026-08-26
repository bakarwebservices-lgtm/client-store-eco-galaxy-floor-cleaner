import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyEmailVerificationToken } from '@/lib/auth/token';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/account/verify-email?status=missing_token', req.url));
    }

    const payload = await verifyEmailVerificationToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL('/account/verify-email?status=invalid_or_expired', req.url));
    }

    // Mark verified
    await db.customer.update({
      where: { id: payload.customerId },
      data: { isEmailVerified: true },
    });

    return NextResponse.redirect(new URL('/account/verify-email?status=success', req.url));
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL('/account/verify-email?status=error', req.url));
  }
}

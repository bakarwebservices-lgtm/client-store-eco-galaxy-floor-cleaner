import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { sendVerificationEmail } from '@/lib/email';
import { customerRegisterSchema } from '@/lib/validation/customer';
import { signCustomerToken, signEmailVerificationToken, CUSTOMER_COOKIE_NAME } from '@/lib/auth/token';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateLimitResult = checkRateLimit(`cust_reg:${ip}`, { limit: 10, windowMs: 60 * 1000 });

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many registration attempts. Please wait a minute.' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = customerRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid details' }, { status: 400 });
    }

    const { firstName, lastName, email, phone, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check existing customer
    const existing = await db.customer.findUnique({
      where: { email: normalizedEmail },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    let customer;
    if (existing) {
      if (existing.passwordHash) {
        return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 400 });
      }
      // Guest account exists: attach passwordHash but keep isEmailVerified = false until verified
      customer = await db.customer.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          phone: phone || existing.phone,
          passwordHash,
          isEmailVerified: false,
        },
      });
    } else {
      customer = await db.customer.create({
        data: {
          firstName,
          lastName,
          email: normalizedEmail,
          phone: phone || null,
          passwordHash,
          isEmailVerified: false,
        },
      });
    }

    // Generate Email Verification Token
    const verificationToken = await signEmailVerificationToken({
      customerId: customer.id,
      email: customer.email!,
    });
    const verificationUrl = `${req.nextUrl.origin}/api/auth/customer/verify-email?token=${verificationToken}`;
    
    // Dispatch Verification Email
    await sendVerificationEmail(customer.email!, verificationUrl);

    // Sign Token
    const token = await signCustomerToken({
      customerId: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
    });

    const response = NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        isEmailVerified: customer.isEmailVerified,
      },
      verificationUrl: process.env.NODE_ENV !== 'production' ? verificationUrl : undefined,
    });

    response.cookies.set({
      name: CUSTOMER_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Customer registration error:', error);
    return NextResponse.json({ error: 'Failed to register account' }, { status: 500 });
  }
}

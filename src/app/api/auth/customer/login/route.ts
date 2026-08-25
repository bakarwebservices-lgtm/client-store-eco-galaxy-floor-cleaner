import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { customerLoginSchema } from '@/lib/validation/customer';
import { signCustomerToken, CUSTOMER_COOKIE_NAME } from '@/lib/auth/token';
import { signAdminToken, verifyPassword, setAdminSessionCookie } from '@/lib/auth/admin';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateLimitResult = checkRateLimit(`auth_login:${ip}`, { limit: 10, windowMs: 60 * 1000 });

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait a minute.' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = customerLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email or password format' }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check Customer credentials first
    const customer = await db.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (customer && customer.passwordHash) {
      const isValidCustomerPassword = await bcrypt.compare(password, customer.passwordHash);
      if (isValidCustomerPassword) {
        const token = await signCustomerToken({
          customerId: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
        });

        const response = NextResponse.json({
          success: true,
          role: 'customer',
          redirectUrl: '/account',
          customer: {
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
          },
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
      }
    }

    // 2. If not a customer, check Admin credentials (Unified login front door)
    let admin: any = null;
    try {
      admin = await db.adminUser.findUnique({
        where: { email: normalizedEmail },
      });
    } catch {
      // Non-fatal database check
    }

    if (admin && admin.passwordHash) {
      const isValidAdminPassword = await verifyPassword(password, admin.passwordHash);
      if (isValidAdminPassword) {
        try {
          await db.adminUser.update({
            where: { id: admin.id },
            data: { lastLogin: new Date() },
          });
        } catch {
          // Non-critical background update
        }

        const token = await signAdminToken({
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        });

        await setAdminSessionCookie(token);

        return NextResponse.json({
          success: true,
          role: 'admin',
          redirectUrl: '/admin',
          user: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
          },
        });
      }
    }

    // 3. Check initial admin fallback credentials
    const initialEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@store.com').toLowerCase().trim();
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin_password_123!';
    const initialName = process.env.INITIAL_ADMIN_NAME || 'Store Administrator';

    if (normalizedEmail === initialEmail && password === initialPassword) {
      const token = await signAdminToken({
        id: 'admin-initial-root',
        email: initialEmail,
        name: initialName,
        role: 'ADMIN',
      });

      await setAdminSessionCookie(token);

      return NextResponse.json({
        success: true,
        role: 'admin',
        redirectUrl: '/admin',
        user: {
          id: 'admin-initial-root',
          name: initialName,
          email: initialEmail,
          role: 'ADMIN',
        },
      });
    }

    // 4. If neither matches, return generic authentication failure
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  } catch (error) {
    console.error('Unified login error:', error);
    return NextResponse.json({ error: 'Failed to log in' }, { status: 500 });
  }
}

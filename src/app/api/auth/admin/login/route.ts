import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { adminLoginSchema } from '@/lib/validation/auth';
import { verifyPassword, signAdminToken, setAdminSessionCookie } from '@/lib/auth/admin';
import { checkRateLimit, resetRateLimit } from '@/lib/security/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // 1. Extract IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimitKey = `admin_login_${ip}`;

    // 2. Check rate limit (max 5 failed attempts per 15 minutes)
    const rateCheck = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!rateCheck.success) {
      const waitMinutes = Math.ceil((rateCheck.resetTime - Date.now()) / (60 * 1000));
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please try again in ${waitMinutes} minute${waitMinutes === 1 ? '' : 's'}.`,
        },
        { status: 429 }
      );
    }

    // 3. Validate request payload with Zod
    const body = await req.json();
    const parseResult = adminLoginSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid input data';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { email, password } = parseResult.data;

    // 4. Query AdminUser by email
    const admin = await db.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    // 5. Verify user and password (generic message prevents account enumeration)
    if (!admin || !admin.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, admin.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 6. Reset rate limit on successful authentication
    resetRateLimit(rateLimitKey);

    // 7. Update lastLogin timestamp asynchronously
    await db.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // 8. Sign JWT and set HTTP-only cookie
    const token = await signAdminToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    await setAdminSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred' },
      { status: 500 }
    );
  }
}

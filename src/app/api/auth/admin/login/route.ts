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

    // Configured initial admin credentials (from .env or defaults)
    const initialEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@store.com').toLowerCase().trim();
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin_password_123!';
    const initialName = process.env.INITIAL_ADMIN_NAME || 'Store Administrator';

    let admin: any = null;
    let dbQuerySucceeded = true;

    try {
      admin = await db.adminUser.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (dbErr) {
      console.warn('⚠️ Database query failed during admin login, falling back to initial credentials check:', dbErr);
      dbQuerySucceeded = false;
    }

    // Path 1: Database is active and admin user record exists in DB
    if (dbQuerySucceeded && admin) {
      if (!admin.passwordHash) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const isMatch = await verifyPassword(password, admin.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      resetRateLimit(rateLimitKey);

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
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      });
    }

    // Path 2: Initial admin credentials fallback (works when DB is unseeded or offline during testing)
    if (email.toLowerCase() === initialEmail && password === initialPassword) {
      resetRateLimit(rateLimitKey);

      const fallbackId = 'admin-initial-root';
      const token = await signAdminToken({
        id: fallbackId,
        email: initialEmail,
        name: initialName,
        role: 'ADMIN',
      });

      await setAdminSessionCookie(token);

      return NextResponse.json({
        success: true,
        user: {
          id: fallbackId,
          name: initialName,
          email: initialEmail,
          role: 'ADMIN',
        },
      });
    }

    // Path 3: Invalid credentials
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: error?.message || 'Authentication error. Please check your credentials.' },
      { status: 500 }
    );
  }
}

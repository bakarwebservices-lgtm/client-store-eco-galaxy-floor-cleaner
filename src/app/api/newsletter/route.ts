import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { NewsletterSchema } from '@/lib/validation/communication';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { getAdminSession } from '@/lib/auth/admin';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting by IP (5 attempts per 15 minutes)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown-ip';
    const rateLimit = checkRateLimit(`newsletter:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    // 2. Validate input
    const body = await request.json();
    const parsed = NewsletterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email address', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // 3. Upsert subscriber (graceful duplicate handling per BUILD_STANDARDS)
    await db.newsletter.upsert({
      where: { email },
      create: { email, isActive: true },
      update: { isActive: true }, // Re-activate if was previously inactive
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for subscribing to our newsletter!',
    });
  } catch (error: any) {
    console.error('Error processing newsletter subscription:', error);
    return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status'); // 'active' | 'inactive' | 'all'

    const where: Prisma.NewsletterWhereInput = {
      ...(search ? { email: { contains: search, mode: 'insensitive' } } : {}),
      ...(status === 'active' ? { isActive: true } : status === 'inactive' ? { isActive: false } : {}),
    };

    const [subscribers, total] = await Promise.all([
      db.newsletter.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      db.newsletter.count({ where }),
    ]);

    return NextResponse.json({ subscribers, total });
  } catch (error: any) {
    console.error('Error fetching newsletter subscribers:', error);
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ContactMessageSchema } from '@/lib/validation/communication';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { getAdminSession } from '@/lib/auth/admin';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting by IP (5 submissions per 15 minutes)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown-ip';
    const rateLimit = checkRateLimit(`contact:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many messages sent. Please wait before submitting again.' },
        { status: 429 }
      );
    }

    // 2. Validate input
    const body = await request.json();
    const parsed = ContactMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, email, phone, subject, message } = parsed.data;

    // 3. Create contact message in database
    const contactMessage = await db.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you shortly.',
      id: contactMessage.id,
    });
  } catch (error: any) {
    console.error('Error submitting contact message:', error);
    return NextResponse.json({ error: 'Failed to submit contact message' }, { status: 500 });
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
    const filter = searchParams.get('filter'); // 'unread' | 'read' | 'all'

    const where: Prisma.ContactMessageWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { subject: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(filter === 'unread' ? { isRead: false } : filter === 'read' ? { isRead: true } : {}),
    };

    const [messages, unreadCount, total] = await Promise.all([
      db.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      db.contactMessage.count({ where: { isRead: false } }),
      db.contactMessage.count({ where }),
    ]);

    return NextResponse.json({ messages, unreadCount, total });
  } catch (error: any) {
    console.error('Error fetching contact messages:', error);
    return NextResponse.json({ error: 'Failed to fetch contact messages' }, { status: 500 });
  }
}

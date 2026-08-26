import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PageSchema } from '@/lib/validation/cms';
import { sanitizeRichText } from '@/lib/sanitization/html';
import { getAdminSession } from '@/lib/auth/admin';
import { PageStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';
    const search = searchParams.get('search')?.trim();

    if (isAdmin) {
      const admin = await getAdminSession();
      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const where: Prisma.PageWhereInput = {
      ...(isAdmin ? {} : { status: PageStatus.ACTIVE }),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const pages = await db.page.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ pages });
  } catch (error: any) {
    console.error('Error fetching pages:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = PageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { title, slug, bodyHtml, status, seoTitle, seoDescription } = parsed.data;

    const existing = await db.page.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json({ error: 'Page slug already exists' }, { status: 409 });
    }

    const cleanBodyHtml = sanitizeRichText(bodyHtml);

    const page = await db.page.create({
      data: {
        title,
        slug,
        bodyHtml: cleanBodyHtml,
        status,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      },
    });

    return NextResponse.json({ success: true, page }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating page:', error);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}

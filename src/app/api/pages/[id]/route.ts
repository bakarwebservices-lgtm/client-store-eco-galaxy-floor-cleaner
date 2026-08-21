import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PageSchema } from '@/lib/validation/cms';
import { sanitizeRichText } from '@/lib/sanitization/html';
import { getAdminSession } from '@/lib/auth/admin';
import { PageStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';

    const page = await db.page.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...(isAdmin ? {} : { status: PageStatus.ACTIVE }),
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error: any) {
    console.error('Error fetching page:', error);
    return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = PageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const existing = await db.page.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const { title, slug, bodyHtml, status, seoTitle, seoDescription } = parsed.data;

    // Check slug collision
    const conflict = await db.page.findFirst({
      where: { slug, id: { not: id } },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Another page is already using this slug' }, { status: 409 });
    }

    const cleanBodyHtml = sanitizeRichText(bodyHtml);

    const updated = await db.page.update({
      where: { id },
      data: {
        title,
        slug,
        bodyHtml: cleanBodyHtml,
        status,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      },
    });

    return NextResponse.json({ success: true, page: updated });
  } catch (error: any) {
    console.error('Error updating page:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.page.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    await db.page.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Page deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting page:', error);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}

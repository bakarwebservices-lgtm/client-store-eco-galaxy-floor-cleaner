import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { BlogArticleSchema } from '@/lib/validation/cms';
import { sanitizeRichText } from '@/lib/sanitization/html';
import { getAdminSession } from '@/lib/auth/admin';
import { BlogStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';

    const article = await db.blogArticle.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...(isAdmin ? {} : { status: BlogStatus.PUBLISHED }),
      },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (error: any) {
    console.error('Error fetching single blog article:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
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
    const parsed = BlogArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const existing = await db.blogArticle.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const {
      title,
      slug,
      bodyHtml,
      excerpt,
      author,
      featuredImageUrl,
      featuredImageAlt,
      status,
      publishedAt,
      tags,
      seoTitle,
      seoDescription,
    } = parsed.data;

    // Check slug collision
    const conflict = await db.blogArticle.findFirst({
      where: { slug, id: { not: id } },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Another article is already using this slug' }, { status: 409 });
    }

    // Sanitize HTML body
    const cleanBodyHtml = sanitizeRichText(bodyHtml);

    // If publishing for the first time without an existing published date, set now
    let finalPublishedAt = existing.publishedAt;
    if (status === BlogStatus.PUBLISHED) {
      if (publishedAt) {
        finalPublishedAt = new Date(publishedAt);
      } else if (!existing.publishedAt) {
        finalPublishedAt = new Date();
      }
    } else {
      finalPublishedAt = null;
    }

    const updated = await db.blogArticle.update({
      where: { id },
      data: {
        title,
        slug,
        bodyHtml: cleanBodyHtml,
        excerpt: excerpt || null,
        author: author || existing.author,
        featuredImageUrl: featuredImageUrl || null,
        featuredImageAlt: featuredImageAlt || null,
        status,
        publishedAt: finalPublishedAt,
        tags,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      },
    });

    return NextResponse.json({ success: true, article: updated });
  } catch (error: any) {
    console.error('Error updating blog article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
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
    const existing = await db.blogArticle.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    await db.blogArticle.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Article deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting blog article:', error);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}

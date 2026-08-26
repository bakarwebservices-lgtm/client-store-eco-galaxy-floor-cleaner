import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { BlogArticleSchema } from '@/lib/validation/cms';
import { sanitizeRichText } from '@/lib/sanitization/html';
import { getAdminSession } from '@/lib/auth/admin';
import { BlogStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '9', 10)));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search')?.trim();
    const tag = searchParams.get('tag')?.trim();
    const isAdmin = searchParams.get('admin') === 'true';

    // If admin view requested, ensure admin is authenticated
    if (isAdmin) {
      const admin = await getAdminSession();
      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const where: Prisma.BlogArticleWhereInput = {
      ...(isAdmin ? {} : { status: BlogStatus.PUBLISHED }),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { excerpt: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    };

    const [articles, total] = await Promise.all([
      db.blogArticle.findMany({
        where,
        orderBy: isAdmin ? { createdAt: 'desc' } : { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      db.blogArticle.count({ where }),
    ]);

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching blog articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = BlogArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
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
    const existing = await db.blogArticle.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json({ error: 'Article slug already exists' }, { status: 409 });
    }

    // Sanitize HTML content before storage
    const cleanBodyHtml = sanitizeRichText(bodyHtml);

    const article = await db.blogArticle.create({
      data: {
        title,
        slug,
        bodyHtml: cleanBodyHtml,
        excerpt: excerpt || null,
        author: author || admin.name || 'Editorial Team',
        featuredImageUrl: featuredImageUrl || null,
        featuredImageAlt: featuredImageAlt || null,
        status,
        publishedAt: status === BlogStatus.PUBLISHED ? (publishedAt ? new Date(publishedAt) : new Date()) : null,
        tags,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      },
    });

    return NextResponse.json({ success: true, article }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating blog article:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}

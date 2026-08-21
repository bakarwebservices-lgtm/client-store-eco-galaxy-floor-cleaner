import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FaqItemSchema } from '@/lib/validation/cms';
import { sanitizeRichText } from '@/lib/sanitization/html';
import { getAdminSession } from '@/lib/auth/admin';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';
    const category = searchParams.get('category')?.trim();
    const search = searchParams.get('search')?.trim();

    if (isAdmin) {
      const admin = await getAdminSession();
      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const where: Prisma.FaqItemWhereInput = {
      ...(isAdmin ? {} : { isActive: true }),
      ...(category && category !== 'all' ? { category } : {}),
      ...(search
        ? {
            OR: [
              { question: { contains: search, mode: 'insensitive' } },
              { answer: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const faqs = await db.faqItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // Also get all distinct categories for filtering
    const categoriesRaw = await db.faqItem.findMany({
      where: isAdmin ? {} : { isActive: true },
      select: { category: true },
      distinct: ['category'],
    });

    const categories = categoriesRaw
      .map((c) => c.category)
      .filter((c): c is string => Boolean(c));

    return NextResponse.json({ faqs, categories });
  } catch (error: any) {
    console.error('Error fetching FAQs:', error);
    return NextResponse.json({ error: 'Failed to fetch FAQs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = FaqItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { question, answer, category, sortOrder, isActive } = parsed.data;
    const cleanAnswer = sanitizeRichText(answer);

    const faq = await db.faqItem.create({
      data: {
        question,
        answer: cleanAnswer,
        category: category || null,
        sortOrder,
        isActive,
      },
    });

    return NextResponse.json({ success: true, faq }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating FAQ item:', error);
    return NextResponse.json({ error: 'Failed to create FAQ item' }, { status: 500 });
  }
}

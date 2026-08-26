import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FaqItemSchema } from '@/lib/validation/cms';
import { sanitizeRichText } from '@/lib/sanitization/html';
import { getAdminSession } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const faq = await db.faqItem.findUnique({
      where: { id },
    });

    if (!faq) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
    }

    return NextResponse.json({ faq });
  } catch (error: any) {
    console.error('Error fetching FAQ:', error);
    return NextResponse.json({ error: 'Failed to fetch FAQ' }, { status: 500 });
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
    const parsed = FaqItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const existing = await db.faqItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
    }

    const { question, answer, category, sortOrder, isActive } = parsed.data;
    const cleanAnswer = sanitizeRichText(answer);

    const updated = await db.faqItem.update({
      where: { id },
      data: {
        question,
        answer: cleanAnswer,
        category: category || null,
        sortOrder,
        isActive,
      },
    });

    return NextResponse.json({ success: true, faq: updated });
  } catch (error: any) {
    console.error('Error updating FAQ:', error);
    return NextResponse.json({ error: 'Failed to update FAQ' }, { status: 500 });
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
    const existing = await db.faqItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
    }

    await db.faqItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'FAQ deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting FAQ:', error);
    return NextResponse.json({ error: 'Failed to delete FAQ' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { id } = await params;
    const faq = await db.faqItem.findUnique({ where: { id } });
    if (!faq) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
    }

    const updated = await db.faqItem.update({
      where: { id },
      data: { isActive: !faq.isActive },
    });

    return NextResponse.json({
      success: true,
      faq: updated,
      message: `FAQ is now ${updated.isActive ? 'Active' : 'Inactive'}.`,
    });
  } catch (error: any) {
    console.error('Error toggling FAQ status:', error);
    return NextResponse.json({ error: 'Failed to toggle FAQ status' }, { status: 500 });
  }
}

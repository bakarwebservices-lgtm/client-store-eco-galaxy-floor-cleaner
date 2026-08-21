import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RestockScheduleSchema } from '@/lib/validation/communication';
import { getAdminSession } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const variantId = searchParams.get('variantId');

    const schedules = await db.restockSchedule.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(variantId ? { variantId } : {}),
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        variant: { select: { id: true, sku: true, title: true, color: true, size: true } },
      },
      orderBy: { expectedDate: 'asc' },
    });

    return NextResponse.json({ schedules });
  } catch (error: any) {
    console.error('Error fetching restock schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RestockScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { productId, variantId, expectedDate, actualDate, notes } = parsed.data;

    const schedule = await db.restockSchedule.upsert({
      where: {
        productId_variantId: {
          productId,
          variantId: variantId || null as any,
        },
      },
      create: {
        productId,
        variantId: variantId || null,
        expectedDate: new Date(expectedDate),
        actualDate: actualDate ? new Date(actualDate) : null,
        notes: notes || null,
      },
      update: {
        expectedDate: new Date(expectedDate),
        actualDate: actualDate ? new Date(actualDate) : undefined,
        notes: notes || undefined,
      },
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error: any) {
    console.error('Error creating/updating restock schedule:', error);
    return NextResponse.json({ error: 'Failed to save restock schedule' }, { status: 500 });
  }
}

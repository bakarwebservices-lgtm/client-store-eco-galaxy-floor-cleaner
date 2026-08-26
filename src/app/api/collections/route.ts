import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CollectionSchema } from '@/lib/validation/taxonomy';
import { getAdminSession } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';

    if (isAdmin) {
      const admin = await getAdminSession();
      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
      }
    }

    const where = isAdmin ? {} : { isActive: true };

    const collections = await db.collection.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({ collections });
  } catch (error: any) {
    console.error('Error fetching collections:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CollectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      name,
      slug,
      description,
      imageUrl,
      imageAlt,
      type,
      ruleField,
      ruleOperator,
      ruleValue,
      isActive,
      sortOrder,
      seoTitle,
      seoDescription,
      productIds,
    } = parsed.data;

    // Check slug uniqueness
    const existing = await db.collection.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json({ error: 'A collection with this slug already exists' }, { status: 409 });
    }

    const collection = await db.$transaction(async (tx) => {
      const col = await tx.collection.create({
        data: {
          name,
          slug,
          description: description || null,
          imageUrl: imageUrl || null,
          imageAlt: imageAlt || null,
          type,
          ruleField: type === 'SMART' ? ruleField || null : null,
          ruleOperator: type === 'SMART' ? ruleOperator || null : null,
          ruleValue: type === 'SMART' ? ruleValue || null : null,
          isActive,
          sortOrder,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
        },
      });

      // If manual collection, attach products
      if (type === 'MANUAL' && productIds.length > 0) {
        await tx.collectionProduct.createMany({
          data: productIds.map((pid, idx) => ({
            collectionId: col.id,
            productId: pid,
            position: idx,
          })),
        });
      }

      return col;
    });

    return NextResponse.json({ success: true, collection }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CollectionSchema } from '@/lib/validation/taxonomy';
import { getAdminSession } from '@/lib/auth/admin';
import { resolveSmartCollectionWhere } from '@/lib/taxonomy/smartCollection';
import { ProductStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const skip = (page - 1) * limit;
    const isAdmin = searchParams.get('admin') === 'true';

    const collection = await db.collection.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...(isAdmin ? {} : { isActive: true }),
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    let products: any[] = [];
    let totalProducts = 0;

    if (collection.type === 'SMART') {
      // SMART collection: evaluate dynamic rule with effective variant price check
      const ruleWhere = resolveSmartCollectionWhere({
        ruleField: collection.ruleField,
        ruleOperator: collection.ruleOperator,
        ruleValue: collection.ruleValue,
      });

      const baseWhere: Prisma.ProductWhereInput = {
        deletedAt: null,
        ...(isAdmin ? {} : { status: ProductStatus.ACTIVE }),
        ...ruleWhere,
      };

      [products, totalProducts] = await Promise.all([
        db.product.findMany({
          where: baseWhere,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            },
            variants: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        }),
        db.product.count({ where: baseWhere }),
      ]);
    } else {
      // MANUAL collection: fetch through CollectionProduct join table with position ordering
      const [colProducts, totalCount] = await Promise.all([
        db.collectionProduct.findMany({
          where: {
            collectionId: collection.id,
            product: {
              deletedAt: null,
              ...(isAdmin ? {} : { status: ProductStatus.ACTIVE }),
            },
          },
          orderBy: { position: 'asc' },
          skip,
          take: limit,
          include: {
            product: {
              include: {
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
                },
                variants: {
                  where: { isActive: true },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        }),
        db.collectionProduct.count({
          where: {
            collectionId: collection.id,
            product: {
              deletedAt: null,
              ...(isAdmin ? {} : { status: ProductStatus.ACTIVE }),
            },
          },
        }),
      ]);

      products = colProducts.map((cp) => cp.product);
      totalProducts = totalCount;
    }

    return NextResponse.json({
      collection,
      products,
      pagination: {
        page,
        limit,
        total: totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching single collection:', error);
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 });
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

    const existing = await db.collection.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check slug conflict
    const conflict = await db.collection.findFirst({
      where: { slug, id: { not: id } },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Another collection is already using this slug' }, { status: 409 });
    }

    const updated = await db.$transaction(async (tx) => {
      const col = await tx.collection.update({
        where: { id },
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

      // Update manual products
      await tx.collectionProduct.deleteMany({ where: { collectionId: id } });
      if (type === 'MANUAL' && productIds.length > 0) {
        await tx.collectionProduct.createMany({
          data: productIds.map((pid, idx) => ({
            collectionId: id,
            productId: pid,
            position: idx,
          })),
        });
      }

      return col;
    });

    return NextResponse.json({ success: true, collection: updated });
  } catch (error: any) {
    console.error('Error updating collection:', error);
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
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

    const existing = await db.collection.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    await db.collection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Collection removed successfully' });
  } catch (error: any) {
    console.error('Error deleting collection:', error);
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}

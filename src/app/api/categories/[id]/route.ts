import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CategorySchema } from '@/lib/validation/taxonomy';
import { getAdminSession } from '@/lib/auth/admin';
import { ProductStatus } from '@prisma/client';

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

    const category = await db.category.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...(isAdmin ? {} : { isActive: true }),
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Fetch paginated products in this category
    const [categoryProducts, totalProducts] = await Promise.all([
      db.categoryProduct.findMany({
        where: {
          categoryId: category.id,
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
      db.categoryProduct.count({
        where: {
          categoryId: category.id,
          product: {
            deletedAt: null,
            ...(isAdmin ? {} : { status: ProductStatus.ACTIVE }),
          },
        },
      }),
    ]);

    const products = categoryProducts.map((cp) => cp.product);

    return NextResponse.json({
      category,
      products,
      pagination: {
        page,
        limit,
        total: totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching single category:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
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
    const parsed = CategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, slug, description, imageUrl, imageAlt, isActive, sortOrder, seoTitle, seoDescription } = parsed.data;

    const existing = await db.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check slug conflict with another category
    const conflict = await db.category.findFirst({
      where: { slug, id: { not: id } },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Another category is already using this slug' }, { status: 409 });
    }

    const updated = await db.category.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        imageUrl: imageUrl || null,
        imageAlt: imageAlt || null,
        isActive,
        sortOrder,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
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

    const existing = await db.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    await db.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Category removed successfully' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}

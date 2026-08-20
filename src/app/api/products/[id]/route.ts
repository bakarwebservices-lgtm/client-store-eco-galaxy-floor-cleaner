import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productSchema } from '@/lib/validation/product';
import { getAdminSession } from '@/lib/auth/admin';
import { ProductStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const isAdmin = searchParams.get('admin') === 'true';

    // Can query either by UUID or slug
    const product = await db.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
        ...(isAdmin ? {} : { status: ProductStatus.ACTIVE }),
      },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
        },
        variants: {
          where: isAdmin ? undefined : { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Failed to fetch single product:', error);
    return NextResponse.json({ error: 'Failed to retrieve product' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || 'Invalid product payload';
      return NextResponse.json({ error: firstError, details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    // Check existing product
    const existing = await db.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check slug uniqueness against other products
    const slugConflict = await db.product.findFirst({
      where: {
        slug: data.slug,
        id: { not: id },
      },
    });
    if (slugConflict) {
      return NextResponse.json({ error: 'Another product is already using this slug.' }, { status: 409 });
    }

    // Transaction for atomic update
    await db.$transaction(async (tx) => {
      // 1. Update product base fields
      await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          comparePrice: data.comparePrice ?? null,
          status: data.status,
          type: data.type ?? null,
          vendor: data.vendor ?? null,
          tags: data.tags,
          weight: data.weight ?? null,
          featured: data.featured,
          hasVariants: data.hasVariants,
          seoTitle: data.seoTitle ?? null,
          seoDescription: data.seoDescription ?? null,
        },
      });

      // 2. Refresh Categories
      await tx.categoryProduct.deleteMany({ where: { productId: id } });
      if (data.categoryIds.length > 0) {
        await tx.categoryProduct.createMany({
          data: data.categoryIds.map((catId, idx) => ({
            productId: id,
            categoryId: catId,
            position: idx,
          })),
        });
      }

      // 3. Refresh Variants
      await tx.productVariant.deleteMany({ where: { productId: id } });
      if (data.hasVariants && data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: id,
            title: v.title,
            sku: v.sku,
            price: v.price ?? null,
            comparePrice: v.comparePrice ?? null,
            inventoryQty: v.inventoryQty,
            color: v.color ?? null,
            size: v.size ?? null,
            barcode: v.barcode ?? null,
            isActive: v.isActive,
          })),
        });
      }

      // 4. Refresh Images
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img, idx) => ({
            productId: id,
            url: img.url,
            altText: img.altText || data.name,
            position: img.position ?? idx,
            isPrimary: img.isPrimary ?? (idx === 0),
          })),
        });
      }
    });

    const updated = await db.product.findUnique({
      where: { id },
      include: {
        images: true,
        variants: true,
        categories: { include: { category: true } },
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const { id } = await params;

    // Per BUILD_STANDARDS.md & Schema: Soft delete only (never hard delete)
    const product = await db.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: ProductStatus.ARCHIVED,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Product archived and soft-deleted successfully',
      productId: product.id,
    });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ error: 'Failed to soft delete product' }, { status: 500 });
  }
}

import { NextRequest, NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { productSchema } from '@/lib/validation/product';
import { getAdminSession } from '@/lib/auth/admin';
import { ProductStatus } from '@prisma/client';
import { dispatchRestockAlerts } from '@/lib/email/restock';

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

      // 3. Upsert / Sync Variants (preserves existing variant IDs so foreign keys like WaitlistSubscription are not cascade-deleted)
      if (data.hasVariants && data.variants.length > 0) {
        const incomingSkus = new Set(data.variants.map((v) => v.sku));
        const incomingIds = new Set(data.variants.map((v) => v.id).filter(Boolean) as string[]);

        // Delete variants that were removed from the product
        const variantsToDelete = existing.variants.filter(
          (ev) => !incomingSkus.has(ev.sku) && !incomingIds.has(ev.id)
        );
        if (variantsToDelete.length > 0) {
          await tx.productVariant.deleteMany({
            where: { id: { in: variantsToDelete.map((v) => v.id) } },
          });
        }

        // Update existing or create new variants
        for (const v of data.variants) {
          const matched = existing.variants.find(
            (ev) => (v.id && ev.id === v.id) || ev.sku === v.sku
          );

          if (matched) {
            await tx.productVariant.update({
              where: { id: matched.id },
              data: {
                title: v.title,
                sku: v.sku,
                price: v.price ?? null,
                comparePrice: v.comparePrice ?? null,
                inventoryQty: v.inventoryQty,
                color: v.color ?? null,
                size: v.size ?? null,
                barcode: v.barcode ?? null,
                isActive: v.isActive,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
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
              },
            });
          }
        }
      } else {
        await tx.productVariant.deleteMany({ where: { productId: id } });
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

    // Identify variants that genuinely transitioned from 0 (or new) to >0 stock
    const oldVariantsMap = new Map<string, number>();
    for (const ov of existing.variants) {
      oldVariantsMap.set(ov.id, ov.inventoryQty);
      if (ov.sku) oldVariantsMap.set(ov.sku, ov.inventoryQty);
    }

    const replenishedVariantIds: string[] = [];
    if (updated && updated.variants.length > 0) {
      for (const variant of updated.variants) {
        const oldQty = oldVariantsMap.has(variant.id)
          ? oldVariantsMap.get(variant.id)!
          : (oldVariantsMap.has(variant.sku) ? oldVariantsMap.get(variant.sku)! : 0);

        // Genuine 0 -> positive stock transition
        if (oldQty === 0 && variant.inventoryQty > 0) {
          replenishedVariantIds.push(variant.id);
        }
      }
    }

    // If variants were genuinely replenished from 0 to > 0, trigger restock alert emails via after()
    if (replenishedVariantIds.length > 0) {
      after(async () => {
        try {
          for (const variantId of replenishedVariantIds) {
            await dispatchRestockAlerts({ productId: id, variantId });
          }
          // Also dispatch base product subscribers
          await dispatchRestockAlerts({ productId: id });
        } catch (dispatchErr) {
          console.error('[Product Update Restock Hook Error]', dispatchErr);
        }
      });
    }

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

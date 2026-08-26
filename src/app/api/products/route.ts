import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productSchema } from '@/lib/validation/product';
import { getAdminSession } from '@/lib/auth/admin';
import { Prisma, ProductStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const skip = (page - 1) * limit;

    const categorySlug = searchParams.get('category');
    const status = searchParams.get('status') as ProductStatus | null;
    const sort = searchParams.get('sort') || 'newest';
    const query = searchParams.get('q')?.trim();
    const featured = searchParams.get('featured') === 'true';
    const isAdmin = searchParams.get('admin') === 'true';

    // Storefront only gets non-deleted ACTIVE products by default
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    if (!isAdmin) {
      where.status = ProductStatus.ACTIVE;
    } else if (status) {
      where.status = status;
    }

    if (featured) {
      where.featured = true;
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ];
    }

    if (categorySlug) {
      where.categories = {
        some: {
          category: {
            slug: categorySlug,
            isActive: true,
          },
        },
      };
    }

    // Determine sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price-asc') orderBy = { price: 'asc' };
    else if (sort === 'price-desc') orderBy = { price: 'desc' };
    else if (sort === 'name-asc') orderBy = { name: 'asc' };
    else if (sort === 'name-desc') orderBy = { name: 'desc' };

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
          },
          variants: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
          },
          categories: {
            include: {
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
      db.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to query products:', error);
    return NextResponse.json({ error: 'Failed to retrieve products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || 'Invalid product payload';
      return NextResponse.json({ error: firstError, details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    // Check slug uniqueness
    const existingSlug = await db.product.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      return NextResponse.json({ error: 'A product with this slug already exists. Please choose a unique slug.' }, { status: 409 });
    }

    // Check variant SKU uniqueness if variants provided
    if (data.hasVariants && data.variants.length > 0) {
      const skus = data.variants.map((v) => v.sku);
      const duplicateSkusInPayload = skus.filter((sku, idx) => skus.indexOf(sku) !== idx);
      if (duplicateSkusInPayload.length > 0) {
        return NextResponse.json({ error: `Duplicate SKU found in payload: ${duplicateSkusInPayload.join(', ')}` }, { status: 400 });
      }

      const existingSkusInDb = await db.productVariant.findMany({
        where: { sku: { in: skus } },
        select: { sku: true },
      });
      if (existingSkusInDb.length > 0) {
        return NextResponse.json(
          { error: `The following SKUs are already in use: ${existingSkusInDb.map((s) => s.sku).join(', ')}` },
          { status: 409 }
        );
      }
    }

    // Execute product creation in a transaction
    const newProduct = await db.$transaction(async (tx) => {
      const product = await tx.product.create({
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

      // Link categories
      if (data.categoryIds.length > 0) {
        await tx.categoryProduct.createMany({
          data: data.categoryIds.map((catId, idx) => ({
            productId: product.id,
            categoryId: catId,
            position: idx,
          })),
        });
      }

      // Create variants
      if (data.hasVariants && data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: product.id,
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

      // Create images
      if (data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img, idx) => ({
            productId: product.id,
            url: img.url,
            altText: img.altText || data.name,
            position: img.position ?? idx,
            isPrimary: img.isPrimary ?? (idx === 0),
          })),
        });
      }

      return product;
    });

    // Fetch complete newly created product
    const fullProduct = await db.product.findUnique({
      where: { id: newProduct.id },
      include: {
        images: true,
        variants: true,
        categories: { include: { category: true } },
      },
    });

    return NextResponse.json({ success: true, product: fullProduct }, { status: 201 });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

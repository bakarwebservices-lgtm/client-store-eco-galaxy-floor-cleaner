import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { ProductStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    await params;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';

    const products = await db.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        ...(query
          ? {
              name: { contains: query, mode: 'insensitive' },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        images: {
          select: { url: true, altText: true },
          orderBy: { position: 'asc' },
          take: 1,
        },
        variants: {
          select: {
            id: true,
            title: true,
            sku: true,
            price: true,
            inventoryQty: true,
            color: true,
            size: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      take: 50,
      orderBy: { name: 'asc' },
    });

    const mapped = products.map((p) => ({
      ...p,
      title: p.name,
      basePrice: p.price,
    }));

    return NextResponse.json({ products: mapped });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch available catalog products' }, { status: 500 });
  }
}

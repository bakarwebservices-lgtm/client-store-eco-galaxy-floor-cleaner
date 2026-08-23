import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { parseReviewCsv, ValidatedReviewRow } from '@/lib/csv/reviewImport';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();

    const body = await req.json();
    const { csvContent, mode = 'validate' } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing csvContent' },
        { status: 400 }
      );
    }

    const { rows, totalRows, parseErrors } = parseReviewCsv(csvContent);

    if (totalRows === 0 && parseErrors.length > 0) {
      return NextResponse.json(
        {
          error: parseErrors[0].error,
          errors: parseErrors,
        },
        { status: 400 }
      );
    }

    // Load active products and variants for SKU/slug matching
    const products = await db.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        variants: {
          select: { sku: true },
        },
      },
    });

    const slugMap = new Map<string, { id: string; name: string }>();
    const skuMap = new Map<string, { id: string; name: string }>();
    const titleMap = new Map<string, { id: string; name: string }>();
    const idMap = new Map<string, { id: string; name: string }>();

    for (const p of products) {
      const pInfo = { id: p.id, name: p.name };
      slugMap.set(p.slug.toLowerCase(), pInfo);
      idMap.set(p.id.toLowerCase(), pInfo);
      titleMap.set(p.name.toLowerCase(), pInfo);

      for (const v of p.variants) {
        if (v.sku) {
          skuMap.set(v.sku.toLowerCase(), pInfo);
        }
      }
    }

    const validatedRows: ValidatedReviewRow[] = [];
    const allErrors = [...parseErrors];

    for (const row of rows) {
      let matched: { id: string; name: string } | undefined;

      // 1. Try slug / handle match
      if (row.productHandle) {
        matched = slugMap.get(row.productHandle.toLowerCase()) || idMap.get(row.productHandle.toLowerCase());
      }

      // 2. Try SKU match
      if (!matched && row.productSku) {
        matched = skuMap.get(row.productSku.toLowerCase()) || idMap.get(row.productSku.toLowerCase());
      }

      // 3. Try Product Title match
      if (!matched && row.productTitle) {
        matched = titleMap.get(row.productTitle.toLowerCase());
      }

      if (matched) {
        validatedRows.push({
          ...row,
          matchedProductId: matched.id,
          matchedProductName: matched.name,
        });
      } else {
        const identifier =
          row.productHandle || row.productSku || row.productTitle || 'Unknown';
        const errorMsg = `No product found in catalog matching identifier "${identifier}".`;
        allErrors.push({
          row: row.rowNumber,
          error: errorMsg,
        });
        validatedRows.push({
          ...row,
          error: errorMsg,
        });
      }
    }

    const validRows = validatedRows.filter((r) => Boolean(r.matchedProductId));

    if (mode === 'validate') {
      return NextResponse.json({
        totalRows,
        validCount: validRows.length,
        failedCount: allErrors.length,
        errors: allErrors,
        previewRows: validatedRows.slice(0, 10),
      });
    }

    if (mode === 'commit') {
      if (validRows.length === 0) {
        return NextResponse.json(
          {
            error: 'No valid review rows found to import.',
            errors: allErrors,
          },
          { status: 400 }
        );
      }

      // Execute transactional batch creation
      const createdReviews = await db.$transaction(
        validRows.map((r) =>
          db.review.create({
            data: {
              productId: r.matchedProductId!,
              reviewerName: r.reviewerName,
              rating: r.rating,
              title: r.title || null,
              body: r.body || null,
              images: r.images,
              isApproved: false, // Default isApproved: false per spec
              isVerified: r.isVerified, // Respect source verified buyer flag
              createdAt: r.createdAt || new Date(),
            },
          })
        )
      );

      return NextResponse.json({
        success: true,
        importedCount: createdReviews.length,
        failedCount: allErrors.length,
        errors: allErrors,
        message: `Successfully imported ${createdReviews.length} reviews (${allErrors.length} skipped with errors).`,
      });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (error: any) {
    console.error('Review import error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process review import' },
      { status: error?.status || 500 }
    );
  }
}

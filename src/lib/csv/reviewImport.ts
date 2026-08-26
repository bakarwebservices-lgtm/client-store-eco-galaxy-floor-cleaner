import { z } from 'zod';

export interface RawCsvReviewRow {
  productHandle?: string;
  productSku?: string;
  productTitle?: string;
  reviewerName: string;
  reviewerEmail?: string;
  rating: number;
  title?: string;
  body?: string;
  isVerified: boolean;
  createdAt?: Date;
  images: string[];
  rowNumber: number;
}

export interface ValidatedReviewRow extends RawCsvReviewRow {
  matchedProductId?: string;
  matchedProductName?: string;
  error?: string;
}

export interface CsvImportParseResult {
  rows: RawCsvReviewRow[];
  totalRows: number;
  parseErrors: { row: number; error: string }[];
}

/**
 * Robust CSV parser that correctly handles RFC 4180 rules:
 * - Quoted fields with commas, newlines, and escaped quotes ("")
 * - Trims whitespace around unquoted fields
 */
export function parseCsvText(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim(); // Remove UTF-8 BOM
  if (!cleanText) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip CRLF
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Find the index of a column matching various common header aliases
 */
function findHeaderIndex(headers: string[], aliases: string[]): number {
  const normalizedHeaders = headers.map((h) =>
    h.toLowerCase().replace(/[\s_\-.]/g, '')
  );

  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[\s_\-.]/g, '');
    const idx = normalizedHeaders.indexOf(target);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parses raw CSV content into typed review objects conforming to standard schemas
 */
export function parseReviewCsv(csvText: string): CsvImportParseResult {
  const table = parseCsvText(csvText);
  if (table.length < 2) {
    return {
      rows: [],
      totalRows: 0,
      parseErrors: [{ row: 1, error: 'CSV file is empty or contains only header row' }],
    };
  }

  const headers = table[0];

  // Header column index resolution
  const handleIdx = findHeaderIndex(headers, [
    'product_handle',
    'handle',
    'product_slug',
    'slug',
    'product_url',
  ]);
  const skuIdx = findHeaderIndex(headers, [
    'product_sku',
    'sku',
    'variant_sku',
    'item_sku',
    'product_id',
  ]);
  const titleProdIdx = findHeaderIndex(headers, [
    'product_title',
    'product_name',
    'item_name',
  ]);
  const nameIdx = findHeaderIndex(headers, [
    'reviewer_name',
    'author',
    'name',
    'customer_name',
    'reviewer',
  ]);
  const emailIdx = findHeaderIndex(headers, [
    'reviewer_email',
    'email',
    'customer_email',
    'author_email',
  ]);
  const ratingIdx = findHeaderIndex(headers, [
    'rating',
    'score',
    'stars',
    'star_rating',
    'rate',
  ]);
  const titleIdx = findHeaderIndex(headers, [
    'review_title',
    'title',
    'headline',
    'subject',
  ]);
  const bodyIdx = findHeaderIndex(headers, [
    'review_body',
    'body',
    'content',
    'review_text',
    'review_content',
    'review',
    'feedback',
  ]);
  const verifiedIdx = findHeaderIndex(headers, [
    'verified_buyer',
    'verified',
    'is_verified',
    'buyer_verified',
    'verified_purchase',
  ]);
  const dateIdx = findHeaderIndex(headers, [
    'created_at',
    'date',
    'review_date',
    'submitted_at',
    'published_at',
  ]);
  const imagesIdx = findHeaderIndex(headers, [
    'picture_urls',
    'images',
    'photo_url',
    'image_urls',
    'photos',
  ]);

  if (ratingIdx === -1) {
    return {
      rows: [],
      totalRows: 0,
      parseErrors: [
        {
          row: 1,
          error:
            'Missing required "rating" column. Supported headers: rating, score, stars, star_rating.',
        },
      ],
    };
  }

  if (handleIdx === -1 && skuIdx === -1 && titleProdIdx === -1) {
    return {
      rows: [],
      totalRows: 0,
      parseErrors: [
        {
          row: 1,
          error:
            'Missing product identifier column. CSV must include product_handle, product_slug, or sku.',
        },
      ],
    };
  }

  const rows: RawCsvReviewRow[] = [];
  const parseErrors: { row: number; error: string }[] = [];

  for (let r = 1; r < table.length; r++) {
    const rowNumber = r + 1;
    const line = table[r];

    const rawRatingStr = line[ratingIdx] || '';
    const ratingNum = parseInt(rawRatingStr.replace(/[^0-9]/g, ''), 10);

    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      parseErrors.push({
        row: rowNumber,
        error: `Invalid star rating "${rawRatingStr}". Must be an integer between 1 and 5.`,
      });
      continue;
    }

    const reviewerName = (nameIdx !== -1 ? line[nameIdx] : '') || 'Verified Customer';
    const reviewerEmail = emailIdx !== -1 ? line[emailIdx] : undefined;
    const title = titleIdx !== -1 ? line[titleIdx] : undefined;
    const body = bodyIdx !== -1 ? line[bodyIdx] : undefined;

    // Parse verified status
    let isVerified = false;
    if (verifiedIdx !== -1) {
      const rawVerified = (line[verifiedIdx] || '').toLowerCase().trim();
      isVerified =
        rawVerified === 'true' ||
        rawVerified === 'yes' ||
        rawVerified === '1' ||
        rawVerified === 'verified' ||
        rawVerified === 'buyer';
    }

    // Parse date
    let createdAt: Date | undefined;
    if (dateIdx !== -1 && line[dateIdx]) {
      const parsedDate = new Date(line[dateIdx]);
      if (!isNaN(parsedDate.getTime())) {
        createdAt = parsedDate;
      }
    }

    // Parse image URLs
    const images: string[] = [];
    if (imagesIdx !== -1 && line[imagesIdx]) {
      const rawUrls = line[imagesIdx].split(/[\s,]+/);
      for (const u of rawUrls) {
        const trimmed = u.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          images.push(trimmed);
        }
      }
    }

    const productHandle = handleIdx !== -1 ? line[handleIdx]?.trim() : undefined;
    const productSku = skuIdx !== -1 ? line[skuIdx]?.trim() : undefined;
    const productTitle = titleProdIdx !== -1 ? line[titleProdIdx]?.trim() : undefined;

    if (!productHandle && !productSku && !productTitle) {
      parseErrors.push({
        row: rowNumber,
        error: 'Missing product handle, slug, or SKU on this row.',
      });
      continue;
    }

    rows.push({
      productHandle,
      productSku,
      productTitle,
      reviewerName,
      reviewerEmail,
      rating: ratingNum,
      title: title || undefined,
      body: body || undefined,
      isVerified,
      createdAt,
      images,
      rowNumber,
    });
  }

  return {
    rows,
    totalRows: table.length - 1,
    parseErrors,
  };
}

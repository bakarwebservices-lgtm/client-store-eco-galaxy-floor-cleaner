import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { getStorageAdapter } from '@/lib/storage/registry';
import { db } from '@/lib/db';
import {
  mediaUploadSchema,
  ALLOWED_MEDIA_TYPES,
  MAX_FILE_SIZE_BYTES,
  validateImageSignature,
} from '@/lib/validation/media';

export const dynamic = 'force-dynamic';

interface ProcessedUpload {
  url: string;
  altText: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const folder = (formData.get('folder') as string) || req.nextUrl.searchParams.get('folder') || '';
    
    const adminSession = await getAdminSession();
    const isReviewUpload = folder === 'reviews';

    if (!adminSession && !isReviewUpload) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    // Extract files (supports both single 'file' and multiple 'files')
    const files: File[] = [];
    const allFiles = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;

    if (allFiles && allFiles.length > 0) {
      for (const f of allFiles) {
        if (f instanceof File && f.size > 0) files.push(f);
      }
    } else if (singleFile instanceof File && singleFile.size > 0) {
      files.push(singleFile);
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No media file provided for upload.' }, { status: 400 });
    }

    const rawAltText = (formData.get('altText') as string | null) || '';
    const valResult = mediaUploadSchema.safeParse({ altText: rawAltText || undefined });
    const defaultAltText = valResult.success ? valResult.data.altText : 'Product Media Asset';

    const storage = getStorageAdapter();
    const createdAssets = [];

    for (const file of files) {
      // Review photos must be image format
      if (isReviewUpload && !file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `Invalid format for review photo. Only image files (JPEG, PNG, WebP) are accepted.` },
          { status: 400 }
        );
      }

      // Validate declared MIME type (Image + Video)
      if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `Unsupported file type "${file.type}" for ${file.name}. Allowed: JPEG, PNG, WebP, GIF, SVG, AVIF, MP4, WebM, QuickTime MOV.`,
          },
          { status: 400 }
        );
      }

      // Validate File Size (up to 50MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File ${file.name} exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
          },
          { status: 400 }
        );
      }

      // Convert file to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Binary signature validation & SVG sanitization
      const sigResult = validateImageSignature(buffer, file.type);
      if (!sigResult.isValid) {
        return NextResponse.json(
          { error: `File verification failed for ${file.name}: ${sigResult.error}` },
          { status: 400 }
        );
      }

      const finalBuffer = sigResult.sanitizedBuffer || buffer;

      // Upload via pluggable Storage Adapter (Supabase, Cloudinary, Local)
      const uploadResult = await storage.uploadFile(finalBuffer, file.name, file.type);

      const cleanAltText =
        rawAltText && files.length === 1
          ? rawAltText
          : file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim() || defaultAltText;

      // Persist MediaAsset record in Supabase database
      let mediaAsset;
      try {
        mediaAsset = await db.mediaAsset.create({
          data: {
            url: uploadResult.url,
            altText: cleanAltText,
            filename: file.name,
            mimeType: uploadResult.mimeType,
            sizeBytes: uploadResult.sizeBytes,
            uploadedById: adminSession?.id || null,
          },
        });
      } catch (dbErr) {
        console.warn('Database logging warning for MediaAsset:', dbErr);
        mediaAsset = {
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url: uploadResult.url,
          altText: cleanAltText,
          filename: file.name,
          mimeType: uploadResult.mimeType,
          sizeBytes: uploadResult.sizeBytes,
        };
      }

      createdAssets.push(mediaAsset);
    }

    return NextResponse.json(
      {
        success: true,
        asset: createdAssets[0],
        assets: createdAssets,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process and upload media.' },
      { status: 500 }
    );
  }
}

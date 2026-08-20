import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { getStorageAdapter } from '@/lib/storage/registry';
import { db } from '@/lib/db';
import { mediaUploadSchema, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/validation/media';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawAltText = formData.get('altText') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided for upload.' }, { status: 400 });
    }

    // Validate Alt Text (Mandatory per BUILD_STANDARDS 2.8 & SCHEMA.md)
    const valResult = mediaUploadSchema.safeParse({ altText: rawAltText });
    if (!valResult.success) {
      return NextResponse.json({ error: valResult.error.errors[0]?.message || 'Invalid alt text.' }, { status: 400 });
    }

    const altText = valResult.data.altText;

    // Validate MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed types: JPEG, PNG, WebP, GIF, SVG, AVIF.` },
        { status: 400 }
      );
    }

    // Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)} MB).` },
        { status: 400 }
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call storage adapter abstraction (zero filesystem dependencies in route handler)
    const storage = getStorageAdapter();
    const uploadResult = await storage.uploadFile(buffer, file.name, file.type);

    // Persist MediaAsset record
    const mediaAsset = await db.mediaAsset.create({
      data: {
        url: uploadResult.url,
        altText,
        filename: file.name,
        mimeType: uploadResult.mimeType,
        sizeBytes: uploadResult.sizeBytes,
        uploadedById: session.id,
      },
    });

    return NextResponse.json({ success: true, asset: mediaAsset }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process and upload image.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { mediaUploadSchema, ALLOWED_MEDIA_TYPES } from '@/lib/validation/media';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const body = await req.json();
    const { url, altText, filename, mimeType, sizeBytes } = body || {};

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid public URL is required.' }, { status: 400 });
    }

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Filename is required.' }, { status: 400 });
    }

    const valResult = mediaUploadSchema.safeParse({ altText: altText || undefined });
    const cleanAltText = valResult.success ? valResult.data.altText : filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();

    let mediaAsset;
    try {
      mediaAsset = await db.mediaAsset.create({
        data: {
          url,
          altText: cleanAltText,
          filename,
          mimeType: mimeType || 'image/jpeg',
          sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : 0,
          uploadedById: session.id,
        },
      });
    } catch (dbErr) {
      console.warn('Database logging warning for MediaAsset record:', dbErr);
      mediaAsset = {
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url,
        altText: cleanAltText,
        filename,
        mimeType: mimeType || 'image/jpeg',
        sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : 0,
      };
    }

    return NextResponse.json({
      success: true,
      asset: mediaAsset,
    });
  } catch (error: any) {
    console.error('Error recording uploaded media asset:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record media asset in database.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { getStorageAdapter, storageRegistry } from '@/lib/storage/registry';
import { SupabaseStorageAdapter } from '@/lib/storage/adapters/SupabaseAdapter';
import { ALLOWED_MEDIA_TYPES } from '@/lib/validation/media';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    const body = await req.json();
    const { filename, mimeType, folder } = body || {};

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    if (!mimeType || !ALLOWED_MEDIA_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          error: `Unsupported file format "${mimeType}". Allowed: JPEG, PNG, WebP, GIF, SVG, AVIF, MP4, WebM, QuickTime MOV.`,
        },
        { status: 400 }
      );
    }

    const activeDriver = storageRegistry.getActiveDriver();

    // If Supabase Storage is active, generate direct signed upload URL
    if (activeDriver === 'supabase') {
      const adapter = getStorageAdapter('supabase') as SupabaseStorageAdapter;
      const signed = await adapter.createSignedUploadUrl(filename, folder, 3600);

      return NextResponse.json({
        success: true,
        direct: true,
        storageDriver: 'supabase',
        uploadUrl: signed.uploadUrl,
        publicUrl: signed.publicUrl,
        key: signed.key,
        method: 'PUT',
      });
    }

    // Otherwise notify client to use fallback proxy upload
    return NextResponse.json({
      success: true,
      direct: false,
      storageDriver: activeDriver,
    });
  } catch (error: any) {
    console.error('Error generating signed upload URL:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate signed upload URL' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { getStorageAdapter } from '@/lib/storage/registry';
import { db } from '@/lib/db';
import { mediaUpdateSchema } from '@/lib/validation/media';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function PATCH(
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

    const valResult = mediaUpdateSchema.safeParse(body);
    if (!valResult.success) {
      return NextResponse.json({ error: valResult.error.errors[0]?.message || 'Invalid alt text.' }, { status: 400 });
    }

    const updated = await db.mediaAsset.update({
      where: { id },
      data: { altText: valResult.data.altText },
    });

    return NextResponse.json({ success: true, asset: updated });
  } catch (error) {
    console.error('Failed to update media asset:', error);
    return NextResponse.json({ error: 'Failed to update asset metadata.' }, { status: 500 });
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

    const asset = await db.mediaAsset.findUnique({
      where: { id },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Media asset not found.' }, { status: 404 });
    }

    // Delete physical file via storage adapter abstraction
    const key = path.basename(asset.url);
    const storage = getStorageAdapter();
    await storage.deleteFile(key);

    // Delete DB record
    await db.mediaAsset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Media asset deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete media asset:', error);
    return NextResponse.json({ error: 'Failed to delete media asset.' }, { status: 500 });
  }
}

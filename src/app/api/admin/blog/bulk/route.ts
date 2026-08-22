import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { BulkBlogPageActionSchema } from '@/lib/validation/bulk';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();

    const body = await req.json();
    const parsed = BulkBlogPageActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bulk blog payload' }, { status: 400 });
    }

    const { ids, action } = parsed.data;

    if (action === 'PUBLISH' || action === 'DRAFT') {
      const published = action === 'PUBLISH';
      const updated = await db.blogPost.updateMany({
        where: { id: { in: ids } },
        data: {
          published,
          publishedAt: published ? new Date() : null,
        },
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `${published ? 'Published' : 'Drafted'} ${updated.count} blog articles.`,
      });
    }

    if (action === 'DELETE') {
      const deleted = await db.blogPost.deleteMany({
        where: { id: { in: ids } },
      });

      return NextResponse.json({
        success: true,
        count: deleted.count,
        message: `Deleted ${deleted.count} blog articles.`,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Bulk blog error:', error);
    return NextResponse.json({ error: error?.message || 'Bulk blog action failed' }, { status: error?.status || 500 });
  }
}

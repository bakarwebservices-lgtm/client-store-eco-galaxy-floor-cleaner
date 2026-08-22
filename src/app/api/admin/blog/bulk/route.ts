import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { BulkBlogPageActionSchema } from '@/lib/validation/bulk';
import { BlogStatus } from '@prisma/client';

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
      const isPublish = action === 'PUBLISH';
      const updated = await db.blogArticle.updateMany({
        where: { id: { in: ids } },
        data: {
          status: isPublish ? BlogStatus.PUBLISHED : BlogStatus.DRAFT,
          publishedAt: isPublish ? new Date() : null,
        },
      });

      return NextResponse.json({
        success: true,
        count: updated.count,
        message: `${isPublish ? 'Published' : 'Drafted'} ${updated.count} blog articles.`,
      });
    }

    if (action === 'DELETE') {
      const deleted = await db.blogArticle.deleteMany({
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

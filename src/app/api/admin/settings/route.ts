import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/auth/admin';
import { allSettingsSchema, DEFAULT_SETTINGS } from '@/lib/validation/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required. Please log in.' }, { status: 401 });
    }

    const rows = await db.setting.findMany();

    // Map existing rows on top of default values
    const settings: Record<string, any> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (row.value !== null && row.value !== undefined) {
        settings[row.key] = row.value;
      }
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Failed to load admin settings:', error);
    return NextResponse.json({ error: 'Failed to load settings from database.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required. Please log in.' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = allSettingsSchema.partial().safeParse(body);

    if (!parsed.success) {
      const issueMessages = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      return NextResponse.json(
        {
          error: `Validation error: ${issueMessages}`,
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Persist each setting key via direct upserts (compatible with PgBouncer connection pooling)
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await db.setting.upsert({
          where: { key },
          create: { key, value: value as any },
          update: { value: value as any },
        });
      }
    }

    // Read full updated settings dictionary
    const allRows = await db.setting.findMany();
    const updatedSettings: Record<string, any> = { ...DEFAULT_SETTINGS };
    for (const row of allRows) {
      if (row.value !== null && row.value !== undefined) {
        updatedSettings[row.key] = row.value;
      }
    }

    // Revalidate root layout cache so theme tokens and site identity update immediately
    try {
      revalidatePath('/', 'layout');
    } catch {
      // Non-critical in test environments
    }

    return NextResponse.json({
      success: true,
      message: 'Store settings saved successfully.',
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error('Failed to save store settings:', error);
    return NextResponse.json({ error: `Database error: ${error?.message || 'Failed to save settings'}` }, { status: 500 });
  }
}

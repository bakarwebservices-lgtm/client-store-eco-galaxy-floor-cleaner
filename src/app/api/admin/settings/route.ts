import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/auth/admin';
import { allSettingsSchema, DEFAULT_SETTINGS } from '@/lib/validation/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
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
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = allSettingsSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid settings configuration', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    // Persist each setting key via atomic transaction
    await db.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          await tx.setting.upsert({
            where: { key },
            create: { key, value: value as any },
            update: { value: value as any },
          });
        }
      }
    });

    // Read full updated settings dictionary
    const allRows = await db.setting.findMany();
    const updatedSettings: Record<string, any> = { ...DEFAULT_SETTINGS };
    for (const row of allRows) {
      if (row.value !== null && row.value !== undefined) {
        updatedSettings[row.key] = row.value;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Store settings saved successfully.',
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error('Failed to save store settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

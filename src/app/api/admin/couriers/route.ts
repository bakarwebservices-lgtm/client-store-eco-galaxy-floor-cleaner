import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { courierRegistry } from '@/lib/couriers/registry';
import { encryptConfig, maskSecret } from '@/lib/couriers/encryption';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const courierAccountSchema = z.object({
  id: z.string().uuid().optional(),
  courierCode: z.string().min(1, 'Courier code is required'),
  accountTitle: z.string().min(1, 'Account title is required'),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  apiToken: z.string().optional(),
  apiKey: z.string().optional(),
  pickupAddressCode: z.string().optional(),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  webhookSecret: z.string().optional(),
});

export async function GET() {
  try {
    await requireAdminAuth();

    const accounts = await db.courierAccount.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    const availableCouriers = courierRegistry.listAvailableCouriers();

    // Map accounts to safe public representation (never expose raw ciphertext or decrypted tokens)
    const sanitizedAccounts = accounts.map((acc) => ({
      id: acc.id,
      courierCode: acc.courierCode,
      accountTitle: acc.accountTitle,
      isActive: acc.isActive,
      isDefault: acc.isDefault,
      maskedIdentifier: acc.maskedIdentifier || '••••••••',
      webhookSecret: acc.webhookSecret ? maskSecret(acc.webhookSecret) : null,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
    }));

    return NextResponse.json({
      accounts: sanitizedAccounts,
      availableCouriers,
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to retrieve courier configurations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth();
    const body = await req.json();

    const parsed = courierAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid courier account configuration', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      id,
      courierCode,
      accountTitle,
      isDefault,
      isActive,
      apiToken,
      apiKey,
      pickupAddressCode,
      environment,
      webhookSecret,
    } = parsed.data;

    const normalizedCode = courierCode.toUpperCase().trim();

    if (!courierRegistry.hasAdapter(normalizedCode)) {
      return NextResponse.json(
        { error: `Courier provider "${courierCode}" is not supported.` },
        { status: 400 }
      );
    }

    // If setting as default, unset previous default for this courier code
    if (isDefault) {
      await db.courierAccount.updateMany({
        where: { courierCode: normalizedCode, isDefault: true },
        data: { isDefault: false },
      });
    }

    let existing = null;
    if (id) {
      existing = await db.courierAccount.findUnique({ where: { id } });
    }

    // Prepare credentials config
    const rawToken = apiToken || apiKey || '';
    const isTokenMasked = rawToken.includes('••••') || rawToken.trim() === '';

    let encryptedPayload = null;
    let maskedIdentifier = existing?.maskedIdentifier || null;

    if (existing && isTokenMasked) {
      // Keep existing encrypted config
      encryptedPayload = {
        encryptedConfig: existing.encryptedConfig,
        configIv: existing.configIv,
        configTag: existing.configTag,
      };
    } else {
      const plainConfig: Record<string, any> = {
        apiToken: rawToken.trim(),
        apiKey: apiKey?.trim() || undefined,
        pickupAddressCode: pickupAddressCode?.trim() || undefined,
        environment,
      };

      encryptedPayload = encryptConfig(plainConfig);
      maskedIdentifier = maskSecret(rawToken);
    }

    if (id && existing) {
      const updated = await db.courierAccount.update({
        where: { id },
        data: {
          courierCode: normalizedCode,
          accountTitle: accountTitle.trim(),
          isDefault,
          isActive,
          encryptedConfig: encryptedPayload.encryptedConfig,
          configIv: encryptedPayload.configIv,
          configTag: encryptedPayload.configTag,
          maskedIdentifier,
          webhookSecret: webhookSecret?.trim() || null,
        },
      });

      return NextResponse.json({
        success: true,
        account: {
          id: updated.id,
          courierCode: updated.courierCode,
          accountTitle: updated.accountTitle,
          isActive: updated.isActive,
          isDefault: updated.isDefault,
          maskedIdentifier: updated.maskedIdentifier,
        },
      });
    }

    const created = await db.courierAccount.create({
      data: {
        courierCode: normalizedCode,
        accountTitle: accountTitle.trim(),
        isDefault,
        isActive,
        encryptedConfig: encryptedPayload.encryptedConfig,
        configIv: encryptedPayload.configIv,
        configTag: encryptedPayload.configTag,
        maskedIdentifier,
        webhookSecret: webhookSecret?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        id: created.id,
        courierCode: created.courierCode,
        accountTitle: created.accountTitle,
        isActive: created.isActive,
        isDefault: created.isDefault,
        maskedIdentifier: created.maskedIdentifier,
      },
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message || 'Failed to save courier configuration' }, { status: 500 });
  }
}

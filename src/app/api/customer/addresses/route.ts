import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth/customer';
import { customerAddressSchema } from '@/lib/validation/customer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const addresses = await db.customerAddress.findMany({
    where: { customerId: session.customerId },
    orderBy: { isDefault: 'desc' },
  });

  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = customerAddressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid address data' }, { status: 400 });
    }

    const { firstName, lastName, label, phone, address, city, province, postalCode, country, isDefault } = parsed.data;

    if (isDefault) {
      await db.customerAddress.updateMany({
        where: { customerId: session.customerId },
        data: { isDefault: false },
      });
    }

    const newAddress = await db.customerAddress.create({
      data: {
        customerId: session.customerId,
        firstName,
        lastName,
        label: label || null,
        phone: phone || null,
        address,
        city,
        province: province || null,
        postalCode: postalCode || null,
        country: country || 'Pakistan',
        isDefault,
      },
    });

    return NextResponse.json({ success: true, address: newAddress });
  } catch (error) {
    console.error('Failed to create address:', error);
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}

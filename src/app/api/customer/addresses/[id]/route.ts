import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth/customer';
import { customerAddressSchema } from '@/lib/validation/customer';
import { getSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCustomerSession();
    if (!session?.customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = customerAddressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid address data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { firstName, lastName, label, phone, address, city, province, postalCode, country, isDefault } = parsed.data;

    const existing = await db.customerAddress.findFirst({
      where: { id, customerId: session.customerId },
    });

    if (!existing) return NextResponse.json({ error: 'Address not found' }, { status: 404 });

    if (isDefault) {
      await db.customerAddress.updateMany({
        where: { customerId: session.customerId },
        data: { isDefault: false },
      });
    }

    const defaultCountry = await getSetting<string>('store.country', 'Pakistan');

    const updated = await db.customerAddress.update({
      where: { id },
      data: {
        firstName,
        lastName,
        label: label || null,
        phone: phone || null,
        address,
        city,
        province: province || null,
        postalCode: postalCode || null,
        country: country || defaultCountry,
        isDefault,
      },
    });

    return NextResponse.json({ success: true, address: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    await db.customerAddress.deleteMany({
      where: { id, customerId: session.customerId },
    });

    return NextResponse.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}

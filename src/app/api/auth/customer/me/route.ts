import { NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/auth/customer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ authenticated: false, customer: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    customer: {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      addresses: customer.addresses,
    },
  });
}

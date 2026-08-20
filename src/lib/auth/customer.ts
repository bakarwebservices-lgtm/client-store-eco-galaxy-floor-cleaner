import { cookies } from 'next/headers';
import { CUSTOMER_COOKIE_NAME, verifyCustomerToken, CustomerTokenPayload } from './token';
import { db } from '@/lib/db';

export async function getCustomerSession(): Promise<CustomerTokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyCustomerToken(token);
  } catch (error) {
    return null;
  }
}

export async function getCurrentCustomer() {
  const session = await getCustomerSession();
  if (!session) return null;

  return await db.customer.findUnique({
    where: { id: session.customerId },
    include: {
      addresses: { orderBy: { isDefault: 'desc' } },
    },
  });
}

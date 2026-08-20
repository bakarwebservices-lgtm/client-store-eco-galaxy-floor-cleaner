import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/db';

export const CART_COOKIE_NAME = 'aw_cart_session';

export async function getOrCreateCartSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (existingCookie) {
    return existingCookie;
  }

  const newSessionId = crypto.randomUUID();
  cookieStore.set({
    name: CART_COOKIE_NAME,
    value: newSessionId,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return newSessionId;
}

export async function getActiveCart(customerId?: string | null) {
  const sessionId = await getOrCreateCartSessionId();

  let cart = await db.cart.findFirst({
    where: customerId
      ? { OR: [{ customerId }, { sessionId }] }
      : { sessionId },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              comparePrice: true,
              status: true,
              images: {
                orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
                take: 1,
              },
            },
          },
          variant: {
            select: {
              id: true,
              title: true,
              sku: true,
              price: true,
              comparePrice: true,
              inventoryQty: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await db.cart.create({
      data: {
        sessionId,
        customerId: customerId || null,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                comparePrice: true,
                status: true,
                images: { take: 1 },
              },
            },
            variant: {
              select: {
                id: true,
                title: true,
                sku: true,
                price: true,
                comparePrice: true,
                inventoryQty: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  return cart;
}

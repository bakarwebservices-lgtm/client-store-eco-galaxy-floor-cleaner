import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mergeCartSchema } from '@/lib/validation/cart';
import { getCustomerSession } from '@/lib/auth/customer';

export const dynamic = 'force-dynamic';

/**
 * Merges a guest cart into a customer's cart upon login.
 * Conflict Resolution:
 * 1. If an item exists in both carts, quantities are SUMMED (guestQty + customerQty).
 * 2. The stock ceiling is re-checked against live ProductVariant.inventoryQty.
 * 3. The final merged quantity is capped at Math.min(summedQty, liveStock).
 * 4. Guest cart items are purged in the same transaction.
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate customer session strictly from cookies
    const customer = await getCustomerSession();
    if (!customer?.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid customer session required for cart merge.' },
        { status: 401 }
      );
    }

    const customerId = customer.customerId;

    const body = await req.json();
    const parsed = mergeCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid merge request' }, { status: 400 });
    }

    const { guestSessionId } = parsed.data;

    // 1. Fetch guest cart
    const guestCart = await db.cart.findUnique({
      where: { sessionId: guestSessionId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return NextResponse.json({ success: true, message: 'No guest items to merge.' });
    }

    // 2. Fetch or create customer cart
    let customerCart = await db.cart.findUnique({
      where: { customerId },
      include: { items: true },
    });

    if (!customerCart) {
      customerCart = await db.cart.create({
        data: { customerId },
        include: { items: true },
      });
    }

    // 3. Execute atomic merge with inventory ceiling re-verification
    await db.$transaction(async (tx) => {
      for (const guestItem of guestCart.items) {
        // Fetch live stock
        let liveStock = 999;
        if (guestItem.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: guestItem.variantId },
            select: { inventoryQty: true, isActive: true },
          });
          if (variant && variant.isActive) {
            liveStock = variant.inventoryQty;
          } else {
            // Variant inactive or deleted: skip adding
            continue;
          }
        }

        // Find existing customer cart item
        const existingCustomerItem = customerCart.items.find(
          (ci) =>
            ci.productId === guestItem.productId &&
            ci.variantId === guestItem.variantId
        );

        if (existingCustomerItem) {
          // Quantities are summed and capped at live stock ceiling
          const summedQuantity = existingCustomerItem.quantity + guestItem.quantity;
          const finalCappedQuantity = Math.max(1, Math.min(summedQuantity, liveStock));

          await tx.cartItem.update({
            where: { id: existingCustomerItem.id },
            data: { quantity: finalCappedQuantity },
          });
        } else {
          // New item in customer cart, capped at live stock ceiling
          const finalQuantity = Math.max(1, Math.min(guestItem.quantity, liveStock));

          await tx.cartItem.create({
            data: {
              cartId: customerCart.id,
              productId: guestItem.productId,
              variantId: guestItem.variantId,
              quantity: finalQuantity,
            },
          });
        }
      }

      // Purge guest cart items and remove guest cart container
      await tx.cartItem.deleteMany({ where: { cartId: guestCart.id } });
      await tx.cart.delete({ where: { id: guestCart.id } });
    });

    return NextResponse.json({
      success: true,
      message: 'Guest cart successfully merged into customer account with stock ceiling enforced.',
    });
  } catch (error) {
    console.error('Cart merge error:', error);
    return NextResponse.json({ error: 'Failed to merge cart' }, { status: 500 });
  }
}

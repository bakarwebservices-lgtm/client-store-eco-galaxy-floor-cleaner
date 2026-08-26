import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveCart } from '@/lib/cart/session';
import { updateCartItemSchema } from '@/lib/validation/cart';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCartItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid quantity' }, { status: 400 });
    }

    const { quantity } = parsed.data;
    const cart = await getActiveCart();

    const item = await db.cartItem.findFirst({
      where: { id, cartId: cart.id },
      include: { variant: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found in your cart' }, { status: 404 });
    }

    if (quantity <= 0) {
      await db.cartItem.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Item removed from cart' });
    }

    // Check inventory limits
    if (item.variant && quantity > item.variant.inventoryQty) {
      return NextResponse.json(
        {
          error: `Only ${item.variant.inventoryQty} units available in stock.`,
          maxAvailable: item.variant.inventoryQty,
        },
        { status: 400 }
      );
    }

    const updated = await db.cartItem.update({
      where: { id },
      data: { quantity },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Failed to update cart item:', error);
    return NextResponse.json({ error: 'Failed to update item quantity' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cart = await getActiveCart();

    const item = await db.cartItem.findFirst({
      where: { id, cartId: cart.id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found in cart' }, { status: 404 });
    }

    await db.cartItem.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Failed to remove cart item:', error);
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}

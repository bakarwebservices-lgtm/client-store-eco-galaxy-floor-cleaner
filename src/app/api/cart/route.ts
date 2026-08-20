import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveCart } from '@/lib/cart/session';
import { addToCartSchema } from '@/lib/validation/cart';
import { ProductStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cart = await getActiveCart();

    const formattedItems = cart.items.map((item) => {
      const price = item.variant?.price ?? item.product.price;
      const comparePrice = item.variant?.comparePrice ?? item.product.comparePrice;
      const availableStock = item.variant ? item.variant.inventoryQty : 999;

      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        productSlug: item.product.slug,
        variantTitle: item.variant?.title || null,
        sku: item.variant?.sku || item.product.slug,
        price,
        comparePrice,
        quantity: item.quantity,
        totalItemPrice: price * item.quantity,
        imageUrl: item.product.images[0]?.url || '/placeholder.png',
        imageAlt: item.product.images[0]?.altText || item.product.name,
        availableStock,
      };
    });

    const subtotal = formattedItems.reduce((acc, item) => acc + item.totalItemPrice, 0);
    const totalItems = formattedItems.reduce((acc, item) => acc + item.quantity, 0);

    return NextResponse.json({
      cartId: cart.id,
      items: formattedItems,
      totalItems,
      subtotal,
    });
  } catch (error) {
    console.error('Failed to get cart:', error);
    return NextResponse.json({ error: 'Failed to retrieve cart' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = addToCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid item data' }, { status: 400 });
    }

    const { productId, variantId, quantity } = parsed.data;

    // Verify Product is Active
    const product = await db.product.findUnique({
      where: { id: productId, deletedAt: null },
      include: { variants: true },
    });

    if (!product || product.status !== ProductStatus.ACTIVE) {
      return NextResponse.json({ error: 'Product is no longer available for purchase.' }, { status: 404 });
    }

    // Verify Variant and Inventory
    let availableInventory = 999;
    if (product.hasVariants) {
      if (!variantId) {
        return NextResponse.json({ error: 'Please select a product option/variant.' }, { status: 400 });
      }
      const variant = product.variants.find((v) => v.id === variantId && v.isActive);
      if (!variant) {
        return NextResponse.json({ error: 'Selected variant is not available.' }, { status: 404 });
      }
      availableInventory = variant.inventoryQty;
    }

    if (availableInventory <= 0) {
      return NextResponse.json({ error: 'Selected item is currently out of stock.' }, { status: 400 });
    }

    const cart = await getActiveCart();

    // Check if item already in cart
    const existingItem = await db.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });

    const requestedQuantity = (existingItem?.quantity || 0) + quantity;

    if (requestedQuantity > availableInventory) {
      return NextResponse.json(
        {
          error: `Cannot add more. Only ${availableInventory} units currently available in stock.`,
          maxAvailable: availableInventory,
        },
        { status: 400 }
      );
    }

    if (existingItem) {
      await db.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: requestedQuantity },
      });
    } else {
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Item added to cart.' });
  } catch (error) {
    console.error('Failed to add item to cart:', error);
    return NextResponse.json({ error: 'Failed to add item to cart' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cart = await getActiveCart();
    await db.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return NextResponse.json({ success: true, message: 'Cart cleared.' });
  } catch (error) {
    console.error('Failed to clear cart:', error);
    return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
  }
}

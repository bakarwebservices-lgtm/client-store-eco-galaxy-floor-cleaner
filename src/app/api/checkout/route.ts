import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActiveCart } from '@/lib/cart/session';
import { checkoutSchema } from '@/lib/validation/checkout';
import { getSetting } from '@/lib/settings';
import { getPaymentGateway } from '@/lib/payments/registry';
import { signOrderAccessToken } from '@/lib/auth/token';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { DiscountType, PaymentStatus, FulfillmentStatus, ProductStatus } from '@prisma/client';

import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${dateStr}-${randomSuffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid checkout details' }, { status: 400 });
    }

    const { shippingAddress, paymentMethod, couponCode, notes } = parsed.data;

    // 1. Fetch active cart
    const cart = await getActiveCart();
    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'Your cart is empty or this order has already been processed.' },
        { status: 400 }
      );
    }

    // 2. Fetch Store Settings
    const currency = await getSetting<string>('store.currency', 'PKR');
    const defaultCountry = await getSetting<string>('store.country', 'Pakistan');
    const freeShippingThreshold = await getSetting<number>('shipping.free_threshold', 5000);
    const standardShippingCost = await getSetting<number>('shipping.standard_cost', 250);

    const fullCountry = shippingAddress.country || defaultCountry;

    // 3. Atomically verify items, pricing, stock, create order, and clear cart (with collision retry loop)
    const MAX_RETRIES = 3;
    let orderResult: any = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        orderResult = await db.$transaction(async (tx) => {
          // Re-verify cart is still not empty within transaction (double-click / race protection)
          const currentCartItems = await tx.cartItem.findMany({
            where: { cartId: cart.id },
          });

          if (currentCartItems.length === 0) {
            throw new Error('This order has already been submitted and processed.');
          }

      let liveSubtotal = 0;
      const orderItemsToCreate = [];

      for (const item of cart.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId, deletedAt: null },
          include: { variants: true },
        });

        if (!product || product.status !== ProductStatus.ACTIVE) {
          throw new Error(`Product "${product?.name || item.productId}" is no longer available.`);
        }

        let unitPrice = product.price;
        let variantTitle: string | null = null;
        let sku = product.slug;

        if (item.variantId) {
          const variant = product.variants.find((v) => v.id === item.variantId && v.isActive);
          if (!variant) {
            throw new Error(`Option for "${product.name}" is no longer available.`);
          }

          // Strict inventory check
          if (variant.inventoryQty < item.quantity) {
            throw new Error(
              `Stock conflict: "${product.name} (${variant.title})" only has ${variant.inventoryQty} units remaining in stock. Please adjust your bag.`
            );
          }

          if (variant.price) unitPrice = variant.price;
          variantTitle = variant.title;
          sku = variant.sku;

          // Atomic conditional stock decrement — prevents overselling race conditions under concurrent checkouts
          const updateResult = await tx.productVariant.updateMany({
            where: {
              id: variant.id,
              inventoryQty: { gte: item.quantity },
            },
            data: {
              inventoryQty: { decrement: item.quantity },
            },
          });

          if (updateResult.count === 0) {
            throw new Error(
              `Stock conflict: "${product.name} (${variant.title})" does not have enough units available in stock. Please adjust your bag.`
            );
          }
        }

        const lineTotal = unitPrice * item.quantity;
        liveSubtotal += lineTotal;

        orderItemsToCreate.push({
          productId: product.id,
          variantId: item.variantId || null,
          productTitle: product.name,
          variantTitle,
          sku,
          weightKg: product.weight ?? null,
          quantity: item.quantity,
          unitPrice,
          totalPrice: lineTotal,
        });
      }

      // 4. Validate & apply coupon
      let discountAmount = 0;
      let appliedCouponCode: string | null = null;

      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.toUpperCase().trim() },
        });

        if (coupon && coupon.isActive) {
          const now = new Date();
          const isStarted = !coupon.startsAt || now >= coupon.startsAt;
          const isNotExpired = !coupon.expiresAt || now <= coupon.expiresAt;
          const hasUsesLeft = !coupon.maxUses || coupon.usedCount < coupon.maxUses;
          const meetsMin = !coupon.minOrderAmount || liveSubtotal >= coupon.minOrderAmount;

          if (isStarted && isNotExpired && hasUsesLeft && meetsMin) {
            appliedCouponCode = coupon.code;
            if (coupon.discountType === DiscountType.PERCENTAGE) {
              discountAmount = (liveSubtotal * coupon.discountValue) / 100;
            } else if (coupon.discountType === DiscountType.FIXED) {
              discountAmount = Math.min(liveSubtotal, coupon.discountValue);
            }

            await tx.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            });
          }
        }
      }

      // 5. Calculate Shipping & Totals
      const shippingAmount = liveSubtotal >= freeShippingThreshold ? 0 : standardShippingCost;
      const taxAmount = 0;
      const totalPrice = Math.max(0, liveSubtotal - discountAmount + shippingAmount + taxAmount);

      // 6. Customer & Guest Match Resolution (BUILD_STANDARDS 2.4)
      const rawEmail = shippingAddress.email?.trim();
      const normalizedEmail = rawEmail ? rawEmail.toLowerCase() : null;
      const normalizedPhone = shippingAddress.phone.trim();

      const customerLookupConditions: any[] = [{ phone: normalizedPhone }];
      if (normalizedEmail) {
        customerLookupConditions.push({ email: normalizedEmail });
      }

      let customer = await tx.customer.findFirst({
        where: {
          OR: customerLookupConditions,
        },
      });

      let guestOrderPossiblyLinked = false;

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            email: normalizedEmail,
            firstName: shippingAddress.firstName.trim(),
            lastName: shippingAddress.lastName.trim(),
            phone: normalizedPhone,
            passwordHash: null,
          },
        });
      } else {
        if (!cart.customerId || cart.customerId !== customer.id) {
          guestOrderPossiblyLinked = true;
          console.log(`[Email Service Stub] Guest checkout matched existing account (${normalizedEmail || 'no-email'} / ${normalizedPhone}). Flagged guestOrderPossiblyLinked.`);
        }
      }

      // 7. Payment Gateway
      const gateway = getPaymentGateway(paymentMethod || 'COD');
      const orderNumber = generateOrderNumber();

      const paymentInit = await gateway.initiatePayment({
        orderId: 'pending',
        orderNumber,
        amount: totalPrice,
        currency,
        customerEmail: normalizedEmail || undefined,
        customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        customerPhone: shippingAddress.phone,
      });

      // 8. Shipping Snapshot
      const shippingAddressSnapshot = {
        name: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
        email: normalizedEmail,
        phone: shippingAddress.phone.trim(),
        address: shippingAddress.address.trim(),
        apartment: shippingAddress.apartment?.trim() || null,
        city: shippingAddress.city.trim(),
        province: shippingAddress.province?.trim() || null,
        postalCode: shippingAddress.postalCode?.trim() || null,
        country: fullCountry,
      };

      // 9. Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          paymentStatus: PaymentStatus.UNPAID,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          paymentMethod: gateway.name,
          paymentMeta: paymentInit.meta || {},
          subtotal: liveSubtotal,
          discountAmount,
          shippingAmount,
          taxAmount,
          totalPrice,
          currency,
          couponCode: appliedCouponCode,
          shippingAddress: shippingAddressSnapshot,
          guestOrderPossiblyLinked,
          notes: notes?.trim() || null,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: true,
        },
      });

      // 10. Purge Cart Items Immediately
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    },
    {
      maxWait: 10000, // 10 seconds max wait for connection
      timeout: 30000, // 30 seconds transaction timeout for pooler safety
    }
  );

    // Successfully completed transaction without collision
    break;
  } catch (err: any) {
    lastError = err;
    const isUniqueCollision =
      err?.code === 'P2002' &&
      (JSON.stringify(err?.meta?.target || '').includes('order_number') ||
        JSON.stringify(err?.meta?.target || '').includes('orderNumber') ||
        err?.message?.includes('order_number') ||
        err?.message?.includes('orderNumber'));

    if (isUniqueCollision && attempt < MAX_RETRIES) {
      console.warn(`[Checkout] Order number collision on attempt ${attempt}. Retrying with fresh order number...`);
      continue;
    }

    // Immediately throw other errors (e.g. stock conflicts, invalid coupon)
    throw err;
  }
}

if (!orderResult) {
  throw lastError || new Error('Failed to process checkout after multiple attempts.');
}

// Dispatch order confirmation email (resilient / error-safe, only if email was provided)
if (shippingAddress.email?.trim()) {
  try {
    await sendOrderConfirmationEmail({
      id: orderResult.id,
      orderNumber: orderResult.orderNumber,
      email: shippingAddress.email.trim(),
      currency: orderResult.currency,
      subtotal: orderResult.subtotal,
      shippingFee: orderResult.shippingAmount,
      discountTotal: orderResult.discountAmount,
      totalPrice: orderResult.totalPrice,
      paymentMethod: orderResult.paymentMethod,
      items: orderResult.items.map((it: any) => ({
        productTitle: it.productTitle,
        variantTitle: it.variantTitle,
        sku: it.sku,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
      shippingAddress: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        addressLine1: shippingAddress.address,
        addressLine2: shippingAddress.apartment,
        city: shippingAddress.city,
        province: shippingAddress.province,
        postalCode: shippingAddress.postalCode,
        phone: shippingAddress.phone,
      },
    });
  } catch (emailErr) {
    console.error('[Checkout] Failed to dispatch order confirmation email:', emailErr);
  }
}

// Mark any abandoned checkout session as recovered
try {
  const checkoutSessionId = (body as any)?.sessionId || (body as any)?.checkoutSessionId;
  if (checkoutSessionId) {
    await db.abandonedCheckout.updateMany({
      where: { sessionId: checkoutSessionId, recoveredAt: null },
      data: { recoveredAt: new Date() },
    });
  }
} catch (abandonedErr) {
  console.warn('[Checkout] Failed to mark abandoned checkout recovered:', abandonedErr);
}

// Generate signed Order Access Token to authorize access to confirmation page
const orderAccessToken = await signOrderAccessToken(orderResult.id, orderResult.orderNumber);

    const response = NextResponse.json({
      success: true,
      orderId: orderResult.id,
      orderNumber: orderResult.orderNumber,
      totalPrice: orderResult.totalPrice,
      currency: orderResult.currency,
    });

    // Set secure HTTP-only access token cookie for this specific order
    response.cookies.set({
      name: `aw_order_access_${orderResult.orderNumber}`,
      value: orderAccessToken,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during checkout processing.' },
      { status: 400 }
    );
  }
}

import { db } from '../src/lib/db';
import { DiscountType, ProductStatus } from '@prisma/client';

async function runCheckoutCouponTest() {
  console.log('--- Testing Checkout with Coupon Live ---');

  // 1. Find or create a test product
  let product = await db.product.findFirst({
    where: { status: ProductStatus.ACTIVE, deletedAt: null },
    include: { variants: true },
  });

  if (!product) {
    product = await db.product.create({
      data: {
        name: 'Coupon Test Item',
        slug: `coupon-test-${Date.now()}`,
        price: 2500,
        status: ProductStatus.ACTIVE,
      },
      include: { variants: true },
    });
  }

  // Ensure inventory variant exists
  let variant = product.variants[0];
  if (!variant) {
    variant = await db.productVariant.create({
      data: {
        productId: product.id,
        title: 'Default Option',
        sku: `SKU-${Date.now()}`,
        price: product.price,
        inventoryQty: 50,
      },
    });
  } else {
    await db.productVariant.update({
      where: { id: variant.id },
      data: { inventoryQty: 50 },
    });
  }

  // 2. Create an active coupon
  const testCouponCode = `SAVE10-${Date.now()}`;
  const coupon = await db.coupon.create({
    data: {
      code: testCouponCode,
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      isActive: true,
      minOrderAmount: 100,
      maxUses: 100,
      usedCount: 0,
    },
  });

  console.log(`Created test coupon: ${testCouponCode}`);

  // 3. Create a cart session and cart item directly
  const testSessionId = `test-session-${Date.now()}`;
  const cart = await db.cart.create({
    data: {
      sessionId: testSessionId,
      items: {
        create: {
          productId: product.id,
          variantId: variant.id,
          quantity: 2,
        },
      },
    },
    include: { items: true },
  });

  console.log(`Created test cart ${cart.id} (sessionId: ${testSessionId}) with 2 units of "${product.name}"`);

  // 4. Test Checkout POST with this cart cookie
  const checkoutPayload = {
    shippingAddress: {
      firstName: 'Test',
      lastName: 'Customer',
      email: 'coupon-test@example.com',
      phone: '+923001234567',
      address: '123 Test Street',
      city: 'Lahore',
      country: 'Pakistan',
    },
    paymentMethod: 'COD',
    couponCode: testCouponCode,
  };

  const res = await fetch('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `aw_cart_session=${testSessionId}`,
    },
    body: JSON.stringify(checkoutPayload),
  });

  const resText = await res.text();
  console.log(`Checkout response status: ${res.status}`);
  console.log(`Checkout response body: ${resText}`);

  if (!res.ok) {
    throw new Error(`Checkout failed: ${resText}`);
  }

  const resData = JSON.parse(resText);
  console.log('Order created successfully:', resData);

  // 5. Query order in database to confirm discount & coupon applied
  const createdOrder = await db.order.findUnique({
    where: { id: resData.orderId },
    include: { items: true },
  });

  console.log(`Created order number: ${createdOrder?.orderNumber}`);
  console.log(`Subtotal: ${createdOrder?.subtotal}`);
  console.log(`Discount Amount: ${createdOrder?.discountAmount}`);
  console.log(`Total Price: ${createdOrder?.totalPrice}`);
  console.log(`Coupon code recorded: ${createdOrder?.couponCode}`);

  // 6. Verify coupon usedCount incremented
  const updatedCoupon = await db.coupon.findUnique({
    where: { id: coupon.id },
  });
  console.log(`Coupon used count: ${updatedCoupon?.usedCount} (Expected: 1)`);

  if (updatedCoupon?.usedCount !== 1) {
    throw new Error('Coupon usedCount was not incremented!');
  }

  if (!createdOrder?.couponCode || createdOrder.discountAmount <= 0) {
    throw new Error('Discount was not properly applied to order!');
  }

  // Cleanup test coupon and order
  await db.orderItem.deleteMany({ where: { orderId: createdOrder.id } });
  await db.order.delete({ where: { id: createdOrder.id } });
  await db.coupon.delete({ where: { id: coupon.id } });

  console.log('--- ALL CHECKOUT COUPON CHECKS PASSED 100% ---');
}

runCheckoutCouponTest()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

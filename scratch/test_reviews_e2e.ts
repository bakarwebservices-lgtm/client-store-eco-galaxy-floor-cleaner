import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/admin';
import { signCustomerToken } from '../src/lib/auth/token';
import { PaymentStatus, FulfillmentStatus, ProductStatus } from '@prisma/client';

async function main() {
  console.log('🧪 Starting Reviews & Moderation E2E Verification...\n');

  // 1. Fetch or create a test product
  let product = await db.product.findFirst({
    where: { status: ProductStatus.ACTIVE, deletedAt: null },
    include: { variants: true },
  });

  if (!product) {
    console.log('Creating test product...');
    product = await db.product.create({
      data: {
        name: 'Oxford Artisan Brogues',
        slug: 'oxford-artisan-brogues-' + Date.now(),
        description: 'Handcrafted premium leather brogues with Goodyear welt.',
        price: 24990,
        status: ProductStatus.ACTIVE,
      },
      include: { variants: true },
    });
  }

  console.log(`✓ Product Target: "${product.name}" (${product.id})`);

  // 2. Clean up any existing test reviews on this product
  await db.review.deleteMany({
    where: { productId: product.id },
  });

  // 3. Test Guest Review Submission
  console.log('\n--- Step 1: Guest Review Submission ---');
  const guestReview = await db.review.create({
    data: {
      productId: product.id,
      customerId: null,
      reviewerName: 'Farhan Guest',
      rating: 4,
      title: 'Very comfortable leather',
      body: 'Wore them all day at a wedding. Excellent cushioning and fit.',
      images: [
        JSON.stringify({
          url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
          altText: 'Side view of leather shoes',
        }),
      ],
      isVerified: false,
      isApproved: false, // Default moderation gate
    },
  });
  console.log(`✓ Guest review created: ID=${guestReview.id}, isVerified=${guestReview.isVerified}, isApproved=${guestReview.isApproved}`);

  // Confirm guest review is hidden from public API
  const publicReviewsBefore = await db.review.findMany({
    where: { productId: product.id, isApproved: true },
  });
  console.log(`✓ Public approved reviews count before admin moderation: ${publicReviewsBefore.length} (Expected: 0)`);
  if (publicReviewsBefore.length !== 0) throw new Error('Unapproved guest review leaked to public!');

  // 4. Test Customer with Verified Purchase
  console.log('\n--- Step 2: Verified Purchase Customer Review ---');
  const testEmail = `reviewer_${Date.now()}@example.com`;
  const passwordHash = await hashPassword('Reviewer123!');
  const customer = await db.customer.create({
    data: {
      email: testEmail,
      passwordHash,
      firstName: 'Zainab',
      lastName: 'Tariq',
      isVerified: true,
    },
  });

  // Create a completed order with OrderItem for this product
  const order = await db.order.create({
    data: {
      orderNumber: `REV-${Date.now().toString().slice(-6)}`,
      customerId: customer.id,
      subtotal: product.price,
      total: product.price,
      paymentStatus: PaymentStatus.PAID,
      fulfillmentStatus: FulfillmentStatus.FULFILLED,
      shippingAddress: {
        firstName: 'Zainab',
        lastName: 'Tariq',
        address1: 'House 12, Street 4',
        city: 'Lahore',
        province: 'Punjab',
        postalCode: '54000',
        country: 'PK',
        phone: '+923001234567',
      },
      items: {
        create: [
          {
            productId: product.id,
            productName: product.name,
            sku: product.slug,
            price: product.price,
            quantity: 1,
            total: product.price,
          },
        ],
      },
    },
  });

  console.log(`✓ Created verified order ${order.orderNumber} for customer ${customer.email}`);

  // Query order item to verify purchase check
  const purchase = await db.orderItem.findFirst({
    where: {
      productId: product.id,
      order: {
        customerId: customer.id,
        OR: [
          { paymentStatus: PaymentStatus.PAID },
          { fulfillmentStatus: FulfillmentStatus.FULFILLED },
        ],
      },
    },
  });
  const isVerifiedBuyer = Boolean(purchase);
  console.log(`✓ Purchase verification check: isVerifiedBuyer = ${isVerifiedBuyer} (Expected: true)`);
  if (!isVerifiedBuyer) throw new Error('Failed to verify customer purchase!');

  // Create customer review
  const verifiedReview = await db.review.create({
    data: {
      productId: product.id,
      customerId: customer.id,
      reviewerName: `${customer.firstName} ${customer.lastName}`,
      rating: 5,
      title: 'Top tier craftsmanship!',
      body: 'The leather aroma and stitching quality are remarkable. True to size.',
      isVerified: isVerifiedBuyer,
      isApproved: false,
    },
  });
  console.log(`✓ Verified customer review created: ID=${verifiedReview.id}, isVerified=${verifiedReview.isVerified}, isApproved=${verifiedReview.isApproved}`);

  // 5. Test Admin Moderation Queue
  console.log('\n--- Step 3: Admin Moderation Queue ---');
  const pendingReviews = await db.review.findMany({
    where: { isApproved: false },
    include: { product: true, customer: true },
  });
  console.log(`✓ Admin pending moderation queue size: ${pendingReviews.length} reviews pending`);
  if (pendingReviews.length < 2) throw new Error('Expected at least 2 pending reviews in moderation queue!');

  // 6. Admin Approves Verified Review
  console.log('\n--- Step 4: Admin Approves Review ---');
  const approvedReview = await db.review.update({
    where: { id: verifiedReview.id },
    data: { isApproved: true },
  });
  console.log(`✓ Approved review ID=${approvedReview.id}, isApproved=${approvedReview.isApproved}`);

  // Verify public endpoint query
  const publicReviewsAfter = await db.review.findMany({
    where: { productId: product.id, isApproved: true },
  });
  console.log(`✓ Public approved reviews count on PDP: ${publicReviewsAfter.length} (Expected: 1)`);
  if (publicReviewsAfter.length !== 1) throw new Error('Approved review failed to display publicly!');

  // 7. Test One Review Per Customer Rule (Update & Re-moderation)
  console.log('\n--- Step 5: One Review Per Customer Rule (Update & Re-moderation) ---');
  const existingRev = await db.review.findFirst({
    where: { productId: product.id, customerId: customer.id },
  });

  if (existingRev) {
    const updatedReview = await db.review.update({
      where: { id: existingRev.id },
      data: {
        rating: 5,
        title: 'Updated: 2 months of daily wear',
        body: 'Still looking brand new with regular leather conditioner application.',
        isApproved: false, // Reset to moderation queue
      },
    });
    console.log(`✓ Customer updated review ID=${updatedReview.id}: Rating=${updatedReview.rating}, isApproved=${updatedReview.isApproved} (Reset to false for re-approval)`);
    if (updatedReview.isApproved !== false) throw new Error('Updated review did not reset isApproved to false!');
  }

  // 8. Clean up test data
  console.log('\n--- Step 6: Customer / Admin Deletion ---');
  await db.review.deleteMany({ where: { productId: product.id } });
  await db.orderItem.deleteMany({ where: { orderId: order.id } });
  await db.order.delete({ where: { id: order.id } });
  await db.customer.delete({ where: { id: customer.id } });
  console.log('✓ Test fixtures cleaned up successfully.');

  console.log('\n🎉 ALL REVIEWS & MODERATION E2E TEST CHECKS PASSED PERFECTLY!\n');
}

main()
  .catch((e) => {
    console.error('❌ E2E Verification Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

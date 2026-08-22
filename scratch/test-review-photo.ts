import { db } from '../src/lib/db';
import { ProductStatus } from '@prisma/client';

async function runReviewPhotoTest() {
  console.log('--- Testing Review Submission with Photo Upload Live ---');

  // 1. Get an active product
  const product = await db.product.findFirst({
    where: { status: ProductStatus.ACTIVE, deletedAt: null },
  });

  if (!product) throw new Error('No active product found');

  // 2. Upload a sample review image directly via /api/upload
  const formData = new FormData();
  const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const blob = new Blob([Buffer.from(samplePngBase64, 'base64')], { type: 'image/png' });
  formData.append('file', blob, 'customer_review_fit.png');
  formData.append('folder', 'reviews');
  formData.append('altText', 'Customer review photo of product in natural lighting');

  const uploadRes = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData,
  });

  const uploadData = await uploadRes.json();
  console.log('Upload response status:', uploadRes.status);
  console.log('Uploaded asset:', uploadData);

  if (!uploadRes.ok || !uploadData?.asset?.url) {
    throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
  }

  // 3. Post a review with the attached photo
  const reviewPayload = {
    reviewerName: 'Verified Buyer Sara',
    rating: 5,
    title: 'Fits true to size, highly recommend!',
    body: 'The fabric quality is great and looks exactly like the photos attached.',
    images: [
      {
        url: uploadData.asset.url,
        altText: 'Customer review photo of product in natural lighting',
      },
    ],
  };

  const reviewRes = await fetch(`http://localhost:3000/api/products/${product.id}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewPayload),
  });

  const reviewData = await reviewRes.json();
  console.log('Review response status:', reviewRes.status);
  console.log('Review response data:', reviewData);

  if (!reviewRes.ok || !reviewData?.review?.id) {
    throw new Error(`Review submission failed: ${JSON.stringify(reviewData)}`);
  }

  // 4. Verify review and images persisted in PostgreSQL
  const savedReview = await db.review.findUnique({
    where: { id: reviewData.review.id },
  });

  const reviewImages = (savedReview?.images as any[]) || [];
  console.log(`Saved review title: "${savedReview?.title}"`);
  console.log(`Attached review images count: ${reviewImages.length} (Expected: 1)`);
  console.log(`Review image URL: ${reviewImages[0]?.url}`);
  console.log(`Review image altText: "${reviewImages[0]?.altText}"`);

  if (reviewImages.length === 0) {
    throw new Error('Review image was not attached to review in database!');
  }

  // Cleanup test review
  await db.review.delete({ where: { id: savedReview.id } });

  console.log('--- ALL REVIEW PHOTO UPLOAD CHECKS PASSED 100% ---');
}

runReviewPhotoTest()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

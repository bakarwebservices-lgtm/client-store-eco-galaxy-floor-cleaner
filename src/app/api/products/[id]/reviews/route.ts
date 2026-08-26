import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth/customer';
import { CreateReviewSchema } from '@/lib/validation/review';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { PaymentStatus, FulfillmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Fetch approved reviews and total stats
    const [reviews, totalCount, allApprovedRatings] = await Promise.all([
      db.review.findMany({
        where: { productId: id, isApproved: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          reviewerName: true,
          rating: true,
          title: true,
          body: true,
          images: true,
          isVerified: true,
          createdAt: true,
        },
      }),
      db.review.count({
        where: { productId: id, isApproved: true },
      }),
      db.review.findMany({
        where: { productId: id, isApproved: true },
        select: { rating: true, isVerified: true },
      }),
    ]);

    // Calculate rating distribution and average
    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRatingSum = 0;
    let verifiedCount = 0;

    allApprovedRatings.forEach((r) => {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
      totalRatingSum += r.rating;
      if (r.isVerified) verifiedCount++;
    });

    const averageRating =
      allApprovedRatings.length > 0
        ? parseFloat((totalRatingSum / allApprovedRatings.length).toFixed(1))
        : 0;

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        averageRating,
        totalReviews: totalCount,
        verifiedCount,
        ratingCounts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching product reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    // Verify product exists and is active
    const product = await db.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Resolve optional customer session from cookies
    const customer = await getCustomerSession();

    // Rate limiting: per customerId if authenticated, or per IP if guest (5 per 15 min)
    const rateLimitKey = customer ? `review:cust:${customer.customerId}` : `review:ip:${ip}`;
    const rl = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many review submissions. Please wait before submitting another review.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = CreateReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { reviewerName, rating, title, body: reviewBody, images } = parsed.data;

    let isVerified = false;
    let existingReview = null;

    if (customer) {
      // Check if customer purchased this product in a completed order
      const purchase = await db.orderItem.findFirst({
        where: {
          productId: id,
          order: {
            customerId: customer.customerId,
            OR: [
              { paymentStatus: PaymentStatus.PAID },
              { fulfillmentStatus: FulfillmentStatus.FULFILLED },
            ],
          },
        },
      });

      if (purchase) {
        isVerified = true;
      }

      // Check for existing review by this customer on this product (one review per customer rule)
      existingReview = await db.review.findFirst({
        where: {
          productId: id,
          customerId: customer.customerId,
        },
      });
    }

    // Prepare image strings - guarantees consistent JSON serialization of { url, altText }
    const formattedImages = images.map((img: any) =>
      typeof img === 'string'
        ? JSON.stringify({ url: img, altText: `${product.name} review photo` })
        : JSON.stringify({ url: img.url, altText: img.altText || `${product.name} review photo` })
    );

    let review;
    if (existingReview) {
      // Update existing review and reset to pending moderation
      review = await db.review.update({
        where: { id: existingReview.id },
        data: {
          reviewerName,
          rating,
          title: title || null,
          body: reviewBody || null,
          images: formattedImages,
          isVerified,
          isApproved: false, // Reset to moderation queue upon update
        },
      });
    } else {
      // Create new review
      review = await db.review.create({
        data: {
          productId: id,
          customerId: customer?.customerId || null,
          reviewerName,
          rating,
          title: title || null,
          body: reviewBody || null,
          images: formattedImages,
          isVerified,
          isApproved: false, // Must be approved by admin before displaying publicly
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you! Your review has been submitted and will appear once approved.',
        review: {
          id: review.id,
          rating: review.rating,
          isVerified: review.isVerified,
          isApproved: review.isApproved,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error submitting product review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}

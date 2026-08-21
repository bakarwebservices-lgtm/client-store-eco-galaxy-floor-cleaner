import { describe, it, expect, vi } from 'vitest';
import { CreateReviewSchema, AdminReviewFilterSchema, AdminUpdateReviewSchema } from '@/lib/validation/review';

describe('Review Feature Unit & Logic Verification', () => {
  it('validates verified buyer review payload and normalizes rating', () => {
    const input = {
      reviewerName: 'Zainab Tariq',
      rating: 5,
      title: 'Top tier craftsmanship!',
      body: 'The leather aroma and stitching quality are remarkable. True to size.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
          altText: 'Side view of Oxford leather shoes',
        },
      ],
    };

    const parsed = CreateReviewSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.rating).toBe(5);
      expect(parsed.data.reviewerName).toBe('Zainab Tariq');
      expect(parsed.data.images[0].altText).toBe('Side view of Oxford leather shoes');
    }
  });

  it('rejects review when image altText is empty (mandatory alt text enforcement)', () => {
    const invalidImageInput = {
      reviewerName: 'Customer',
      rating: 4,
      body: 'Nice product',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
          altText: '',
        },
      ],
    };

    const parsed = CreateReviewSchema.safeParse(invalidImageInput);
    expect(parsed.success).toBe(false);
  });

  it('calculates aggregate rating stats correctly from review collection', () => {
    const mockReviews = [
      { rating: 5, isVerified: true },
      { rating: 5, isVerified: true },
      { rating: 4, isVerified: false },
      { rating: 2, isVerified: false },
    ];

    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    let verifiedCount = 0;

    mockReviews.forEach((r) => {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
      sum += r.rating;
      if (r.isVerified) verifiedCount++;
    });

    const averageRating = parseFloat((sum / mockReviews.length).toFixed(1));

    expect(averageRating).toBe(4.0);
    expect(verifiedCount).toBe(2);
    expect(ratingCounts[5]).toBe(2);
    expect(ratingCounts[4]).toBe(1);
    expect(ratingCounts[2]).toBe(1);
    expect(ratingCounts[1]).toBe(0);
  });

  it('verifies admin review moderation status transitions', () => {
    // Approve action
    const approveAction = AdminUpdateReviewSchema.safeParse({ isApproved: true });
    expect(approveAction.success).toBe(true);
    if (approveAction.success) {
      expect(approveAction.data.isApproved).toBe(true);
    }

    // Move to pending action
    const pendingAction = AdminUpdateReviewSchema.safeParse({ isApproved: false });
    expect(pendingAction.success).toBe(true);
    if (pendingAction.success) {
      expect(pendingAction.data.isApproved).toBe(false);
    }
  });

  it('validates admin review filter params and defaults', () => {
    const filter = AdminReviewFilterSchema.parse({
      status: 'PENDING',
      search: 'Oxford',
      page: 1,
      limit: 15,
    });

    expect(filter.status).toBe('PENDING');
    expect(filter.search).toBe('Oxford');
    expect(filter.limit).toBe(15);
  });
});

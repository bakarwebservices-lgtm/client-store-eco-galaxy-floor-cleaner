import { describe, it, expect } from 'vitest';
import { CreateReviewSchema, AdminReviewFilterSchema, AdminUpdateReviewSchema } from './review';

describe('Review Zod Validation', () => {
  it('validates a valid customer review with photos and alt text', () => {
    const validData = {
      reviewerName: 'Ahmad Khan',
      rating: 5,
      title: 'Exceptional build quality',
      body: 'These shoes exceeded my expectations in comfort and finish.',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
          altText: 'Side view of Oxford leather shoes',
        },
      ],
    };

    const parsed = CreateReviewSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.rating).toBe(5);
      expect(parsed.data.images.length).toBe(1);
    }
  });

  it('rejects invalid star ratings (e.g. 0, 6, fractional 4.5)', () => {
    expect(CreateReviewSchema.safeParse({ reviewerName: 'Sara', rating: 0, body: 'Too low' }).success).toBe(false);
    expect(CreateReviewSchema.safeParse({ reviewerName: 'Sara', rating: 6, body: 'Too high' }).success).toBe(false);
    expect(CreateReviewSchema.safeParse({ reviewerName: 'Sara', rating: 4.5, body: 'Fractional' }).success).toBe(false);
  });

  it('enforces mandatory altText on all uploaded review photos', () => {
    const missingAlt = {
      reviewerName: 'Ali',
      rating: 4,
      body: 'Great product overall',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
          altText: '', // Empty altText violates mandatory accessibility rule
        },
      ],
    };

    const parsed = CreateReviewSchema.safeParse(missingAlt);
    expect(parsed.success).toBe(false);
  });

  it('validates admin review filter params and status defaults', () => {
    const filter = AdminReviewFilterSchema.parse({ status: 'PENDING', page: '2', limit: '10' });
    expect(filter.status).toBe('PENDING');
    expect(filter.page).toBe(2);
    expect(filter.limit).toBe(10);
  });

  it('validates admin review approval toggle', () => {
    const approve = AdminUpdateReviewSchema.safeParse({ isApproved: true });
    expect(approve.success).toBe(true);
    const reject = AdminUpdateReviewSchema.safeParse({ isApproved: false });
    expect(reject.success).toBe(true);
    const invalid = AdminUpdateReviewSchema.safeParse({ isApproved: 'yes' });
    expect(invalid.success).toBe(false);
  });
});

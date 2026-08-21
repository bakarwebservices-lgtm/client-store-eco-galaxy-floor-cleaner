import { describe, it, expect } from 'vitest';
import { CategorySchema, CollectionSchema } from './taxonomy';
import { resolveSmartCollectionWhere } from '@/lib/taxonomy/smartCollection';

describe('Taxonomy & Smart Collection Logic', () => {
  it('validates a valid Category payload with SEO fields', () => {
    const validCat = {
      name: 'Footwear & Boots',
      slug: 'footwear-boots',
      description: 'Handcrafted premium leather footwear',
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
      imageAlt: 'Hero image of leather boots',
      isActive: true,
      sortOrder: 1,
      seoTitle: 'Men Footwear & Boots | Premium Collection',
      seoDescription: 'Explore our artisan crafted leather boots and formal shoes.',
    };

    const parsed = CategorySchema.safeParse(validCat);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid category slugs (uppercase, special chars)', () => {
    expect(CategorySchema.safeParse({ name: 'Boots', slug: 'Invalid Slug!' }).success).toBe(false);
    expect(CategorySchema.safeParse({ name: 'Boots', slug: 'boots_123' }).success).toBe(false);
  });

  it('validates SMART collection with rule configuration', () => {
    const smartCol = {
      name: 'Summer Sale Under 15000',
      slug: 'summer-sale-under-15000',
      type: 'SMART',
      ruleField: 'price',
      ruleOperator: 'less_than',
      ruleValue: '15000',
      isActive: true,
      sortOrder: 0,
    };

    const parsed = CollectionSchema.safeParse(smartCol);
    expect(parsed.success).toBe(true);
  });

  it('evaluates SMART collection rule for effective price less_than (checking base and variant overrides)', () => {
    const where = resolveSmartCollectionWhere({
      ruleField: 'price',
      ruleOperator: 'less_than',
      ruleValue: '15000',
    });

    expect(where).toHaveProperty('OR');
    const orArr = (where as any).OR;
    expect(orArr).toContainEqual({ price: { lte: 15000 } });
    expect(orArr).toContainEqual({
      variants: {
        some: {
          isActive: true,
          price: { lte: 15000 },
        },
      },
    });
  });

  it('evaluates SMART collection rule for tags contains', () => {
    const where = resolveSmartCollectionWhere({
      ruleField: 'tags',
      ruleOperator: 'contains',
      ruleValue: 'artisan',
    });

    expect(where).toEqual({ tags: { has: 'artisan' } });
  });

  it('evaluates SMART collection rule for vendor equals', () => {
    const where = resolveSmartCollectionWhere({
      ruleField: 'vendor',
      ruleOperator: 'equals',
      ruleValue: 'Attireburg',
    });

    expect(where).toEqual({ vendor: { equals: 'Attireburg', mode: 'insensitive' } });
  });
});

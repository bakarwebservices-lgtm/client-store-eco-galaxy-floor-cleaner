import { describe, it, expect } from 'vitest';
import { BlogArticleSchema, PageSchema, FaqItemSchema } from './cms';
import { sanitizeRichText } from '../sanitization/html';
import { BlogStatus, PageStatus } from '@prisma/client';

describe('CMS Schemas & Sanitization', () => {
  describe('HTML Sanitization', () => {
    it('strips dangerous <script> tags and onerror handlers', () => {
      const maliciousHtml = `
        <h2>Safe Title</h2>
        <p>This is safe text <script>alert("hacked")</script></p>
        <img src="valid.jpg" onerror="alert('xss')" alt="photo" />
        <a href="javascript:alert(1)">Click me</a>
      `;

      const clean = sanitizeRichText(maliciousHtml);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('alert(');
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('javascript:');
      expect(clean).toContain('<h2>Safe Title</h2>');
      expect(clean).toContain('<p>This is safe text </p>');
    });

    it('preserves valid formatting elements and attributes', () => {
      const richHtml = `
        <p>A paragraph with <strong>bold</strong> and <em>italic</em>.</p>
        <ul><li>Item 1</li><li>Item 2</li></ul>
        <blockquote>A quote</blockquote>
      `;

      const clean = sanitizeRichText(richHtml);
      expect(clean).toContain('<strong>bold</strong>');
      expect(clean).toContain('<em>italic</em>');
      expect(clean).toContain('<ul><li>Item 1</li><li>Item 2</li></ul>');
      expect(clean).toContain('<blockquote>A quote</blockquote>');
    });
  });

  describe('BlogArticleSchema', () => {
    it('validates a valid published article', () => {
      const article = {
        title: 'How to Care for Leather Goods',
        slug: 'how-to-care-for-leather-goods',
        bodyHtml: '<p>Comprehensive guide to caring for leather accessories.</p>',
        excerpt: 'Quick tips for leather care.',
        author: 'Editorial Team',
        featuredImageUrl: 'https://example.com/banner.jpg',
        featuredImageAlt: 'Leather boots being polished',
        status: BlogStatus.PUBLISHED,
        tags: ['guide', 'leather', 'maintenance'],
        seoTitle: 'Leather Care Guide | Brand',
        seoDescription: 'Tips and techniques for maintaining your leather items.',
      };

      const result = BlogArticleSchema.safeParse(article);
      expect(result.success).toBe(true);
    });

    it('rejects invalid slugs with uppercase or special characters', () => {
      const invalidSlug = {
        title: 'Title Here',
        slug: 'Invalid Slug!',
        bodyHtml: '<p>Content</p>',
      };

      const result = BlogArticleSchema.safeParse(invalidSlug);
      expect(result.success).toBe(false);
    });
  });

  describe('PageSchema', () => {
    it('validates a static page definition', () => {
      const page = {
        title: 'Shipping Policy',
        slug: 'shipping-policy',
        bodyHtml: '<p>We ship nationwide across Pakistan within 3-5 business days.</p>',
        status: PageStatus.ACTIVE,
      };

      const result = PageSchema.safeParse(page);
      expect(result.success).toBe(true);
    });
  });

  describe('FaqItemSchema', () => {
    it('validates an FAQ item', () => {
      const faq = {
        question: 'What payment methods do you support?',
        answer: 'We accept Cash on Delivery (COD), PayPal, and JazzCash.',
        category: 'Payments',
        sortOrder: 1,
        isActive: true,
      };

      const result = FaqItemSchema.safeParse(faq);
      expect(result.success).toBe(true);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { parseReferrerAndSource } from './attribution';

describe('parseReferrerAndSource', () => {
  it('parses explicit utm_source with medium', () => {
    const res = parseReferrerAndSource(
      { utm_source: 'instagram', utm_medium: 'cpc', utm_campaign: 'spring_launch' },
      'https://l.instagram.com/'
    );
    expect(res.source).toBe('Instagram (cpc)');
    expect(res.medium).toBe('cpc');
    expect(res.campaign).toBe('spring_launch');
  });

  it('detects Facebook and Instagram ads via fbclid', () => {
    const res = parseReferrerAndSource(
      { fbclid: 'IwAR3xxxxxx', utm_campaign: 'meta_retargeting' },
      'https://m.facebook.com/'
    );
    expect(res.source).toBe('Facebook / Instagram Ads');
    expect(res.medium).toBe('cpc');
    expect(res.campaign).toBe('meta_retargeting');
  });

  it('detects Google Search organic from referrer', () => {
    const res = parseReferrerAndSource({}, 'https://www.google.com/');
    expect(res.source).toBe('Google (Organic)');
    expect(res.medium).toBe('search');
  });

  it('detects TikTok organic from referrer', () => {
    const res = parseReferrerAndSource({}, 'https://www.tiktok.com/@brand/video/123');
    expect(res.source).toBe('TikTok (Organic)');
    expect(res.medium).toBe('social');
  });

  it('detects WhatsApp direct share', () => {
    const res = parseReferrerAndSource({ utm_source: 'whatsapp' }, '');
    expect(res.source).toBe('WhatsApp');
  });

  it('falls back to Direct / Unknown when no params or referrer exist', () => {
    const res = parseReferrerAndSource({}, '');
    expect(res.source).toBe('Direct / Unknown');
    expect(res.medium).toBe('direct');
  });
});

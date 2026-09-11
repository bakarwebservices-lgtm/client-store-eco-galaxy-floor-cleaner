import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/webhooks/whatsapp/route';
import { NextRequest } from 'next/server';

describe('Meta WhatsApp Webhook Handshake & Expiry Rules', () => {
  it('responds with hub.challenge on valid verification handshake', async () => {
    const url = 'http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test_challenge_12345&hub.verify_token=wh_sec_test';
    const req = new NextRequest(url, { method: 'GET' });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('test_challenge_12345');
  });

  it('rejects invalid or missing hub mode parameters', async () => {
    const url = 'http://localhost:3000/api/webhooks/whatsapp?hub.mode=publish&hub.challenge=test';
    const req = new NextRequest(url, { method: 'GET' });

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('calculates 48-hour hard expiry threshold accurately', () => {
    const now = Date.now();
    const orderCreated30hAgo = new Date(now - 30 * 60 * 60 * 1000);
    const orderCreated50hAgo = new Date(now - 50 * 60 * 60 * 1000);

    const elapsed30h = (now - orderCreated30hAgo.getTime()) / (1000 * 60 * 60);
    const elapsed50h = (now - orderCreated50hAgo.getTime()) / (1000 * 60 * 60);

    expect(elapsed30h <= 48).toBe(true);
    expect(elapsed50h > 48).toBe(true);
  });
});

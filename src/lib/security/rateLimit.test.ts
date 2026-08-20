import { describe, it, expect } from 'vitest';
import { checkRateLimit } from './rateLimit';

describe('Sliding Window Rate Limiter', () => {
  it('should allow requests within limit and block when exceeded', () => {
    const testIp = '192.168.1.100_' + Date.now();
    const opts = { limit: 3, windowMs: 1000 };

    expect(checkRateLimit(testIp, opts).success).toBe(true);
    expect(checkRateLimit(testIp, opts).success).toBe(true);
    expect(checkRateLimit(testIp, opts).success).toBe(true);

    const fourth = checkRateLimit(testIp, opts);
    expect(fourth.success).toBe(false);
    expect(fourth.remaining).toBe(0);
  });
});

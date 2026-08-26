import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format';

describe('formatCurrency Utility', () => {
  it('formats PKR numbers correctly', () => {
    expect(formatCurrency(1500, 'PKR')).toBe('Rs. 1,500');
    expect(formatCurrency(0, 'PKR')).toBe('Rs. 0');
  });

  it('formats international currencies correctly', () => {
    expect(formatCurrency(49.99, 'USD')).toBe('$49.99');
    expect(formatCurrency(100, 'EUR')).toBe('€100.00');
  });

  it('handles null, undefined or NaN gracefully', () => {
    expect(formatCurrency(null, 'PKR')).toBe('Rs. 0');
    expect(formatCurrency(undefined, 'PKR')).toBe('Rs. 0');
    expect(formatCurrency(NaN, 'USD')).toBe('$0.00');
  });
});

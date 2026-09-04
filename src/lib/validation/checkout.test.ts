import { describe, it, expect } from 'vitest';
import { shippingAddressSchema, checkoutSchema } from './checkout';

describe('shippingAddressSchema', () => {
  const baseValid = {
    firstName: 'Ahmad',
    lastName: 'Khan',
    phone: '03001234567',
    address: 'House 123, Street 4, Sector F-8/2',
    city: 'Islamabad',
    country: 'Pakistan',
  };

  it('validates successfully when email is omitted, empty string, whitespace, or null', () => {
    const res1 = shippingAddressSchema.safeParse({ ...baseValid });
    expect(res1.success).toBe(true);

    const res2 = shippingAddressSchema.safeParse({ ...baseValid, email: '' });
    expect(res2.success).toBe(true);
    if (res2.success) expect(res2.data.email).toBeNull();

    const res3 = shippingAddressSchema.safeParse({ ...baseValid, email: '   ' });
    expect(res3.success).toBe(true);
    if (res3.success) expect(res3.data.email).toBeNull();

    const res4 = shippingAddressSchema.safeParse({ ...baseValid, email: null });
    expect(res4.success).toBe(true);
    if (res4.success) expect(res4.data.email).toBeNull();
  });

  it('validates successfully when a valid email is provided', () => {
    const res = shippingAddressSchema.safeParse({ ...baseValid, email: 'ahmad@example.com' });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBe('ahmad@example.com');
    }
  });

  it('fails when an invalid email format is supplied', () => {
    const res = shippingAddressSchema.safeParse({ ...baseValid, email: 'not-an-email' });
    expect(res.success).toBe(false);
  });

  it('validates a full checkout payload without email', () => {
    const checkoutRes = checkoutSchema.safeParse({
      shippingAddress: { ...baseValid },
      paymentMethod: 'COD',
      notes: 'Call before delivery',
    });
    expect(checkoutRes.success).toBe(true);
  });
});

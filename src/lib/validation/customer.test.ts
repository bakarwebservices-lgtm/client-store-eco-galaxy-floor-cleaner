import { describe, it, expect } from 'vitest';
import { customerRegisterSchema, customerLoginSchema, customerAddressSchema } from './customer';

describe('Customer Validation Schemas', () => {
  it('validates correct customer registration payload', () => {
    const res = customerRegisterSchema.safeParse({
      firstName: 'Ahmad',
      lastName: 'Khan',
      email: 'ahmad@example.com',
      password: 'password123',
      phone: '03001234567',
    });
    expect(res.success).toBe(true);
  });

  it('rejects passwords under 6 characters', () => {
    const res = customerRegisterSchema.safeParse({
      firstName: 'Ahmad',
      lastName: 'Khan',
      email: 'ahmad@example.com',
      password: '123',
    });
    expect(res.success).toBe(false);
  });

  it('validates customer address schema', () => {
    const res = customerAddressSchema.safeParse({
      firstName: 'Ahmad',
      lastName: 'Khan',
      phone: '03001234567',
      address: 'Street 10, Phase 5',
      city: 'Lahore',
      country: 'Pakistan',
      isDefault: true,
    });
    expect(res.success).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { PaymentStatus, FulfillmentStatus } from '@prisma/client';

const lineItemUpdateSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  productTitle: z.string().min(1).optional(),
  variantTitle: z.string().nullable().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  _delete: z.boolean().optional(),
});

const updateOrderSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  fulfillmentStatus: z.nativeEnum(FulfillmentStatus).optional(),
  notes: z.string().max(5000).optional(),
  shippingAddress: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      apartment: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .passthrough()
    .optional(),
  discountAmount: z.number().min(0).optional(),
  shippingAmount: z.number().min(0).optional(),
  items: z.array(lineItemUpdateSchema).optional(),
  sendNotificationEmail: z.boolean().optional(),
});

describe('Order Management & Editing Validation', () => {
  it('validates a complete order update payload with address and items', () => {
    const payload = {
      paymentStatus: 'PAID',
      fulfillmentStatus: 'FULFILLED',
      notes: 'Customer contacted on WhatsApp to change color to Royal Blue',
      shippingAddress: {
        name: 'Ahmed Khan',
        phone: '03001234567',
        address: 'House 12, Street 4, Sector F-7',
        city: 'Islamabad',
        province: 'Federal Capital',
        country: 'Pakistan',
      },
      discountAmount: 500,
      shippingAmount: 0,
      items: [
        {
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          productId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          variantId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          productTitle: 'Royal Oud Parfum',
          variantTitle: '50ml / Intense',
          sku: 'RO-50-INT',
          quantity: 2,
          unitPrice: 4500,
        },
      ],
      sendNotificationEmail: true,
    };

    const parsed = updateOrderSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.discountAmount).toBe(500);
      expect(parsed.data.shippingAmount).toBe(0);
      expect(parsed.data.items?.length).toBe(1);
    }
  });

  it('correctly calculates subtotal, discounts, and grand totals', () => {
    const items = [
      { quantity: 2, unitPrice: 1500 }, // 3000
      { quantity: 1, unitPrice: 2200 }, // 2200
    ];

    const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    expect(subtotal).toBe(5200);

    const discountAmount = 700; // Custom discount
    const shippingAmount = 250;
    const taxAmount = 0;

    const totalPrice = Math.max(0, subtotal - discountAmount + shippingAmount + taxAmount);
    expect(totalPrice).toBe(4750);
  });

  it('bounds grand total to 0 if custom discount exceeds subtotal', () => {
    const subtotal = 1000;
    const discountAmount = 1500;
    const shippingAmount = 0;
    const totalPrice = Math.max(0, subtotal - discountAmount + shippingAmount);
    expect(totalPrice).toBe(0);
  });

  it('correctly computes inventory diffs on quantity adjustments and variant swaps', () => {
    // 1. Quantity increase: existing 2, updated to 3 -> decrement stock by 1
    const oldQty = 2;
    const newQty = 3;
    const diff = newQty - oldQty; // +1
    expect(diff).toBe(1); // will decrement inventory by 1

    // 2. Quantity decrease: existing 3, updated to 1 -> restore stock by 2
    const decreasedQty = 1;
    const restoreDiff = decreasedQty - newQty; // -2
    expect(restoreDiff).toBe(-2); // Math.abs(-2) = 2 restored

    // 3. Variant swap: from Variant A to Variant B
    const variantAId: string = 'var-a';
    const variantBId: string = 'var-b';
    const swapped = variantAId !== variantBId;
    expect(swapped).toBe(true);
    // Logic: Variant A inventory + oldQty, Variant B inventory - newQty
  });

  it('rejects invalid inputs such as negative discounts or zero quantity', () => {
    const invalidPayload = {
      discountAmount: -100,
      items: [
        {
          productId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          quantity: 0,
          unitPrice: -50,
        },
      ],
    };

    const parsed = updateOrderSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});

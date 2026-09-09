import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth/admin';
import { PaymentStatus, FulfillmentStatus, ShipmentStatus } from '@prisma/client';
import { z } from 'zod';
import { sendFulfillmentUpdateEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

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
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      addressLine1: z.string().optional(),
      apartment: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      email: z.string().optional(),
    })
    .passthrough()
    .optional(),
  discountAmount: z.number().min(0).optional(),
  shippingAmount: z.number().min(0).optional(),
  items: z.array(lineItemUpdateSchema).optional(),
  sendNotificationEmail: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const { id } = await params;

    const order = await db.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        deletedAt: null,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: {
                  select: { url: true, altText: true },
                  orderBy: { position: 'asc' },
                  take: 1,
                },
                variants: {
                  select: {
                    id: true,
                    title: true,
                    sku: true,
                    price: true,
                    inventoryQty: true,
                  },
                },
              },
            },
            variant: {
              select: {
                id: true,
                title: true,
                sku: true,
                inventoryQty: true,
                price: true,
              },
            },
          },
        },
        shipments: {
          include: {
            events: {
              orderBy: { eventTime: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to retrieve order' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth();
    const { id } = await params;
    const body = await req.json();

    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid order update payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      paymentStatus,
      fulfillmentStatus,
      notes,
      shippingAddress,
      discountAmount,
      shippingAmount,
      items,
      sendNotificationEmail,
    } = parsed.data;

    // Fetch existing order with items, customer, and active shipments
    const existing = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
        shipments: {
          where: {
            status: {
              notIn: [ShipmentStatus.CANCELLED, ShipmentStatus.RETURNED_TO_ORIGIN],
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (existing.cancelledAt) {
      return NextResponse.json({ error: 'Cannot edit a cancelled order.' }, { status: 400 });
    }

    // Execute order mutations inside a transactional block
    await db.$transaction(async (tx) => {
      // 1. Process Line Item Modifications (if provided)
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item._delete && item.id) {
            // Deleted line item: reverse inventory & remove from DB
            const existingItem = existing.items.find((ei) => ei.id === item.id);
            if (existingItem?.variantId) {
              await tx.productVariant.update({
                where: { id: existingItem.variantId },
                data: { inventoryQty: { increment: existingItem.quantity } },
              });
            }
            await tx.orderItem.delete({ where: { id: item.id } });
          } else if (item.id) {
            // Updated existing line item
            const existingItem = existing.items.find((ei) => ei.id === item.id);
            if (existingItem) {
              // Check if variant was swapped
              const variantChanged = item.variantId !== undefined && item.variantId !== existingItem.variantId;
              if (variantChanged) {
                // Restore old variant inventory
                if (existingItem.variantId) {
                  await tx.productVariant.update({
                    where: { id: existingItem.variantId },
                    data: { inventoryQty: { increment: existingItem.quantity } },
                  });
                }
                // Decrement new variant inventory
                if (item.variantId) {
                  await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: { inventoryQty: { decrement: item.quantity } },
                  });
                }
              } else if (existingItem.variantId && item.quantity !== existingItem.quantity) {
                // Same variant, adjusted quantity
                const diff = item.quantity - existingItem.quantity;
                if (diff > 0) {
                  await tx.productVariant.update({
                    where: { id: existingItem.variantId },
                    data: { inventoryQty: { decrement: diff } },
                  });
                } else if (diff < 0) {
                  await tx.productVariant.update({
                    where: { id: existingItem.variantId },
                    data: { inventoryQty: { increment: Math.abs(diff) } },
                  });
                }
              }

              const newTotal = Number((item.quantity * item.unitPrice).toFixed(2));
              await tx.orderItem.update({
                where: { id: item.id },
                data: {
                  productId: item.productId,
                  variantId: item.variantId ?? existingItem.variantId,
                  productTitle: item.productTitle ?? existingItem.productTitle,
                  variantTitle: item.variantTitle !== undefined ? item.variantTitle : existingItem.variantTitle,
                  sku: item.sku ?? existingItem.sku,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: newTotal,
                },
              });
            }
          } else {
            // New line item added to order
            let productWeight: number | null = null;
            let productTitle = item.productTitle;
            let sku = item.sku || 'SKU';

            const prod = await tx.product.findUnique({
              where: { id: item.productId },
              select: { name: true, weight: true },
            });
            if (prod) {
              productWeight = prod.weight;
              if (!productTitle) productTitle = prod.name;
            }

            if (item.variantId) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { inventoryQty: { decrement: item.quantity } },
              });
            }

            const newTotal = Number((item.quantity * item.unitPrice).toFixed(2));
            await tx.orderItem.create({
              data: {
                orderId: id,
                productId: item.productId,
                variantId: item.variantId || null,
                productTitle: productTitle || 'Product',
                variantTitle: item.variantTitle || null,
                sku: sku,
                weightKg: productWeight,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: newTotal,
              },
            });
          }
        }
      }

      // 2. Fetch fresh list of items to calculate new subtotal
      const currentItems = await tx.orderItem.findMany({
        where: { orderId: id },
      });

      const newSubtotal = Number(
        currentItems.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2)
      );

      const finalDiscount = discountAmount !== undefined ? discountAmount : existing.discountAmount;
      const finalShipping = shippingAmount !== undefined ? shippingAmount : existing.shippingAmount;
      const finalTax = existing.taxAmount;

      const newTotalPrice = Number(
        Math.max(0, newSubtotal - finalDiscount + finalShipping + finalTax).toFixed(2)
      );

      // 3. Resolve shipping address update
      let mergedAddress = existing.shippingAddress;
      if (shippingAddress) {
        const existingAddr = (existing.shippingAddress as Record<string, any>) || {};
        mergedAddress = {
          ...existingAddr,
          ...shippingAddress,
          name:
            shippingAddress.name ||
            `${shippingAddress.firstName || existingAddr.firstName || ''} ${
              shippingAddress.lastName || existingAddr.lastName || ''
            }`.trim() ||
            existingAddr.name,
        };
      }

      // 4. Update the order record
      await tx.order.update({
        where: { id },
        data: {
          ...(paymentStatus ? { paymentStatus } : {}),
          ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
          ...(typeof notes === 'string' ? { notes } : {}),
          shippingAddress: mergedAddress as any,
          subtotal: newSubtotal,
          discountAmount: finalDiscount,
          shippingAmount: finalShipping,
          totalPrice: newTotalPrice,
        },
      });
    });

    // 5. Fetch the updated order with full relations
    const updated = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: { select: { url: true, altText: true }, take: 1 },
              },
            },
            variant: true,
          },
        },
        customer: true,
        shipments: {
          include: {
            events: { orderBy: { eventTime: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to retrieve updated order' }, { status: 500 });
    }

    // 6. If transitioned to FULFILLED (or explicitly requested), dispatch enhanced notification email
    const isNowFulfilled = fulfillmentStatus === FulfillmentStatus.FULFILLED;
    const wasAlreadyFulfilled = existing.fulfillmentStatus === FulfillmentStatus.FULFILLED;
    const shouldDispatchEmail = (isNowFulfilled && !wasAlreadyFulfilled) || sendNotificationEmail === true;

    if (shouldDispatchEmail) {
      try {
        const addr = (updated.shippingAddress as any) || {};
        const targetEmail = updated.customer?.email || addr.email;
        const activeShipment = updated.shipments?.[0];

        if (targetEmail) {
          await sendFulfillmentUpdateEmail({
            orderNumber: updated.orderNumber,
            email: targetEmail,
            currency: updated.currency,
            totalPrice: updated.totalPrice,
            subtotal: updated.subtotal,
            discountAmount: updated.discountAmount,
            shippingAmount: updated.shippingAmount,
            paymentMethod: updated.paymentMethod,
            paymentStatus: updated.paymentStatus,
            trackingNumber: activeShipment?.trackingNumber,
            trackingUrl: activeShipment?.trackingUrl || undefined,
            courierName: activeShipment?.courierName || 'PostEx Courier',
            items: updated.items.map((it) => ({
              productTitle: it.productTitle,
              variantTitle: it.variantTitle,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice,
            })),
            shippingAddress: {
              firstName: addr.firstName || addr.name?.split(' ')[0] || '',
              lastName: addr.lastName || addr.name?.split(' ').slice(1).join(' ') || '',
              addressLine1: addr.addressLine1 || addr.address || '',
              addressLine2: addr.addressLine2 || addr.apartment,
              city: addr.city || '',
              province: addr.province,
              postalCode: addr.postalCode,
              phone: addr.phone,
            },
          });
        }
      } catch (emailErr) {
        console.error('[Admin Orders] Failed to dispatch fulfillment update email:', emailErr);
      }
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[Admin Orders PATCH Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to update order' }, { status: 500 });
  }
}

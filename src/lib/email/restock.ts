import { db } from '@/lib/db';
import { sendRestockAlertEmail } from '@/lib/email';
import { env } from '@/lib/env';

export interface DispatchRestockResult {
  totalSubscribers: number;
  emailsSent: number;
  errors: number;
  productName: string;
}

/**
 * Dispatches restock notification emails to active waitlist subscribers for a product/variant.
 * Creates audit log records in `RestockNotification` and deactivates fulfilled subscriptions.
 */
export async function dispatchRestockAlerts({
  productId,
  variantId,
  limit = 100,
}: {
  productId: string;
  variantId?: string | null;
  limit?: number;
}): Promise<DispatchRestockResult> {
  try {
    // 1. Fetch Product and Variant details
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        variants: variantId ? { where: { id: variantId } } : true,
      },
    });

    if (!product) {
      return { totalSubscribers: 0, emailsSent: 0, errors: 0, productName: 'Unknown' };
    }

    const variant = variantId ? product.variants.find((v) => v.id === variantId) : null;
    const variantLabel = variant ? (variant.title || variant.sku) : null;

    const baseUrl = env.NEXT_PUBLIC_APP_URL;
    const productUrl = `${baseUrl}/products/${product.slug}`;

    // 2. Fetch active waitlist subscribers
    const subscriptions = await db.waitlistSubscription.findMany({
      where: {
        productId,
        ...(variantId ? { variantId } : {}),
        isActive: true,
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    let emailsSent = 0;
    let errors = 0;

    // 3. Dispatch emails and record logs
    for (const sub of subscriptions) {
      try {
        const sent = await sendRestockAlertEmail(sub.email, product.name, variantLabel, productUrl);

        if (sent) {
          await db.$transaction([
            db.restockNotification.create({
              data: {
                waitlistSubscriptionId: sub.id,
                sentAt: new Date(),
              },
            }),
            db.waitlistSubscription.update({
              where: { id: sub.id },
              data: { isActive: false },
            }),
          ]);
          emailsSent++;
        } else {
          errors++;
        }
      } catch (sendErr) {
        console.error(`[Restock Dispatch] Error notifying ${sub.email}:`, sendErr);
        errors++;
      }
    }

    return {
      totalSubscribers: subscriptions.length,
      emailsSent,
      errors,
      productName: product.name,
    };
  } catch (err) {
    console.error('[Restock Dispatch Fatal Error]', err);
    return { totalSubscribers: 0, emailsSent: 0, errors: 1, productName: 'Error' };
  }
}

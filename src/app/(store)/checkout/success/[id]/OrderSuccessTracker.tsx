'use client';

import { useEffect } from 'react';
import { track } from '@/lib/tracking/events';

export function OrderSuccessTracker({ order }: { order: any }) {
  useEffect(() => {
    if (!order || typeof window === 'undefined') return;

    const orderRef = order.orderNumber || order.id;
    const dedupStorageKey = `aw_tracked_purchase_${orderRef}`;

    // Check if this purchase event has already been recorded in the browser session
    const alreadyTracked = sessionStorage.getItem(dedupStorageKey);
    if (alreadyTracked === 'true') {
      return;
    }

    // Mark as tracked in sessionStorage to prevent inflation on refresh
    sessionStorage.setItem(dedupStorageKey, 'true');

    // Dispatch Purchase tracking event (BUILD_STANDARDS 4.4)
    track('Purchase', {
      order_id: orderRef,
      value: order.totalPrice,
      currency: order.currency || 'PKR',
      quantity: order.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 1,
      content_ids: order.items?.map((item: any) => item.variantId || item.productId),
    });
  }, [order]);

  return null;
}

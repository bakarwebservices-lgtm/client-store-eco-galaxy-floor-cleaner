'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/tracking/events';

export function OrderSuccessTracker({ order }: { order: any }) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    // Dispatch Purchase tracking hook per BUILD_STANDARDS 4.4
    track('Purchase', {
      order_id: order.orderNumber || order.id,
      value: order.totalPrice,
      currency: order.currency || 'PKR',
      quantity: order.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 1,
      content_ids: order.items?.map((item: any) => item.variantId || item.productId),
    });
  }, [order]);

  return null;
}

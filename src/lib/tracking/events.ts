export type StandardEvent =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase';

export interface TrackingData {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  quantity?: number;
  order_id?: string;
  [key: string]: any;
}

/**
 * Universal non-blocking tracking dispatcher.
 * Dispatches to window.fbq (Meta Pixel) and window.gtag (GA4) safely if available.
 */
export function track(event: StandardEvent, data?: TrackingData): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Meta Pixel Hook
    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', event, data);
    }

    // 2. Google Analytics 4 Hook
    if (typeof (window as any).gtag === 'function') {
      const gaEventMap: Record<StandardEvent, string> = {
        PageView: 'page_view',
        ViewContent: 'view_item',
        AddToCart: 'add_to_cart',
        InitiateCheckout: 'begin_checkout',
        AddPaymentInfo: 'add_payment_info',
        Purchase: 'purchase',
      };
      const gaEvent = gaEventMap[event] || event;
      (window as any).gtag('event', gaEvent, data);
    }

    // Optional console debugging in dev mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics Track] ${event}:`, data);
    }
  } catch (err) {
    // Analytics failures must never break UI execution
    console.warn(`Tracking error for event "${event}":`, err);
  }
}

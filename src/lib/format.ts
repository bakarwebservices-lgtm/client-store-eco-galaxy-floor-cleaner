export function formatCurrency(amount: number | null | undefined, currency: string = 'PKR'): string {
  const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;

  if (currency === 'PKR' || currency === 'Rs') {
    return 'Rs. ' + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(val);
  } catch {
    return currency.toUpperCase() + ' ' + val.toLocaleString('en-US');
  }
}

/**
 * Strips HTML tags and decodes entities for raw text contexts (SEO metadata, WhatsApp messages, SMS, logs)
 */
export function stripHtml(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

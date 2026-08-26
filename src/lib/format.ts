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

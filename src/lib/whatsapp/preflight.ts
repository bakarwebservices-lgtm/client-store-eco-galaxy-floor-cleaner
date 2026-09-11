export interface PreflightCheckResult {
  valid: boolean;
  errors: string[];
  sanitized?: {
    recipientName: string;
    recipientPhone: string;
    cityName: string;
    address: string;
    codAmount: number;
    weightKg: number;
    pieces: number;
  };
}

const DUMMY_PHONE_PATTERNS = [
  /^03000000000$/,
  /^03111111111$/,
  /^03222222222$/,
  /^03333333333$/,
  /^03444444444$/,
  /^03123456789$/,
];

const VALID_PAKISTAN_MOBILE_PREFIXES = ['030', '031', '032', '033', '034', '035', '036', '037'];

/**
 * Normalizes phone numbers to standard 11-digit Pakistani format (03XXXXXXXXX).
 */
export function normalizePakistanPhone(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('92') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.startsWith('0092') && cleaned.length === 14) {
    cleaned = '0' + cleaned.slice(4);
  }
  return cleaned;
}

/**
 * Normalizes phone numbers to international format required by Meta Cloud API (923XXXXXXXXX).
 */
export function normalizeWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('03') && cleaned.length === 11) {
    cleaned = '92' + cleaned.slice(1);
  } else if (cleaned.startsWith('0092') && cleaned.length === 14) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Validates whether a normalized phone number is a realistic, callable Pakistani mobile number.
 */
export function isValidPakistanMobile(phone11: string): boolean {
  if (phone11.length !== 11) return false;
  const prefix = phone11.slice(0, 3);
  if (!VALID_PAKISTAN_MOBILE_PREFIXES.includes(prefix)) return false;
  if (DUMMY_PHONE_PATTERNS.some((pattern) => pattern.test(phone11))) return false;

  // Disallow all-same subscriber digits (e.g. 0300-9999999 or 0321-0000000)
  const subscriberNumber = phone11.slice(4); // 7-digit local subscriber number
  if (/^(\d)\1{6}$/.test(subscriberNumber)) return false;

  return true;
}

/**
 * Runs a strict pre-flight gate on all parameters required by PostEx courier.
 * Prevents invalid bookings, wasted booking API charges, and courier status rejections.
 */
export function validatePostExPreflight(params: {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  codAmount: number;
  isPrepaid?: boolean;
  weightKg?: number | null;
  pieces?: number | null;
}): PreflightCheckResult {
  const errors: string[] = [];

  // 1. Phone number validation
  const normalizedPhone = normalizePakistanPhone(params.phone);
  if (!normalizedPhone) {
    errors.push('Phone number is missing.');
  } else if (!isValidPakistanMobile(normalizedPhone)) {
    errors.push(`Phone number "${params.phone}" is not a valid 11-digit Pakistani mobile number.`);
  }

  // 2. Recipient Name validation
  const cleanName = (params.name || '').trim();
  if (cleanName.length < 2) {
    errors.push('Recipient name must be at least 2 characters.');
  } else if (/^[^\w\s\u0600-\u06FF]+$/.test(cleanName)) {
    errors.push('Recipient name contains only invalid special characters.');
  }

  // 3. Address validation
  const cleanAddress = (params.address || '').replace(/[\r\n]+/g, ', ').trim();
  if (cleanAddress.length < 8) {
    errors.push('Shipping address is too short (minimum 8 characters required).');
  } else if (!/[a-zA-Z0-9\u0600-\u06FF]/.test(cleanAddress)) {
    errors.push('Shipping address must contain valid alphanumeric or Urdu characters.');
  }

  // 4. City validation
  const cleanCity = (params.city || '').trim();
  if (!cleanCity || cleanCity.length < 2) {
    errors.push('Destination city is required.');
  }

  // 5. COD amount validation
  let finalCod = params.codAmount;
  if (params.isPrepaid) {
    finalCod = 0;
  } else if (finalCod < 0) {
    errors.push('COD amount cannot be negative.');
  }

  // 6. Weight and Pieces
  const weight = params.weightKg && params.weightKg > 0 ? params.weightKg : 0.5;
  const pieces = params.pieces && params.pieces >= 1 ? params.pieces : 1;

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      recipientName: cleanName,
      recipientPhone: normalizedPhone,
      cityName: cleanCity,
      address: cleanAddress,
      codAmount: finalCod,
      weightKg: weight,
      pieces,
    },
  };
}

import { CountryGeoPack, ProvinceDefinition, CityDefinition, PhoneRule } from './types';
import { PK_GEO_PACK } from './countries/pk';
import { DEFAULT_GEO_PACK } from './countries/default';

const COUNTRY_PACKS: Record<string, CountryGeoPack> = {
  PK: PK_GEO_PACK,
  PAKISTAN: PK_GEO_PACK,
};

export function resolveCountryCode(countryOrCode?: string | null): string {
  if (!countryOrCode) return 'PK';
  const clean = countryOrCode.trim().toUpperCase();
  if (clean === 'PK' || clean === 'PAKISTAN' || clean === 'PAK') return 'PK';
  return clean;
}

export function getGeoPack(countryOrCode?: string | null): CountryGeoPack {
  const code = resolveCountryCode(countryOrCode);
  return COUNTRY_PACKS[code] || DEFAULT_GEO_PACK;
}

export function getProvinces(countryOrCode?: string | null): ProvinceDefinition[] {
  return getGeoPack(countryOrCode).provinces;
}

export function getCities(countryOrCode?: string | null): CityDefinition[] {
  return getGeoPack(countryOrCode).cities;
}

export function normalizeCity(cityName: string, countryOrCode?: string | null): string {
  if (!cityName) return '';
  const trimmed = cityName.trim();
  const lower = trimmed.toLowerCase();
  const geo = getGeoPack(countryOrCode);

  if (!geo.hasStructuredCities || geo.cities.length === 0) {
    return trimmed;
  }

  // Exact match check
  const exact = geo.cities.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact.name;

  // Alias match check
  const aliasMatch = geo.cities.find(
    (c) => c.aliases && c.aliases.some((a) => a.toLowerCase() === lower || lower.includes(a.toLowerCase()))
  );
  if (aliasMatch) return aliasMatch.name;

  // Capitalize words if unlisted custom city
  return trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function normalizePhone(phone: string, countryOrCode?: string | null): string {
  const geo = getGeoPack(countryOrCode);
  return geo.phoneRule.normalize(phone);
}

export function isPhoneValid(phone: string, countryOrCode?: string | null): boolean {
  const geo = getGeoPack(countryOrCode);
  return geo.phoneRule.isValid(phone);
}

export function validateAddressLine(address: string, countryOrCode?: string | null): {
  valid: boolean;
  minLength: number;
  error?: string;
} {
  const geo = getGeoPack(countryOrCode);
  const minLength = geo.addressMinLength;
  const clean = (address || '').trim();

  if (!clean) {
    return { valid: false, minLength, error: 'Street address is required' };
  }

  if (clean.length < minLength) {
    return {
      valid: false,
      minLength,
      error: `Please provide a complete street address (House/Shop #, Street/Road, Area - min ${minLength} characters)`,
    };
  }

  return { valid: true, minLength };
}

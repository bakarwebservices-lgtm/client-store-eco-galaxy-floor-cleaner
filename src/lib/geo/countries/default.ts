import { CountryGeoPack, PhoneRule } from '../types';

export const DEFAULT_PHONE_RULE: PhoneRule = {
  countryCode: 'DEFAULT',
  dialCode: '',
  placeholder: '+1 (555) 000-0000',
  example: '+15550000000',
  formatHelp: 'Include country dial code if applicable',
  normalize: (raw: string): string => {
    if (!raw) return '';
    return raw.trim();
  },
  isValid: (raw: string): boolean => {
    if (!raw) return false;
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  },
};

export const DEFAULT_GEO_PACK: CountryGeoPack = {
  countryCode: 'DEFAULT',
  countryName: 'International / Other',
  hasStructuredProvinces: false,
  hasStructuredCities: false,
  provinces: [],
  cities: [],
  phoneRule: DEFAULT_PHONE_RULE,
  addressMinLength: 3,
  postalCodeRequired: false,
};

export interface CityDefinition {
  name: string;
  province?: string;
  aliases?: string[];
  isMajor?: boolean;
}

export interface ProvinceDefinition {
  code: string;
  name: string;
}

export interface PhoneRule {
  countryCode: string;
  dialCode: string;
  placeholder: string;
  example: string;
  formatHelp: string;
  normalize: (raw: string) => string;
  isValid: (raw: string) => boolean;
}

export interface CountryGeoPack {
  countryCode: string;
  countryName: string;
  hasStructuredProvinces: boolean;
  hasStructuredCities: boolean;
  provinces: ProvinceDefinition[];
  cities: CityDefinition[];
  phoneRule: PhoneRule;
  addressMinLength: number;
  postalCodeRequired: boolean;
}

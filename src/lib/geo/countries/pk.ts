import { CountryGeoPack, ProvinceDefinition, CityDefinition, PhoneRule } from '../types';

export const PK_PROVINCES: ProvinceDefinition[] = [
  { code: 'PB', name: 'Punjab' },
  { code: 'SD', name: 'Sindh' },
  { code: 'KP', name: 'Khyber Pakhtunkhwa' },
  { code: 'BA', name: 'Balochistan' },
  { code: 'IS', name: 'Islamabad Capital Territory' },
  { code: 'JK', name: 'Azad Jammu & Kashmir' },
  { code: 'GB', name: 'Gilgit-Baltistan' },
];

export const PK_CITIES: CityDefinition[] = [
  // Major Metros (Tier 1)
  { name: 'Karachi', province: 'Sindh', aliases: ['khi', 'karachi city', 'karachi central', 'karachi south', 'karachi east', 'karachi west', 'malir', 'korangi'], isMajor: true },
  { name: 'Lahore', province: 'Punjab', aliases: ['lhr', 'lahore cantt', 'lahore city'], isMajor: true },
  { name: 'Islamabad', province: 'Islamabad Capital Territory', aliases: ['isb', 'islamabad capital'], isMajor: true },
  { name: 'Rawalpindi', province: 'Punjab', aliases: ['rwp', 'pindi', 'rawalpindi cantt'], isMajor: true },
  { name: 'Faisalabad', province: 'Punjab', aliases: ['fsd', 'lyallpur'], isMajor: true },
  { name: 'Peshawar', province: 'Khyber Pakhtunkhwa', aliases: ['psh', 'peshawar city', 'peshawar cantt'], isMajor: true },
  { name: 'Multan', province: 'Punjab', aliases: ['mux', 'multan cantt'], isMajor: true },
  { name: 'Quetta', province: 'Balochistan', aliases: ['qta', 'quetta cantt'], isMajor: true },
  { name: 'Sialkot', province: 'Punjab', aliases: ['skt', 'sialkot cantt'], isMajor: true },
  { name: 'Gujranwala', province: 'Punjab', aliases: ['grw', 'gujranwala cantt'], isMajor: true },
  { name: 'Hyderabad', province: 'Sindh', aliases: ['hyd', 'hyderabad city', 'latifabad', 'qasimabad'], isMajor: true },

  // Tier 2 Major Urban Centers
  { name: 'Abbottabad', province: 'Khyber Pakhtunkhwa', aliases: ['atd', 'abbotabad'] },
  { name: 'Bahawalpur', province: 'Punjab', aliases: ['bwp'] },
  { name: 'Sargodha', province: 'Punjab', aliases: ['sgd', 'sargodha cantt'] },
  { name: 'Sukkur', province: 'Sindh', aliases: ['skr', 'rohri'] },
  { name: 'Jhelum', province: 'Punjab', aliases: ['jlm', 'jhelum cantt'] },
  { name: 'Gujrat', province: 'Punjab', aliases: ['grt'] },
  { name: 'Mardan', province: 'Khyber Pakhtunkhwa', aliases: ['mrd'] },
  { name: 'Larkana', province: 'Sindh', aliases: ['lrk'] },
  { name: 'Sheikhupura', province: 'Punjab', aliases: ['skp'] },
  { name: 'Rahim Yar Khan', province: 'Punjab', aliases: ['ryk', 'rahimyarkhan'] },
  { name: 'Kasur', province: 'Punjab', aliases: ['ksr'] },
  { name: 'Dera Ghazi Khan', province: 'Punjab', aliases: ['dgk', 'dg khan', 'dera ghazi khan'] },
  { name: 'Sahiwal', province: 'Punjab', aliases: ['swl', 'montgomery'] },
  { name: 'Nawabshah', province: 'Sindh', aliases: ['nba', 'shaheed benazirabad'] },
  { name: 'Mingora', province: 'Khyber Pakhtunkhwa', aliases: ['swat', 'mingora swat'] },
  { name: 'Mirpur Khas', province: 'Sindh', aliases: ['mpk', 'mirpurkhas'] },
  { name: 'Chiniot', province: 'Punjab', aliases: ['chn'] },
  { name: 'Kamoke', province: 'Punjab' },
  { name: 'Mandi Bahauddin', province: 'Punjab', aliases: ['mbdin', 'mandi baha ud din'] },
  { name: 'Jhang', province: 'Punjab' },
  { name: 'Hafizabad', province: 'Punjab' },
  { name: 'Khanewal', province: 'Punjab' },
  { name: 'Muzaffargarh', province: 'Punjab' },
  { name: 'Kohat', province: 'Khyber Pakhtunkhwa', aliases: ['kht'] },
  { name: 'Dera Ismail Khan', province: 'Khyber Pakhtunkhwa', aliases: ['dik', 'di khan'] },
  { name: 'Turbat', province: 'Balochistan' },
  { name: 'Muzaffarabad', province: 'Azad Jammu & Kashmir', aliases: ['mzd'] },
  { name: 'Mirpur', province: 'Azad Jammu & Kashmir', aliases: ['mirpur ajk', 'mirpur azad kashmir'] },
  { name: 'Rawalakot', province: 'Azad Jammu & Kashmir' },
  { name: 'Kotli', province: 'Azad Jammu & Kashmir' },
  { name: 'Gilgit', province: 'Gilgit-Baltistan', aliases: ['glt'] },
  { name: 'Skardu', province: 'Gilgit-Baltistan', aliases: ['kdu'] },
  { name: 'Hunza', province: 'Gilgit-Baltistan', aliases: ['karimabad'] },

  // Tier 3 Industrial & Commercial Hubs
  { name: 'Okara', province: 'Punjab', aliases: ['okara cantt'] },
  { name: 'Attock', province: 'Punjab', aliases: ['campbellpur'] },
  { name: 'Bahawalnagar', province: 'Punjab' },
  { name: 'Burewala', province: 'Punjab' },
  { name: 'Chakwal', province: 'Punjab' },
  { name: 'Daska', province: 'Punjab' },
  { name: 'Gojra', province: 'Punjab' },
  { name: 'Jacobabad', province: 'Sindh' },
  { name: 'Khairpur', province: 'Sindh' },
  { name: 'Khushab', province: 'Punjab', aliases: ['jauharabad'] },
  { name: 'Layyah', province: 'Punjab' },
  { name: 'Mianwali', province: 'Punjab' },
  { name: 'Nowshera', province: 'Khyber Pakhtunkhwa', aliases: ['nowshera cantt'] },
  { name: 'Pakpattan', province: 'Punjab' },
  { name: 'Sadiqabad', province: 'Punjab' },
  { name: 'Swabi', province: 'Khyber Pakhtunkhwa' },
  { name: 'Tando Adam', province: 'Sindh' },
  { name: 'Tando Allahyar', province: 'Sindh' },
  { name: 'Vehari', province: 'Punjab' },
  { name: 'Wah Cantt', province: 'Punjab', aliases: ['wah'] },
  { name: 'Wazirabad', province: 'Punjab' },
  { name: 'Gwadar', province: 'Balochistan' },
  { name: 'Hub', province: 'Balochistan', aliases: ['hub chowki'] },
  { name: 'Khuzdar', province: 'Balochistan' },
  { name: 'Chaman', province: 'Balochistan' },
  { name: 'Sibi', province: 'Balochistan' },
  { name: 'Zhob', province: 'Balochistan' },
  { name: 'Mansehra', province: 'Khyber Pakhtunkhwa' },
  { name: 'Bannu', province: 'Khyber Pakhtunkhwa' },
  { name: 'Charsadda', province: 'Khyber Pakhtunkhwa' },
  { name: 'Haripur', province: 'Khyber Pakhtunkhwa' },
  { name: 'Karak', province: 'Khyber Pakhtunkhwa' },
  { name: 'Timergara', province: 'Khyber Pakhtunkhwa', aliases: ['dir lower'] },
  { name: 'Bhadurabad', province: 'Sindh' },
  { name: 'Dadu', province: 'Sindh' },
  { name: 'Ghotki', province: 'Sindh' },
  { name: 'Shikarpur', province: 'Sindh' },
  { name: 'Badin', province: 'Sindh' },
  { name: 'Kotri', province: 'Sindh' },
  { name: 'Umerkot', province: 'Sindh' },
  { name: 'Chishtian', province: 'Punjab' },
  { name: 'Dinanagar', province: 'Punjab' },
  { name: 'Jaranwala', province: 'Punjab' },
  { name: 'Kabirwala', province: 'Punjab' },
  { name: 'Kot Addu', province: 'Punjab' },
  { name: 'Lodhran', province: 'Punjab' },
  { name: 'Mian Channu', province: 'Punjab' },
  { name: 'Muridke', province: 'Punjab' },
  { name: 'Muzaffargarh', province: 'Punjab' },
  { name: 'Pattoki', province: 'Punjab' },
  { name: 'Samundri', province: 'Punjab' },
  { name: 'Shahkot', province: 'Punjab' },
  { name: 'Taxila', province: 'Punjab' },
  { name: 'Toba Tek Singh', province: 'Punjab', aliases: ['tts'] },
];

export const PK_PHONE_RULE: PhoneRule = {
  countryCode: 'PK',
  dialCode: '+92',
  placeholder: '0300 1234567',
  example: '03001234567',
  formatHelp: '11-digit mobile number starting with 03 (e.g. 0300 1234567)',
  normalize: (raw: string): string => {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('923') && digits.length === 12) {
      return `03${digits.slice(3)}`;
    }
    if (digits.startsWith('00923') && digits.length === 14) {
      return `03${digits.slice(5)}`;
    }
    if (digits.startsWith('3') && digits.length === 10) {
      return `0${digits}`;
    }
    if (digits.startsWith('03') && digits.length === 11) {
      return digits;
    }
    return digits;
  },
  isValid: (raw: string): boolean => {
    if (!raw) return false;
    const normalized = PK_PHONE_RULE.normalize(raw);
    return /^03[0-9]{9}$/.test(normalized);
  },
};

export const PK_GEO_PACK: CountryGeoPack = {
  countryCode: 'PK',
  countryName: 'Pakistan',
  hasStructuredProvinces: true,
  hasStructuredCities: true,
  provinces: PK_PROVINCES,
  cities: PK_CITIES,
  phoneRule: PK_PHONE_RULE,
  addressMinLength: 8,
  postalCodeRequired: false,
};

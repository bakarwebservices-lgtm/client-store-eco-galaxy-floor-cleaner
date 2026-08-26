import { THEME_PRESETS, defaultTheme, ThemeTokens } from '@/config/theme.config';

function getContrastForeground(hex: string): string {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return '#fafafa';
  }
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#09090b' : '#fafafa';
}

function getAdjustedHover(hex: string, amount = -25): string {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return hex;
  }
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  let r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  let g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  let b = parseInt(cleanHex.substring(4, 6), 16) || 0;

  r = Math.min(255, Math.max(0, r + amount));
  g = Math.min(255, Math.max(0, g + amount));
  b = Math.min(255, Math.max(0, b + amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function generateThemeCss(settings: Record<string, string>): string {
  const presetKey = settings['theme.preset']?.trim() || 'default';
  const baseTokens: ThemeTokens = THEME_PRESETS[presetKey] || defaultTheme;

  const background = settings['theme.background_color']?.trim() || baseTokens.colors.background;
  const foreground = settings['theme.foreground_color']?.trim() || baseTokens.colors.foreground;
  const primary = settings['theme.primary_color']?.trim() || baseTokens.colors.primary;
  const accent = settings['theme.accent_color']?.trim() || baseTokens.colors.accent;
  const card = settings['theme.card_color']?.trim() || baseTokens.colors.card;
  const border = settings['theme.border_color']?.trim() || baseTokens.colors.border;
  const radius = settings['theme.border_radius']?.trim() || baseTokens.radii.radius;
  const fontFamily = settings['theme.font_family']?.trim() || baseTokens.typography.fontSans;
  const fontHeading = settings['theme.font_heading']?.trim() || baseTokens.typography.fontHeading;

  const primaryFg = getContrastForeground(primary);
  const primaryHover = getAdjustedHover(primary, -20);
  const accentFg = getContrastForeground(accent);
  const fontStack = fontFamily.includes(',') ? fontFamily : `"${fontFamily}", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const fontHeadingStack = fontHeading.includes(',') ? fontHeading : `"${fontHeading}", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  return `
    :root {
      --background: ${background};
      --foreground: ${foreground};
      --primary: ${primary};
      --primary-foreground: ${primaryFg};
      --primary-hover: ${primaryHover};
      --ring: ${primary};
      --accent: ${accent};
      --accent-foreground: ${accentFg};
      --card: ${card};
      --card-foreground: ${foreground};
      --border: ${border};
      --input: ${border};
      --radius: ${radius};
      --font-sans: ${fontStack};
      --font-heading: ${fontHeadingStack};
    }
  `.trim();
}

/**
 * Builds a Google Fonts CDN stylesheet link for any chosen font families
 */
export function getGoogleFontUrl(settings: Record<string, string>): string | null {
  const presetKey = settings['theme.preset']?.trim() || 'default';
  const baseTokens: ThemeTokens = THEME_PRESETS[presetKey] || defaultTheme;

  const fontFamily = settings['theme.font_family']?.trim() || baseTokens.typography.fontSans;
  const fontHeading = settings['theme.font_heading']?.trim() || baseTokens.typography.fontHeading;

  const fonts = new Set<string>();
  const skipList = ['system-ui', '-apple-system', 'sans-serif', 'serif', 'monospace', 'inherit', 'blinkmacsystemfont', 'segoe ui'];

  const cleanFamily = fontFamily.split(',')[0].replace(/["']/g, '').trim();
  const cleanHeading = fontHeading.split(',')[0].replace(/["']/g, '').trim();

  if (cleanFamily && !skipList.includes(cleanFamily.toLowerCase())) {
    fonts.add(cleanFamily);
  }
  if (cleanHeading && !skipList.includes(cleanHeading.toLowerCase())) {
    fonts.add(cleanHeading);
  }

  if (fonts.size === 0) return null;

  const queryParts = Array.from(fonts).map(
    (name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600`
  );

  return `https://fonts.googleapis.com/css2?${queryParts.join('&')}&display=swap`;
}

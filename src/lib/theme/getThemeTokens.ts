/**
 * Dynamic Theme CSS Variables Generator
 * Reads theme tokens saved to the Setting database model and generates standard CSS variables.
 */

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
  const primary = settings['theme.primary_color']?.trim() || '#18181b';
  const accent = settings['theme.accent_color']?.trim() || '#f4f4f5';
  const fontFamily = settings['theme.font_family']?.trim() || 'Inter';

  const primaryFg = getContrastForeground(primary);
  const primaryHover = getAdjustedHover(primary, -20);
  const accentFg = getContrastForeground(accent);
  const fontStack = `"${fontFamily}", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  return `
    :root {
      --primary: ${primary};
      --primary-foreground: ${primaryFg};
      --primary-hover: ${primaryHover};
      --ring: ${primary};
      --accent: ${accent};
      --accent-foreground: ${accentFg};
      --font-sans: ${fontStack};
      --font-heading: ${fontStack};
    }
  `.trim();
}

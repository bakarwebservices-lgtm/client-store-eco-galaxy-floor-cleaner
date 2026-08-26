/**
 * Central Theme Design Tokens Configuration
 * Reference: BUILD_STANDARDS.md section 1.6 & ARCHITECTURE.md section 4.11
 *
 * This file defines baseline design tokens for deployment templates.
 * In a live deployment, these default CSS variables can also be augmented
 * dynamically at runtime via the Setting model (store.theme.*).
 *
 * Rule: Components MUST reference token variables or Tailwind theme classes,
 * never hardcoded hex colors or arbitrary font values.
 */

export type AspectRatioOption = 'square' | 'portrait' | 'wide';

export interface ThemeTokens {
  name: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    primaryForeground: string;
    primaryHover: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    muted: string;
    mutedForeground: string;
    card: string;
    cardForeground: string;
    border: string;
    input: string;
    ring: string;
    success: string;
    warning: string;
    destructive: string;
  };
  typography: {
    fontSans: string;
    fontHeading: string;
    baseFontSize: string;
  };
  spacing: {
    containerMaxWidth: string;
    sectionPaddingY: string;
  };
  radii: {
    radius: string; // e.g. "0.5rem"
  };
  layout: {
    productCardAspectRatio: AspectRatioOption;
  };
}

export const defaultTheme: ThemeTokens = {
  name: 'Default Modern Minimal',
  colors: {
    background: '#ffffff',
    foreground: '#09090b',
    primary: '#18181b',
    primaryForeground: '#fafafa',
    primaryHover: '#27272a',
    secondary: '#f4f4f5',
    secondaryForeground: '#18181b',
    accent: '#f4f4f5',
    accentForeground: '#18181b',
    muted: '#f4f4f5',
    mutedForeground: '#52525b',
    card: '#ffffff',
    cardForeground: '#09090b',
    border: '#e4e4e7',
    input: '#e4e4e7',
    ring: '#18181b',
    success: '#047857',
    warning: '#b45309',
    destructive: '#dc2626',
  },
  typography: {
    fontSans: 'Inter, system-ui, -apple-system, sans-serif',
    fontHeading: 'Inter, system-ui, -apple-system, sans-serif',
    baseFontSize: '16px',
  },
  spacing: {
    containerMaxWidth: '1280px',
    sectionPaddingY: '4rem',
  },
  radii: {
    radius: '0.5rem',
  },
  layout: {
    productCardAspectRatio: 'square',
  },
};

export const luxuryDarkTheme: ThemeTokens = {
  name: 'Luxury Obsidian & Gold',
  colors: {
    background: '#09090b',
    foreground: '#f4f4f5',
    primary: '#d97706', // Warm Amber Gold
    primaryForeground: '#09090b',
    primaryHover: '#b45309',
    secondary: '#18181b',
    secondaryForeground: '#f4f4f5',
    accent: '#27272a',
    accentForeground: '#f4f4f5',
    muted: '#18181b',
    mutedForeground: '#a1a1aa',
    card: '#121215',
    cardForeground: '#f4f4f5',
    border: '#27272a',
    input: '#27272a',
    ring: '#d97706',
    success: '#10b981',
    warning: '#f59e0b',
    destructive: '#ef4444',
  },
  typography: {
    fontSans: 'Plus Jakarta Sans, system-ui, sans-serif',
    fontHeading: 'Cinzel, Playfair Display, serif',
    baseFontSize: '16px',
  },
  spacing: {
    containerMaxWidth: '1360px',
    sectionPaddingY: '5rem',
  },
  radii: {
    radius: '0.25rem',
  },
  layout: {
    productCardAspectRatio: 'portrait',
  },
};

export const streetwearTheme: ThemeTokens = {
  name: 'Streetwear Mono & High-Contrast',
  colors: {
    background: '#000000',
    foreground: '#ffffff',
    primary: '#ffffff',
    primaryForeground: '#000000',
    primaryHover: '#e4e4e7',
    secondary: '#18181b',
    secondaryForeground: '#ffffff',
    accent: '#27272a',
    accentForeground: '#ffffff',
    muted: '#18181b',
    mutedForeground: '#71717a',
    card: '#09090b',
    cardForeground: '#ffffff',
    border: '#27272a',
    input: '#27272a',
    ring: '#ffffff',
    success: '#22c55e',
    warning: '#eab308',
    destructive: '#f43f5e',
  },
  typography: {
    fontSans: 'Space Grotesk, Inter, sans-serif',
    fontHeading: 'Space Grotesk, sans-serif',
    baseFontSize: '16px',
  },
  spacing: {
    containerMaxWidth: '1440px',
    sectionPaddingY: '4rem',
  },
  radii: {
    radius: '0px',
  },
  layout: {
    productCardAspectRatio: 'portrait',
  },
};

export const warmEditorialTheme: ThemeTokens = {
  name: 'Warm Editorial & Cream',
  colors: {
    background: '#faf8f5',
    foreground: '#292524',
    primary: '#78350f',
    primaryForeground: '#ffffff',
    primaryHover: '#92400e',
    secondary: '#f5f0e8',
    secondaryForeground: '#292524',
    accent: '#ede4d8',
    accentForeground: '#292524',
    muted: '#f5f0e8',
    mutedForeground: '#78716c',
    card: '#ffffff',
    cardForeground: '#292524',
    border: '#e7ded4',
    input: '#e7ded4',
    ring: '#78350f',
    success: '#059669',
    warning: '#d97706',
    destructive: '#dc2626',
  },
  typography: {
    fontSans: 'Plus Jakarta Sans, sans-serif',
    fontHeading: 'Playfair Display, serif',
    baseFontSize: '16px',
  },
  spacing: {
    containerMaxWidth: '1280px',
    sectionPaddingY: '4.5rem',
  },
  radii: {
    radius: '0.375rem',
  },
  layout: {
    productCardAspectRatio: 'square',
  },
};

export const THEME_PRESETS: Record<string, ThemeTokens> = {
  default: defaultTheme,
  luxury: luxuryDarkTheme,
  streetwear: streetwearTheme,
  editorial: warmEditorialTheme,
};

/**
 * Converts a ThemeTokens object to CSS variables string for injection into :root
 */
export function generateCssVariables(tokens: ThemeTokens = defaultTheme): string {
  return `
    --background: ${tokens.colors.background};
    --foreground: ${tokens.colors.foreground};
    --primary: ${tokens.colors.primary};
    --primary-foreground: ${tokens.colors.primaryForeground};
    --primary-hover: ${tokens.colors.primaryHover};
    --secondary: ${tokens.colors.secondary};
    --secondary-foreground: ${tokens.colors.secondaryForeground};
    --accent: ${tokens.colors.accent};
    --accent-foreground: ${tokens.colors.accentForeground};
    --muted: ${tokens.colors.muted};
    --muted-foreground: ${tokens.colors.mutedForeground};
    --card: ${tokens.colors.card};
    --card-foreground: ${tokens.colors.cardForeground};
    --border: ${tokens.colors.border};
    --input: ${tokens.colors.input};
    --ring: ${tokens.colors.ring};
    --success: ${tokens.colors.success};
    --warning: ${tokens.colors.warning};
    --destructive: ${tokens.colors.destructive};
    --radius: ${tokens.radii.radius};
    --font-sans: ${tokens.typography.fontSans};
    --font-heading: ${tokens.typography.fontHeading};
  `.trim();
}

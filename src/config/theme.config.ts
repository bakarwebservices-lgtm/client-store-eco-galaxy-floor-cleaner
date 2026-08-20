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

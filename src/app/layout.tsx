import type { Metadata, Viewport } from 'next';
import './globals.css';
import { db } from '@/lib/db';
import { generateThemeCss } from '@/lib/theme/getThemeTokens';

export const metadata: Metadata = {
  title: {
    template: '%s | Store',
    default: 'Store — Official Online Shop',
  },
  description: 'Shop quality products with fast and reliable shipping.',
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let themeCss = '';
  try {
    const rawSettings = await db.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of rawSettings) {
      if (s.value != null) {
        map[s.key] = typeof s.value === 'string' ? s.value : String(s.value);
      }
    }
    themeCss = generateThemeCss(map);
  } catch {
    themeCss = '';
  }

  return (
    <html lang="en">
      <head>
        {themeCss && (
          <style
            id="dynamic-theme-tokens"
            dangerouslySetInnerHTML={{ __html: themeCss }}
          />
        )}
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}

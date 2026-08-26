import type { Metadata, Viewport } from 'next';
import './globals.css';
import { db } from '@/lib/db';
import { generateThemeCss, getGoogleFontUrl } from '@/lib/theme/getThemeTokens';

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
  let googleFontUrl: string | null = null;
  let faviconUrl: string | null = null;
  let metaPixelId: string | null = null;
  let ga4Id: string | null = null;

  try {
    const rawSettings = await db.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of rawSettings) {
      if (s.value != null) {
        map[s.key] = typeof s.value === 'string' ? s.value : String(s.value);
      }
    }
    themeCss = generateThemeCss(map);
    googleFontUrl = getGoogleFontUrl(map);
    faviconUrl = map['store.favicon_url']?.trim() || null;
    metaPixelId = map['tracking.meta_pixel_id']?.trim() || null;
    ga4Id = map['tracking.ga4_measurement_id']?.trim() || null;
  } catch {
    themeCss = '';
    googleFontUrl = null;
    faviconUrl = null;
    metaPixelId = null;
    ga4Id = null;
  }

  return (
    <html lang="en">
      <head>
        {faviconUrl && <link rel="icon" href={faviconUrl} />}
        {googleFontUrl && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={googleFontUrl} />
          </>
        )}
        {themeCss && (
          <style
            id="dynamic-theme-tokens"
            dangerouslySetInnerHTML={{ __html: themeCss }}
          />
        )}
        {metaPixelId && (
          <script
            id="meta-pixel-init"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${metaPixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
        )}
        {ga4Id && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} />
            <script
              id="ga4-init"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${ga4Id}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}

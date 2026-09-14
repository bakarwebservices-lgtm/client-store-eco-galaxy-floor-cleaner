export interface AttributionData {
  firstSessionAt: string;
  lastSessionAt: string;
  landingPage: string;
  referrer: string;
  source: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  gclid?: string;
  fbclid?: string;
  ttclid?: string;
  sessionCount: number;
  [key: string]: any;
}

export const ATTRIBUTION_COOKIE_NAME = '_saas_attr';

export function parseReferrerAndSource(
  searchParams: Record<string, string | string[] | undefined>,
  referrerUrl: string
): { source: string; medium?: string; campaign?: string; term?: string; content?: string } {
  const getParam = (k: string): string | undefined => {
    const val = searchParams[k];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const utmSource = getParam('utm_source');
  const utmMedium = getParam('utm_medium');
  const utmCampaign = getParam('utm_campaign');
  const utmTerm = getParam('utm_term');
  const utmContent = getParam('utm_content');
  const fbclid = getParam('fbclid');
  const gclid = getParam('gclid');
  const ttclid = getParam('ttclid');

  // 1. Explicit UTM Source
  if (utmSource) {
    let normalized = utmSource.toLowerCase().trim();
    if (normalized.includes('ig') || normalized.includes('instagram')) normalized = 'Instagram';
    else if (normalized.includes('fb') || normalized.includes('facebook')) normalized = 'Facebook';
    else if (normalized.includes('google')) normalized = 'Google';
    else if (normalized.includes('tiktok')) normalized = 'TikTok';
    else if (normalized.includes('whatsapp')) normalized = 'WhatsApp';
    else if (normalized.includes('youtube')) normalized = 'YouTube';
    else normalized = utmSource;

    const mediumSuffix = utmMedium ? ` (${utmMedium})` : (fbclid || gclid || ttclid ? ' (Paid Ads)' : '');
    return {
      source: `${normalized}${mediumSuffix}`,
      medium: utmMedium,
      campaign: utmCampaign,
      term: utmTerm,
      content: utmContent,
    };
  }

  // 2. Click IDs without UTM
  if (fbclid) return { source: 'Facebook / Instagram Ads', medium: 'cpc', campaign: utmCampaign };
  if (gclid) return { source: 'Google Ads', medium: 'cpc', campaign: utmCampaign };
  if (ttclid) return { source: 'TikTok Ads', medium: 'cpc', campaign: utmCampaign };

  // 3. Referrer URL Detection
  if (referrerUrl) {
    try {
      const parsed = new URL(referrerUrl);
      const host = parsed.hostname.toLowerCase();

      if (host.includes('instagram.com') || host.includes('l.instagram.com')) return { source: 'Instagram (Organic)', medium: 'social' };
      if (host.includes('facebook.com') || host.includes('l.facebook.com') || host.includes('fb.com')) return { source: 'Facebook (Organic)', medium: 'social' };
      if (host.includes('google.com') || host.includes('google.')) return { source: 'Google (Organic)', medium: 'search' };
      if (host.includes('tiktok.com')) return { source: 'TikTok (Organic)', medium: 'social' };
      if (host.includes('youtube.com') || host.includes('youtu.be')) return { source: 'YouTube', medium: 'social' };
      if (host.includes('whatsapp.com') || host.includes('wa.me')) return { source: 'WhatsApp Direct', medium: 'chat' };
      if (host.includes('pinterest.com')) return { source: 'Pinterest', medium: 'social' };
      if (host.includes('t.co') || host.includes('twitter.com') || host.includes('x.com')) return { source: 'X / Twitter', medium: 'social' };

      return { source: host, medium: 'referral' };
    } catch {
      // invalid URL string
    }
  }

  return { source: 'Direct / Unknown', medium: 'direct' };
}

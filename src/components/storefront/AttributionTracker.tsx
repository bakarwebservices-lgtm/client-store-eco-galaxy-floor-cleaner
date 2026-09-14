'use client';

import { useEffect } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import {
  ATTRIBUTION_COOKIE_NAME,
  AttributionData,
  parseReferrerAndSource,
} from '@/lib/analytics/attribution';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days: number = 30) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const domain = window.location.hostname === 'localhost' ? '' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ''}`;
}

export function AttributionTracker() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const now = new Date().toISOString();
      const currentUrlParams: Record<string, string> = {};
      searchParams.forEach((val, key) => {
        currentUrlParams[key] = val;
      });

      const hasMarketingParams =
        Boolean(currentUrlParams.utm_source) ||
        Boolean(currentUrlParams.fbclid) ||
        Boolean(currentUrlParams.gclid) ||
        Boolean(currentUrlParams.ttclid);

      const existingRaw = getCookie(ATTRIBUTION_COOKIE_NAME);
      let existing: AttributionData | null = null;
      if (existingRaw) {
        try {
          existing = JSON.parse(existingRaw);
        } catch {
          existing = null;
        }
      }

      // Check session increment (if last session was more than 30 mins ago)
      const lastSessionTimestamp = existing?.lastSessionAt ? new Date(existing.lastSessionAt).getTime() : 0;
      const isNewSession = Date.now() - lastSessionTimestamp > 30 * 60 * 1000;

      if (!existing) {
        // First visit ever: parse source and record first touch
        const parsed = parseReferrerAndSource(currentUrlParams, document.referrer || '');
        const newAttr: AttributionData = {
          firstSessionAt: now,
          lastSessionAt: now,
          landingPage: pathname || '/',
          referrer: document.referrer || 'direct',
          source: parsed.source,
          medium: parsed.medium,
          campaign: parsed.campaign,
          term: parsed.term,
          content: parsed.content,
          fbclid: currentUrlParams.fbclid,
          gclid: currentUrlParams.gclid,
          ttclid: currentUrlParams.ttclid,
          sessionCount: 1,
        };
        setCookie(ATTRIBUTION_COOKIE_NAME, JSON.stringify(newAttr));
      } else {
        // Returning visitor: update session count and lastSessionAt
        // If they arrive with explicit new ad campaign parameters, update campaign/source while keeping firstSessionAt
        let updatedSource = existing.source;
        let updatedCampaign = existing.campaign;
        let updatedMedium = existing.medium;

        if (hasMarketingParams) {
          const parsed = parseReferrerAndSource(currentUrlParams, document.referrer || '');
          updatedSource = parsed.source;
          updatedCampaign = parsed.campaign || existing.campaign;
          updatedMedium = parsed.medium || existing.medium;
        }

        const updatedAttr: AttributionData = {
          ...existing,
          source: updatedSource,
          medium: updatedMedium,
          campaign: updatedCampaign,
          lastSessionAt: now,
          sessionCount: isNewSession ? (existing.sessionCount || 1) + 1 : (existing.sessionCount || 1),
        };
        setCookie(ATTRIBUTION_COOKIE_NAME, JSON.stringify(updatedAttr));
      }
    } catch (e) {
      // Non-blocking fallback
      console.warn('AttributionTracker error:', e);
    }
  }, [searchParams, pathname]);

  return null;
}

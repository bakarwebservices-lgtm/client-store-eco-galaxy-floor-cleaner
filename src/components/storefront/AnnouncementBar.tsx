'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';

export interface AnnouncementBarProps {
  initialEnabled?: boolean;
  initialMode?: 'static' | 'marquee' | 'rotate';
  initialDismissible?: boolean;
  initialText?: string;
  initialLink?: string;
  initialBgColor?: string;
  initialTextColor?: string;
  initial2Enabled?: boolean;
  initial2Text?: string;
  initial2Link?: string;
  initial2BgColor?: string;
  initial2TextColor?: string;
}

interface BarData {
  text: string;
  link: string;
  bgColor: string;
  textColor: string;
}

export function AnnouncementBar({
  initialEnabled = true,
  initialMode = 'static',
  initialDismissible = false,
  initialText = '✨ Free Nationwide Express Delivery on All Orders!',
  initialLink = '',
  initialBgColor = '#0F172A',
  initialTextColor = '#FFFFFF',
  initial2Enabled = false,
  initial2Text = '',
  initial2Link = '',
  initial2BgColor = '#1E293B',
  initial2TextColor = '#FFFFFF',
}: AnnouncementBarProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [mode, setMode] = useState<'static' | 'marquee' | 'rotate'>(initialMode);
  const [dismissible, setDismissible] = useState(initialDismissible);
  const [isDismissed, setIsDismissed] = useState(false);

  // Bar 1
  const [bar1Text, setBar1Text] = useState(initialText);
  const [bar1Link, setBar1Link] = useState(initialLink);
  const [bar1BgColor, setBar1BgColor] = useState(initialBgColor);
  const [bar1TextColor, setBar1TextColor] = useState(initialTextColor);

  // Bar 2 (Max 2)
  const [bar2Enabled, setBar2Enabled] = useState(initial2Enabled);
  const [bar2Text, setBar2Text] = useState(initial2Text);
  const [bar2Link, setBar2Link] = useState(initial2Link);
  const [bar2BgColor, setBar2BgColor] = useState(initial2BgColor);
  const [bar2TextColor, setBar2TextColor] = useState(initial2TextColor);

  // Rotate index (for rotate mode)
  const [activeIndex, setActiveIndex] = useState(0);

  // Check sessionStorage for dismissed state
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem('announcement_bar_dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Fetch live settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            const s = data.settings;
            if (typeof s.announcementEnabled === 'boolean') setEnabled(s.announcementEnabled);
            if (s.announcementMode) setMode(s.announcementMode);
            if (typeof s.announcementDismissible === 'boolean') setDismissible(s.announcementDismissible);

            // Bar 1
            if (typeof s.announcementText === 'string') setBar1Text(s.announcementText);
            if (typeof s.announcementLink === 'string') setBar1Link(s.announcementLink);
            if (typeof s.announcementBgColor === 'string') setBar1BgColor(s.announcementBgColor);
            if (typeof s.announcementTextColor === 'string') setBar1TextColor(s.announcementTextColor);

            // Bar 2
            if (typeof s.announcement2Enabled === 'boolean') setBar2Enabled(s.announcement2Enabled);
            if (typeof s.announcement2Text === 'string') setBar2Text(s.announcement2Text);
            if (typeof s.announcement2Link === 'string') setBar2Link(s.announcement2Link);
            if (typeof s.announcement2BgColor === 'string') setBar2BgColor(s.announcement2BgColor);
            if (typeof s.announcement2TextColor === 'string') setBar2TextColor(s.announcement2TextColor);
          }
        }
      } catch {
        // Fallback to SSR props
      }
    }
    loadSettings();
  }, []);

  // Collect active bars (max 2)
  const activeBars: BarData[] = [];
  if (bar1Text.trim()) {
    activeBars.push({
      text: bar1Text,
      link: bar1Link,
      bgColor: bar1BgColor,
      textColor: bar1TextColor,
    });
  }
  if (bar2Enabled && bar2Text.trim()) {
    activeBars.push({
      text: bar2Text,
      link: bar2Link,
      bgColor: bar2BgColor,
      textColor: bar2TextColor,
    });
  }

  // Auto-rotate timer if mode is 'rotate'
  useEffect(() => {
    if (mode !== 'rotate' || activeBars.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeBars.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [mode, activeBars.length]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('announcement_bar_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  if (!enabled || isDismissed || activeBars.length === 0) {
    return null;
  }

  // Close Button element
  const CloseButton = ({ textColor }: { textColor: string }) => {
    if (!dismissible) return null;
    return (
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        style={{ color: textColor }}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-75 hover:opacity-100 transition-opacity z-20 focus:outline-none"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    );
  };

  // 1. MARQUEE / TICKER MODE (Constantly Moving)
  if (mode === 'marquee') {
    const primaryBg = activeBars[0].bgColor;
    const primaryText = activeBars[0].textColor;

    // Build repeating ticker items
    const tickerItems = [...activeBars, ...activeBars, ...activeBars, ...activeBars];

    return (
      <aside aria-label="Announcements" className="relative z-50 overflow-hidden shadow-xs" style={{ backgroundColor: primaryBg, color: primaryText }}>
        <div className="py-2 overflow-hidden flex items-center">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-8 text-xs font-semibold tracking-wide">
            {tickerItems.map((bar, idx) => (
              <React.Fragment key={idx}>
                {bar.link ? (
                  <Link
                    href={bar.link}
                    target={bar.link.startsWith('http') ? '_blank' : undefined}
                    rel={bar.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-2 hover:underline decoration-1"
                  >
                    <span>{bar.text}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 opacity-80" />
                  </Link>
                ) : (
                  <span>{bar.text}</span>
                )}
                <span className="opacity-40 select-none">•</span>
              </React.Fragment>
            ))}
          </div>
        </div>
        <CloseButton textColor={primaryText} />
      </aside>
    );
  }

  // 2. ROTATE MODE (Carousel slide between Bar 1 & Bar 2)
  if (mode === 'rotate') {
    const currentBar = activeBars[activeIndex % activeBars.length];
    return (
      <aside
        aria-label="Announcements"
        style={{ backgroundColor: currentBar.bgColor, color: currentBar.textColor }}
        className={`relative z-50 flex items-center justify-center py-2 text-center text-xs font-semibold tracking-wide transition-colors duration-500 shadow-xs ${
          dismissible ? 'pl-4 pr-10 sm:px-8' : 'px-4 sm:px-8'
        }`}
      >
        <div className="flex items-center justify-center gap-1.5 max-w-7xl mx-auto w-full transition-all duration-300">
          {currentBar.link ? (
            <Link
              href={currentBar.link}
              target={currentBar.link.startsWith('http') ? '_blank' : undefined}
              rel={currentBar.link.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="inline-flex flex-wrap items-center justify-center gap-1.5 hover:underline leading-snug text-center"
            >
              <span className="break-words">{currentBar.text}</span>
              <ArrowRight className="h-3 w-3 shrink-0 inline-block opacity-80" />
            </Link>
          ) : (
            <span className="break-words leading-snug text-center">{currentBar.text}</span>
          )}
        </div>
        <CloseButton textColor={currentBar.textColor} />
      </aside>
    );
  }

  // 3. STATIC MODE (Max 2 bars displayed cleanly with full text context on mobile)
  return (
    <aside aria-label="Announcements" className="relative z-50 shadow-xs">
      {activeBars.map((bar, idx) => (
        <div
          key={idx}
          style={{ backgroundColor: bar.bgColor, color: bar.textColor }}
          className={`relative flex items-center justify-center py-2 text-center text-xs font-semibold tracking-wide transition-colors ${
            dismissible && idx === 0 ? 'pl-4 pr-10 sm:px-8' : 'px-4 sm:px-8'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 max-w-7xl mx-auto w-full">
            {bar.link ? (
              <Link
                href={bar.link}
                target={bar.link.startsWith('http') ? '_blank' : undefined}
                rel={bar.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="inline-flex flex-wrap items-center justify-center gap-1.5 hover:underline leading-snug text-center"
              >
                <span className="break-words">{bar.text}</span>
                <ArrowRight className="h-3 w-3 shrink-0 inline-block opacity-80" />
              </Link>
            ) : (
              <span className="break-words leading-snug text-center">{bar.text}</span>
            )}
          </div>
          {idx === 0 && <CloseButton textColor={bar.textColor} />}
        </div>
      ))}
    </aside>
  );
}

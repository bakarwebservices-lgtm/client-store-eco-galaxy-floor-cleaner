'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function UrgencyCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 15 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 6, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div
      className="border-y border-black/15 text-white py-3 px-4 shadow-inner transition-colors duration-300"
      style={{ backgroundColor: 'var(--primary, #04242A)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 text-xs sm:text-sm font-medium flex-wrap">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: 'var(--accent, #10ACB7)' }}
            />
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: 'var(--accent, #10ACB7)' }}
            />
          </span>
          <span className="font-bold text-white">Next-Day Dispatch:</span>
          <span className="text-white/90">Order within</span>
        </div>

        <div
          className="flex items-center gap-1 font-mono font-bold bg-black/40 px-3 py-1 rounded-lg border border-white/20 text-white"
          style={{ color: 'var(--accent, #10ACB7)' }}
        >
          <Clock className="h-3.5 w-3.5 mr-1 text-white" />
          <span>{pad(timeLeft.hours)}h</span>
          <span>:</span>
          <span>{pad(timeLeft.minutes)}m</span>
          <span>:</span>
          <span>{pad(timeLeft.seconds)}s</span>
        </div>

        <span className="text-white/90 font-semibold hidden sm:inline">for priority courier booking across Pakistan.</span>
      </div>
    </div>
  );
}

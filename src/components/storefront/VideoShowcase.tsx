'use client';

import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Sparkles, CheckCircle2 } from 'lucide-react';

export function VideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <section
      className="relative overflow-hidden py-20 text-white transition-colors duration-300"
      style={{ backgroundColor: 'var(--primary, #04242A)' }}
      id="video-demo"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--accent, #10ACB7)' }} />
            <span>See It In Action</span>
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Real Floor Cleaning Performance
          </h2>
          <p className="mt-3 text-base text-white/80 leading-relaxed">
            Watch how Eco Galaxy effortlessly dissolves grime, grease, and dirt while leaving a soothing lavender scent behind.
          </p>
        </div>

        {/* Video Card */}
        <div className="mt-12 mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/20 bg-black shadow-2xl relative group">
          <video
            ref={videoRef}
            src="/2.mp4"
            loop
            playsInline
            muted={isMuted}
            poster="/images/Plastic_bottle_on_wooden_table_202608270227.jpeg"
            className="w-full h-auto max-h-[580px] object-cover"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Video Controls Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 opacity-100 sm:opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-6">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-black/60 backdrop-blur px-3 py-1 text-xs font-semibold text-white border border-white/15">
                Eco Galaxy Demonstration
              </span>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80 transition-colors border border-white/15"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  style={{ backgroundColor: 'var(--accent, #10ACB7)' }}
                  className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl hover:brightness-110 hover:scale-105 transition-all active:scale-95"
                >
                  {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
                </button>
                <div>
                  <p className="text-sm font-bold text-white">100% Genuine Product Video</p>
                  <p className="text-xs text-white/80">Dilution ratio: 1–2 capfuls per bucket of water</p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-black/50 border border-white/20 px-3 py-1.5 rounded-full backdrop-blur">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--accent, #10ACB7)' }} /> No Rinse Needed
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-black/50 border border-white/20 px-3 py-1.5 rounded-full backdrop-blur">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--accent, #10ACB7)' }} /> Streak-Free Finish
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

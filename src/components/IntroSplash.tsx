import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrandMark } from './BrandMark.tsx';

interface IntroSplashProps {
  onDone: () => void;
}

const WORD = ['K', 'U', 'R', 'S', 'O'];

const PHASES = [
  { until: 34, label: 'Syncing the archive' },
  { until: 68, label: 'Streaming cover art' },
  { until: 92, label: 'Binding the scroll' },
  { until: 100, label: 'Ready to scroll' },
];

/**
 * First-load intro. Shows once per browser session, is skippable,
 * and respects prefers-reduced-motion.
 */
export const IntroSplash: React.FC<IntroSplashProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const doneRef = useRef(false);

  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    window.setTimeout(onDone, reduceMotion ? 100 : 480);
  };

  // Lock page scroll while the curtain is up.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Progress simulation — eased so it feels alive, then holds at 100.
  useEffect(() => {
    if (reduceMotion) {
      setProgress(100);
      const t = window.setTimeout(finish, 500);
      return () => window.clearTimeout(t);
    }

    let value = 0;
    const tick = window.setInterval(() => {
      const step = value < 45 ? 4.2 : value < 78 ? 2.6 : value < 96 ? 1.4 : 0.8;
      value = Math.min(100, value + step);
      setProgress(Math.round(value));
      if (value >= 100) window.clearInterval(tick);
    }, 34);

    const skipTimer = window.setTimeout(() => setCanSkip(true), 650);
    const autoLeave = window.setTimeout(finish, 2300);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(skipTimer);
      window.clearTimeout(autoLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  // Leave as soon as the bar fills (with a short beat to read "Ready").
  useEffect(() => {
    if (progress < 100 || reduceMotion) return;
    const t = window.setTimeout(finish, 420);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, reduceMotion]);

  const phase = PHASES.find((p) => progress <= p.until) ?? PHASES[PHASES.length - 1];

  return (
    <div
      onClick={() => canSkip && finish()}
      className={`fixed inset-0 z-[200] overflow-hidden bg-[#06070A] bg-grain transition-all duration-500 ease-out ${
        leaving ? 'opacity-0 scale-[1.04] blur-md pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Kurso Scroll intro"
      role="dialog"
      aria-modal="true"
    >
      {/* Ambient aurora field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora-blob aurora-blob--gold w-[70vw] h-[70vw] max-w-[560px] max-h-[560px] -top-[18%] left-1/2 -translate-x-1/2" />
        <div className="aurora-blob aurora-blob--teal w-[55vw] h-[55vw] max-w-[420px] max-h-[420px] bottom-[-12%] left-[-10%] opacity-25" />
        <div className="aurora-blob aurora-blob--violet w-[50vw] h-[50vw] max-w-[400px] max-h-[400px] bottom-[-8%] right-[-12%] opacity-20" />
        <div className="absolute inset-0 bg-grid-lines opacity-40 [mask-image:radial-gradient(circle_at_50%_45%,black,transparent_72%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_10%,#06070A_78%)]" />
      </div>

      {/* Corner meta */}
      <div className="absolute top-5 inset-x-5 z-20 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-[#6E6A62]">
        <span>Est. 2026</span>
        <span className="hidden sm:inline">Neo-Editorial Archive</span>
      </div>

      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6">
        {/* Emblem with orbiting ring */}
        <div className="relative mb-8 animate-pop" style={{ animationDelay: '80ms' }}>
          <div className="absolute -inset-6 rounded-full brand-ring animate-spin-slow opacity-60" />
          <div className="absolute -inset-1 rounded-full bg-[#C69A45]/20 blur-2xl animate-glow-pulse" />
          <div className="relative w-[88px] h-[88px] sm:w-24 sm:h-24 rounded-[26px] bg-[#0C0E13] border border-[#C69A45]/30 flex items-center justify-center shadow-[0_0_60px_-12px_rgba(198,154,69,0.6)]">
            <BrandMark bare className="w-14 h-14 sm:w-16 sm:h-16" glow />
          </div>
        </div>

        {/* Words */}
        <div className="flex items-baseline gap-[0.12em] sm:gap-[0.18em]">
          {WORD.map((letter, i) => (
            <span
              key={letter + i}
              className="splash-letter font-display text-[30px] sm:text-6xl font-bold tracking-[0.08em] text-[#F5F0E6]"
              style={{ animationDelay: `${260 + i * 85}ms` }}
            >
              {letter}
            </span>
          ))}
          <span
            className="splash-letter font-display text-[30px] sm:text-6xl font-bold tracking-[0.08em] text-gradient-gold pl-[0.14em] sm:pl-[0.24em]"
            style={{ animationDelay: `${260 + WORD.length * 85}ms` }}
          >
            SCROLL
          </span>
        </div>

        <p
          className="splash-letter mt-4 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.34em] text-[#AAA69D] text-center"
          style={{ animationDelay: `${640 + WORD.length * 85}ms` }}
        >
          Manga, curated for the scroll generation
        </p>

        {/* Progress rail */}
        <div
          className="splash-letter mt-10 w-[240px] sm:w-[300px]"
          style={{ animationDelay: `${780 + WORD.length * 85}ms` }}
        >
          <div className="h-[2px] w-full rounded-full bg-[#1B1D24] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8A6428] via-[#C69A45] to-[#F9EDD2] transition-[width] duration-150 ease-out shadow-[0_0_12px_rgba(198,154,69,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-[#6E6A62]">
            <span className="text-[#C69A45]/90">{phase.label}</span>
            <span className="tabular-nums text-[#AAA69D]">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-6 inset-x-0 z-20 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.3em] text-[#55524C]">
          <span className="w-1 h-1 rounded-full bg-[#C69A45] animate-pulse" />
          <span>Loading platform</span>
        </div>
        {canSkip && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            className="text-[10px] font-mono uppercase tracking-[0.24em] text-[#AAA69D] hover:text-[#F0E9DC] transition-colors animate-fade-in"
          >
            Tap to skip →
          </button>
        )}
      </div>
    </div>
  );
};

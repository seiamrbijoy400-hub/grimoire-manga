import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrandLogo } from './BrandMark.tsx';

interface IntroSplashProps {
  onDone: () => void;
}

const WORD = ['K', 'U', 'R', 'S', 'O'];
const SEGMENTS = 28;

const PHASES = [
  { until: 30, label: 'Mounting the archive' },
  { until: 58, label: 'Streaming cover plates' },
  { until: 82, label: 'Binding the scroll' },
  { until: 99, label: 'Calibrating the reader' },
  { until: 100, label: 'Ready — enter the archive' },
];

/**
 * First-load intro. Shows once per browser session, is skippable
 * (tap or any key), and collapses to a quick fade for reduced motion.
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

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    window.setTimeout(onDone, reduceMotion ? 100 : 780);
  }, [onDone, reduceMotion]);

  // Ambient embers — generated once so they don't jump between renders.
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${52 + Math.random() * 48}%`,
        size: 2 + Math.random() * 5,
        delay: Math.random() * 9,
        duration: 9 + Math.random() * 10,
        opacity: 0.18 + Math.random() * 0.55,
      })),
    [],
  );

  // Lock page scroll while the curtain is up.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Progress simulation — eased so it accelerates then settles.
  useEffect(() => {
    if (reduceMotion) {
      setProgress(100);
      const t = window.setTimeout(finish, 450);
      return () => window.clearTimeout(t);
    }

    let value = 0;
    const tick = window.setInterval(() => {
      value = Math.min(100, value + (100 - value) * 0.055 + 0.45);
      if (value > 99.4) value = 100;
      setProgress(Math.round(value));
      if (value >= 100) window.clearInterval(tick);
    }, 30);

    const skipTimer = window.setTimeout(() => setCanSkip(true), 650);
    const autoLeave = window.setTimeout(finish, 3100);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(skipTimer);
      window.clearTimeout(autoLeave);
    };
  }, [reduceMotion, finish]);

  // Leave once the rail fills, after a beat to read "Ready".
  useEffect(() => {
    if (progress < 100 || reduceMotion) return;
    const t = window.setTimeout(finish, 620);
    return () => window.clearTimeout(t);
  }, [progress, reduceMotion, finish]);

  // Any key skips too (keyboard users never get stuck).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canSkip) return;
      if (e.key === 'Tab') return;
      finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSkip, finish]);

  const phase = PHASES.find((p) => progress <= p.until) ?? PHASES[PHASES.length - 1];
  const litSegments = Math.round((progress / 100) * SEGMENTS);

  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Kurso Scroll intro"
      onClick={() => canSkip && finish()}
    >
      {/* Curtain panels — split apart on exit to reveal the app */}
      <div
        className={`absolute inset-x-0 top-0 h-1/2 bg-[#050608] transition-transform duration-700 [transition-timing-function:cubic-bezier(0.76,0,0.24,1)] ${
          leaving ? '-translate-y-full' : 'translate-y-0'
        }`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 h-1/2 bg-[#050608] transition-transform duration-700 [transition-timing-function:cubic-bezier(0.76,0,0.24,1)] ${
          leaving ? 'translate-y-full' : 'translate-y-0'
        }`}
      />

      {/* Stage */}
      <div
        className={`absolute inset-0 bg-grain transition-all duration-300 ${
          leaving ? 'opacity-0 scale-[1.03]' : 'opacity-100'
        }`}
      >
        {/* Ambient aurora field */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="aurora-blob aurora-blob--gold w-[74vw] h-[74vw] max-w-[600px] max-h-[600px] -top-[20%] left-1/2 -translate-x-1/2" />
          <div className="aurora-blob aurora-blob--teal w-[58vw] h-[58vw] max-w-[440px] max-h-[440px] bottom-[-14%] left-[-12%] opacity-20" />
          <div className="aurora-blob aurora-blob--violet w-[54vw] h-[54vw] max-w-[420px] max-h-[420px] bottom-[-10%] right-[-14%] opacity-20" />
          <div className="absolute inset-0 bg-grid-lines opacity-40 [mask-image:radial-gradient(circle_at_50%_45%,black,transparent_72%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_8%,#050608_78%)]" />
          <div className="scan-line top-0" />
        </div>

        {/* Embers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {particles.map((p) => (
            <span
              key={p.id}
              className="intro-particle"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          ))}
        </div>

        {/* Corner meta */}
        <div className="absolute top-5 inset-x-5 z-20 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-[#6E6A62]">
          <span>Est. 2026</span>
          <span className="hidden sm:inline">Neo-Editorial Archive</span>
        </div>

        <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6">
          {/* Emblem stage */}
          <div className="relative animate-pop" style={{ animationDelay: '60ms' }}>
            <div className="relative w-[148px] h-[148px] sm:w-[186px] sm:h-[186px]">
              <div className="absolute -inset-4 rounded-full bg-[#C62828]/25 blur-3xl animate-glow-pulse" />
              <div className="absolute -inset-9 rounded-full brand-ring animate-spin-slow opacity-45" />
              <div className="shockwave" />
              <div className="shockwave shockwave--2" />
              <div className="shockwave shockwave--3" />
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <BrandLogo className="w-full h-full" glow />
                <span className="logo-sweep" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Wordmark */}
          <div className="mt-6 flex items-baseline gap-[0.08em] sm:gap-[0.14em]">
            {WORD.map((letter, i) => (
              <span
                key={letter + i}
                className="letter-flip font-display text-[34px] sm:text-6xl font-bold tracking-[0.06em] text-[#F5F0E6]"
                style={{ animationDelay: `${300 + i * 72}ms` }}
              >
                {letter}
              </span>
            ))}
            <span
              className="letter-flip font-display text-[34px] sm:text-6xl font-bold tracking-[0.06em] text-gradient-gold pl-[0.12em] sm:pl-[0.2em]"
              style={{ animationDelay: `${300 + WORD.length * 72}ms` }}
            >
              SCROLL
            </span>
          </div>

          <p
            className="letter-flip mt-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.34em] text-[#AAA69D] text-center"
            style={{ animationDelay: `${760 + WORD.length * 72}ms` }}
          >
            Manga, curated for the scroll generation
          </p>

          {/* Segmented progress rail */}
          <div
            className="letter-flip mt-9 w-[262px] sm:w-[330px]"
            style={{ animationDelay: `${900 + WORD.length * 72}ms` }}
          >
            <div className="segment-rail h-[6px]">
              {Array.from({ length: SEGMENTS }).map((_, i) => (
                <i key={i} data-on={i < litSegments} />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em]">
              <span className="text-[#C69A45] inline-flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#C69A45] animate-pulse" />
                {phase.label}
                <span className="inline-block w-[6px] h-[9px] bg-[#C69A45]/70 animate-pulse" aria-hidden="true" />
              </span>
              <span className="tabular-nums text-[#AAA69D]">{progress}%</span>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="absolute bottom-6 inset-x-0 z-20 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.3em] text-[#55524C]">
            <span className="w-1 h-1 rounded-full bg-[#C69A45] animate-pulse" />
            <span>Boot sequence · Kurso Scroll OS</span>
          </div>
          {canSkip && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                finish();
              }}
              className="group inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-[#AAA69D] hover:text-[#F0E9DC] transition-colors animate-fade-in"
            >
              Tap or press any key
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

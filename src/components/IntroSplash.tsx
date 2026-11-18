import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrandLogo } from './BrandMark.tsx';

interface IntroSplashProps {
  onDone: () => void;
}

const FIRST = 'KURSO'.split('');
const SECOND = 'SCROLL'.split('');

/** Registration marks — the small print-shop detail that sells the concept. */
const RegMark: React.FC<{ className: string }> = ({ className }) => (
  <span className={`pointer-events-none absolute ${className}`} aria-hidden="true">
    <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-paper/25" />
    <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-paper/25" />
  </span>
);

/**
 * First-load splash: a two-panel ink curtain, a stamped emblem and the
 * wordmark setting into place. ~1.9s, once per session, tap/any-key skippable.
 */
export const IntroSplash: React.FC<IntroSplashProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const doneRef = useRef(false);
  const issueNumber = String(new Date().getMonth() + 1).padStart(2, '0');

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
    window.setTimeout(onDone, reduceMotion ? 80 : 520);
  }, [onDone, reduceMotion]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setProgress(100);
      const t = window.setTimeout(finish, 380);
      return () => window.clearTimeout(t);
    }

    let value = 0;
    const tick = window.setInterval(() => {
      value = Math.min(100, value + (100 - value) * 0.11 + 2.2);
      setProgress(Math.round(value));
      if (value >= 100) window.clearInterval(tick);
    }, 26);

    const skipTimer = window.setTimeout(() => setCanSkip(true), 320);
    const autoLeave = window.setTimeout(finish, 1600);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(skipTimer);
      window.clearTimeout(autoLeave);
    };
  }, [reduceMotion, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canSkip || e.key === 'Tab') return;
      finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSkip, finish]);

  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden bg-[#070708]"
      role="dialog"
      aria-modal="true"
      aria-label="Kurso Scroll is opening"
      onClick={() => canSkip && finish()}
    >
      {/* Ink curtain panels */}
      <div
        className={`absolute inset-y-0 left-0 z-0 w-1/2 border-r border-ink-700 bg-[#070708] transition-transform duration-[520ms] [transition-timing-function:cubic-bezier(0.76,0,0.24,1)] ${
          leaving ? '-translate-x-full' : 'translate-x-0'
        }`}
      />
      <div
        className={`absolute inset-y-0 right-0 z-0 w-1/2 bg-[#070708] transition-transform duration-[520ms] [transition-timing-function:cubic-bezier(0.76,0,0.24,1)] ${
          leaving ? 'translate-x-full' : 'translate-x-0'
        }`}
      />

      <div
        className={`relative z-10 flex h-full flex-col justify-between p-5 transition-opacity duration-200 sm:p-9 ${
          leaving ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Masthead row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border border-ink-700">
              <BrandLogo compact className="h-8 w-8" />
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper">
                Kurso Scroll
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
                Independent manga index
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper-dim">Issue {issueNumber}</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
              Est. 2026
            </p>
          </div>
        </div>

        {/* Wordmark + plate */}
        <div className="relative mx-auto w-full max-w-5xl">
          <RegMark className="left-0 top-0 h-4 w-4" />
          <RegMark className="right-0 top-0 h-4 w-4" />

          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="intro-seal stamp-mark !text-[9px]">
                Manga · Manhwa · Manhua
              </div>

              <h1 className="mt-6 flex flex-wrap items-baseline font-display text-[clamp(2.7rem,11vw,6rem)] font-bold uppercase leading-[0.86] tracking-tightest">
                {FIRST.map((letter, i) => (
                  <span
                    key={`a-${i}`}
                    className="intro-word text-paper"
                    style={{ animationDelay: `${120 + i * 30}ms` }}
                  >
                    {letter}
                  </span>
                ))}
                <span className="w-[0.28em]" aria-hidden="true" />
                {SECOND.map((letter, i) => (
                  <span
                    key={`b-${i}`}
                    className="intro-word text-stamp"
                    style={{ animationDelay: `${120 + (FIRST.length + i) * 30}ms` }}
                  >
                    {letter}
                  </span>
                ))}
              </h1>

              <div className="intro-rule mt-7 h-px bg-ink-600" />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
                <span>Read continuous or page by page</span>
                <span className="hidden sm:inline">Adult titles blocked at source</span>
              </div>
            </div>

            <div className="relative hidden w-[186px] shrink-0 lg:block">
              <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 border border-stamp/70" />
              <div className="relative aspect-[3/4] overflow-hidden border border-ink-600 bg-ink-900">
                <BrandLogo decorative className="h-full w-full p-4" />
              </div>
              <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-paper-dim">
                Plate 01 · Emblem
              </p>
            </div>
          </div>
        </div>

        {/* Progress rail */}
        <div>
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
              <div className="segment-rail h-[3px]">
                {Array.from({ length: 40 }).map((_, i) => (
                  <i key={i} data-on={i < Math.round((progress / 100) * 40)} />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
                <span>{reduceMotion ? 'Ready' : 'Mounting the index'}</span>
                <span className="tnum text-paper">{String(progress).padStart(3, '0')}%</span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                finish();
              }}
              className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] transition-opacity ${
                canSkip ? 'text-paper-dim hover:text-paper' : 'pointer-events-none opacity-0'
              }`}
            >
              Tap to skip →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

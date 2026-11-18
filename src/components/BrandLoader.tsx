import React from 'react';
import { BrandMark } from './BrandMark.tsx';

interface BrandLoaderProps {
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { box: 'h-9 w-9', inner: 'inset-[5px]', mark: 'h-4 w-4' },
  md: { box: 'h-14 w-14', inner: 'inset-[7px]', mark: 'h-6 w-6' },
  lg: { box: 'h-20 w-20', inner: 'inset-[10px]', mark: 'h-9 w-9' },
} as const;

/**
 * Quiet loader: one hairline ring, one spinning arc, the emblem at rest.
 * No orbiting sparks or pulsing halos — the waiting state should feel composed.
 */
export const BrandLoader: React.FC<BrandLoaderProps> = ({
  label = 'Opening',
  sublabel,
  size = 'md',
  className = '',
}) => {
  const s = SIZES[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`relative ${s.box}`}>
        <div className="absolute inset-0 rounded-full border border-ink-700" />
        <div className="absolute inset-0 rounded-full brand-ring" />
        <div
          className={`absolute ${s.inner} flex items-center justify-center rounded-full bg-ink-950`}
        >
          <BrandMark bare className={s.mark} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper-dim">
          {label}
          <span className="inline-flex w-[1.2em] justify-start">
            <span className="animate-pulse">.</span>
            <span className="animate-pulse [animation-delay:160ms]">.</span>
            <span className="animate-pulse [animation-delay:320ms]">.</span>
          </span>
        </p>
        {sublabel && (
          <p className="font-sans text-[11px] tracking-wide text-paper-dim/70">{sublabel}</p>
        )}
      </div>
    </div>
  );
};

interface SkeletonCardProps {
  className?: string;
  variant?: 'portrait' | 'wide' | 'row';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className = '',
  variant = 'portrait',
}) => {
  if (variant === 'row') {
    return (
      <div className={`card-flat flex gap-3 p-2.5 ${className}`}>
        <div className="shimmer-skeleton aspect-[3/4] w-14 shrink-0 rounded-sm" />
        <div className="flex-1 space-y-2 py-1">
          <div className="shimmer-skeleton h-3 w-3/4 rounded-sm" />
          <div className="shimmer-skeleton h-2.5 w-1/2 rounded-sm" />
          <div className="shimmer-skeleton h-2.5 w-2/3 rounded-sm" />
        </div>
      </div>
    );
  }

  if (variant === 'wide') {
    return (
      <div className={`card-flat space-y-3 p-4 ${className}`}>
        <div className="shimmer-skeleton h-56 rounded-sm" />
        <div className="shimmer-skeleton h-4 w-1/3 rounded-sm" />
        <div className="shimmer-skeleton h-3 w-2/3 rounded-sm" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <div className="shimmer-skeleton aspect-[3/4] w-full rounded-md border border-ink-700" />
      <div className="shimmer-skeleton h-3.5 w-4/5 rounded-sm" />
      <div className="shimmer-skeleton h-2.5 w-1/2 rounded-sm" />
    </div>
  );
};

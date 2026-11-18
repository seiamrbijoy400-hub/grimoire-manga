import React from 'react';
import { BrandMark } from './BrandMark.tsx';

interface BrandLoaderProps {
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { box: 'w-9 h-9', mark: 'w-4 h-4', label: 'text-[9px]' },
  md: { box: 'w-14 h-14', mark: 'w-6 h-6', label: 'text-[10px]' },
  lg: { box: 'w-20 h-20', mark: 'w-9 h-9', label: 'text-[11px]' },
} as const;

/**
 * Branded loading indicator: rotating gold conic ring around the K emblem.
 */
export const BrandLoader: React.FC<BrandLoaderProps> = ({
  label = 'Loading',
  sublabel,
  size = 'md',
  className = '',
}) => {
  const s = SIZES[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className={`relative ${s.box}`}>
        <div className="absolute inset-0 rounded-full border border-[#292A2D]" />
        <div className="absolute inset-0 rounded-full brand-ring" />
        <div className="absolute inset-[3px] rounded-full bg-[#0C0E13] flex items-center justify-center">
          <BrandMark bare className={s.mark} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <p
          className={`font-mono uppercase tracking-[0.26em] text-[#C69A45] ${s.label} inline-flex items-center`}
        >
          {label}
          <span className="inline-flex w-[1.1em] justify-start">
            <span className="animate-pulse">.</span>
            <span className="animate-pulse [animation-delay:180ms]">.</span>
            <span className="animate-pulse [animation-delay:360ms]">.</span>
          </span>
        </p>
        {sublabel && (
          <p className="text-[11px] text-[#AAA69D] font-sans tracking-wide">{sublabel}</p>
        )}
      </div>
    </div>
  );
};

interface SkeletonCardProps {
  className?: string;
  /** portrait = cover card, wide = hero/banner block */
  variant?: 'portrait' | 'wide' | 'row';
}

/** Shimmering placeholder that matches the card silhouette. */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className = '',
  variant = 'portrait',
}) => {
  if (variant === 'row') {
    return (
      <div className={`p-2.5 rounded-xl bg-[#111318] border border-[#292A2D] flex gap-3 ${className}`}>
        <div className="shimmer-skeleton w-16 aspect-[3/4] rounded-lg shrink-0" />
        <div className="flex-1 py-1 space-y-2">
          <div className="shimmer-skeleton h-3 w-3/4 rounded" />
          <div className="shimmer-skeleton h-2.5 w-1/2 rounded" />
          <div className="shimmer-skeleton h-2.5 w-2/3 rounded" />
        </div>
      </div>
    );
  }

  if (variant === 'wide') {
    return (
      <div className={`rounded-2xl bg-[#111318] border border-[#292A2D] p-6 space-y-4 ${className}`}>
        <div className="shimmer-skeleton h-64 rounded-xl" />
        <div className="shimmer-skeleton h-4 w-1/3 rounded" />
        <div className="shimmer-skeleton h-3 w-2/3 rounded" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <div className="shimmer-skeleton aspect-[3/4] w-full rounded-lg border border-[#292A2D]" />
      <div className="shimmer-skeleton h-3.5 w-4/5 rounded" />
      <div className="shimmer-skeleton h-3 w-1/2 rounded" />
    </div>
  );
};

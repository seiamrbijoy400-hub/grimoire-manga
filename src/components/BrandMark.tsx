import React from 'react';

/**
 * KURSO SCROLL brand system.
 * Pure vector so it stays crisp on every screen density and needs no assets.
 */

interface BrandMarkProps {
  className?: string;
  /** Adds an outer gold halo. */
  glow?: boolean;
  /** Bare glyph (no plate) for tight layouts. */
  bare?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  className = 'w-10 h-10',
  glow = false,
  bare = false,
}) => {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} ${glow ? 'drop-shadow-[0_0_14px_rgba(198,154,69,0.55)]' : ''}`}
      role="img"
      aria-label="Kurso Scroll emblem"
    >
      <defs>
        <linearGradient id="ks-gold" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F9EDD2" />
          <stop offset="38%" stopColor="#E0B367" />
          <stop offset="68%" stopColor="#C69A45" />
          <stop offset="100%" stopColor="#8A6428" />
        </linearGradient>
        <linearGradient id="ks-plate" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1A1D25" />
          <stop offset="55%" stopColor="#0E1015" />
          <stop offset="100%" stopColor="#08090C" />
        </linearGradient>
        <radialGradient id="ks-sheen" cx="30%" cy="18%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {!bare && (
        <>
          <rect x="2.5" y="2.5" width="59" height="59" rx="17" fill="url(#ks-plate)" />
          <rect
            x="2.5"
            y="2.5"
            width="59"
            height="59"
            rx="17"
            fill="url(#ks-sheen)"
          />
          <rect
            x="2.5"
            y="2.5"
            width="59"
            height="59"
            rx="17"
            fill="none"
            stroke="url(#ks-gold)"
            strokeOpacity="0.55"
            strokeWidth="1.4"
          />
        </>
      )}

      {/* Stylised scroll-K glyph */}
      <path
        d="M21 15.5V48.5"
        stroke="url(#ks-gold)"
        strokeWidth="5.4"
        strokeLinecap="round"
      />
      <path
        d="M43.5 15.5L24.8 33.4"
        stroke="url(#ks-gold)"
        strokeWidth="5.4"
        strokeLinecap="round"
      />
      <path
        d="M30.6 28.8L44.6 48.5"
        stroke="url(#ks-gold)"
        strokeWidth="5.4"
        strokeLinecap="round"
      />
      {/* Unrolling scroll curl */}
      <path
        d="M15.6 48.5c3.4 2.4 8.2 2.4 11.6 0"
        stroke="url(#ks-gold)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
      {/* Spark */}
      <path
        d="M48.5 20.5l1.2 3.2 3.3 1.2-3.3 1.2-1.2 3.2-1.2-3.2-3.3-1.2 3.3-1.2z"
        fill="#F7E7C1"
        fillOpacity="0.95"
      />
    </svg>
  );
};

interface WordMarkProps {
  className?: string;
  /** text size classes for the wordmark itself */
  size?: string;
  showEdition?: boolean;
}

export const WordMark: React.FC<WordMarkProps> = ({
  className = '',
  size = 'text-base sm:text-lg',
  showEdition = false,
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`font-display ${size} font-bold tracking-[0.16em] leading-none text-[#F0E9DC]`}
      >
        KURSO
        <span className="text-gradient-gold"> SCROLL</span>
      </span>
      {showEdition && (
        <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-[#191A1F] text-[#AAA69D] border border-[#292A2D] font-mono uppercase tracking-[0.18em]">
          2026
        </span>
      )}
    </div>
  );
};

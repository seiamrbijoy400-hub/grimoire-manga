import React, { useState } from 'react';
import { Bookmark, Sparkles } from 'lucide-react';
import { MangaItem } from '../types.ts';
import { useStore } from '../store/useStore.ts';
import { getProxyImageUrl } from '../services/api.ts';

// Editorial Archival SVG Placeholder for failed images
const FALLBACK_COVER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400" fill="%23111318"><rect width="300" height="400" fill="%23111318"/><rect x="15" y="15" width="270" height="370" fill="none" stroke="%23292A2D" stroke-width="1.5"/><line x1="25" y1="25" x2="275" y2="25" stroke="%23C69A45" stroke-width="0.5" stroke-opacity="0.4"/><text x="150" y="195" font-family="serif" font-size="28" font-weight="bold" fill="%23C69A45" text-anchor="middle">KURO</text><text x="150" y="225" font-family="sans-serif" font-size="10" font-weight="bold" fill="%23AAA69D" letter-spacing="4" text-anchor="middle">ARCHIVE</text></svg>`;

interface MangaCardProps {
  manga: MangaItem;
  rank?: number;
  featured?: boolean;
}

export const MangaCard: React.FC<MangaCardProps> = ({ manga, rank }) => {
  const { openManga, toggleBookmark, isBookmarked, getMangaHistory } = useStore();
  const bookmarked = isBookmarked(manga.id);
  const history = getMangaHistory(manga.id);
  const [imageError, setImageError] = useState(false);

  // Origin identification
  const getOrigin = () => {
    if (manga.type === 'Manhwa' || manga.country === 'KR') return { flag: '🇰🇷', label: 'Manhwa' };
    if (manga.type === 'Manhua' || manga.country === 'CN') return { flag: '🇨🇳', label: 'Manhua' };
    if (manga.type === 'OEL' || manga.country === 'US') return { flag: '🌐', label: 'OEL' };
    return { flag: '🇯🇵', label: 'Manga' };
  };

  const origin = getOrigin();
  const imgSrc = imageError ? FALLBACK_COVER : getProxyImageUrl(manga.cover);

  return (
    <article
      onClick={() => openManga(manga.id, manga.title, manga.cover)}
      className="group relative cursor-pointer select-none flex flex-col transition-transform duration-300 hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C69A45]"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') openManga(manga.id, manga.title, manga.cover);
      }}
    >
      {/* 1. Portrait Artwork Container */}
      <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-[#111318] border border-[#292A2D] group-hover:border-[#C69A45]/40 transition-all duration-300 shadow-md group-hover:shadow-xl">
        <img
          src={imgSrc}
          alt={`Cover artwork for ${manga.title}`}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 will-change-transform"
          loading="lazy"
        />

        {/* Soft bottom vignette to give definition to the poster */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090A0C]/80 via-transparent to-transparent pointer-events-none opacity-80" />

        {/* Top Left: Editorial Rank Indicator if applicable */}
        {rank !== undefined && rank <= 10 && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-[#090A0C]/90 backdrop-blur-sm border border-[#292A2D] text-[11px] font-mono font-bold text-[#F0E9DC] flex items-center gap-1 shadow-sm z-10">
            <span className="text-[#C69A45]">#{rank.toString().padStart(2, '0')}</span>
          </div>
        )}

        {/* Reading Progress Marker (if user previously read this volume) */}
        {history && !rank && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#090A0C]/90 backdrop-blur-sm border border-[#C69A45]/40 text-[10px] text-[#C69A45] font-mono z-10 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C69A45]" />
            <span className="truncate max-w-[85px]">Ch. {history.pageIndex}</span>
          </div>
        )}

        {/* Top Right: Bookmark Action */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(manga);
          }}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-md backdrop-blur-md transition-all shadow-md z-10 ${
            bookmarked
              ? 'bg-[#C69A45] text-[#090A0C] scale-105 shadow-[#C69A45]/20'
              : 'bg-[#090A0C]/80 text-[#AAA69D] hover:text-[#F0E9DC] hover:bg-[#111318] border border-[#292A2D]'
          }`}
          title={bookmarked ? 'Remove from Library' : 'Save to Library'}
          aria-label={bookmarked ? 'Remove from Library' : 'Save to Library'}
        >
          <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Poster Bottom: Origin & Status Badges */}
        <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
          <span className="px-1.5 py-0.5 rounded bg-[#090A0C]/90 backdrop-blur-sm border border-[#292A2D] text-[10px] font-mono text-[#F0E9DC] flex items-center gap-1">
            <span>{origin.flag}</span>
            <span>{origin.label}</span>
          </span>

          {manga.status && (
            <span className="px-1.5 py-0.5 rounded bg-[#090A0C]/90 backdrop-blur-sm border border-[#292A2D] text-[10px] font-mono text-[#AAA69D] flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${manga.status.toLowerCase() === 'ongoing' ? 'bg-[#42B8A8]' : 'bg-[#AAA69D]'}`} />
              <span>{manga.status}</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Editorial Metadata Area Below Artwork (Human Created Typography) */}
      <div className="pt-2.5 px-0.5 space-y-1">
        <h3
          className="font-serif text-sm font-bold text-[#F0E9DC] group-hover:text-[#C69A45] transition-colors line-clamp-2 leading-snug"
          title={manga.title}
        >
          {manga.title}
        </h3>

        <div className="flex items-center justify-between text-[11px] text-[#AAA69D] font-sans">
          <span className="truncate max-w-[130px]">
            {manga.tags && manga.tags.length > 0 ? manga.tags[0] : (manga.latestChapter || 'Volume 1')}
          </span>
          <span className="text-[#AAA69D] group-hover:text-[#C69A45] group-hover:translate-x-0.5 transition-all text-[11px] font-mono shrink-0">
            Open →
          </span>
        </div>
      </div>
    </article>
  );
};

import React, { useState, useRef } from 'react';
import { Bookmark, BookOpen, Flame, ShieldCheck, Zap } from 'lucide-react';
import { MangaItem } from '../types.ts';
import { useStore } from '../store/useStore.ts';
import { getProxyImageUrl } from '../services/api.ts';

interface MangaCardProps {
  manga: MangaItem;
  rank?: number;
  featured?: boolean;
}

export const MangaCard: React.FC<MangaCardProps> = ({ manga, rank, featured = false }) => {
  const { openManga, toggleBookmark, isBookmarked, getMangaHistory } = useStore();
  const bookmarked = isBookmarked(manga.id);
  const history = getMangaHistory(manga.id);

  // 3D Perspective Tilt Physics State
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number; glareX: number; glareY: number } | null>(null);

  const isMangaDex = manga.source === 'mangadex' || manga.id.startsWith('md:');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * 11;
    const rotateY = ((x - centerX) / centerX) * 11;

    setTilt({
      x: rotateX,
      y: rotateY,
      glareX: (x / rect.width) * 100,
      glareY: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setTilt(null);
  };

  return (
    <div
      ref={cardRef}
      onClick={() => openManga(manga.id, manga.title, manga.coverImage)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: '1000px',
      }}
      className={`group relative cursor-pointer select-none ${
        featured ? 'col-span-1 md:col-span-2 row-span-2' : ''
      }`}
    >
      {/* 3D Dimensional Wrapper */}
      <div
        style={{
          transform: tilt
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(12px)`
            : 'rotateX(0deg) rotateY(0deg) translateZ(0px)',
          transition: tilt ? 'transform 0.08s ease-out' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          transformStyle: 'preserve-3d',
        }}
        className={`relative rounded-2xl bg-void-900 border overflow-hidden transition-colors duration-300 shadow-xl ${
          isMangaDex
            ? 'border-telemetry-cyan/40 hover:border-telemetry-cyan shadow-telemetry-cyan/5'
            : 'border-void-750 hover:border-solar-500/70 shadow-solar-500/5'
        }`}
      >
        {/* Dynamic Holographic Glare Layer */}
        {tilt && (
          <div
            className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.16) 0%, transparent 60%)`,
            }}
          />
        )}

        {/* Cover Image Container */}
        <div className={`relative overflow-hidden bg-void-950 ${featured ? 'aspect-[16/10]' : 'aspect-[3/4]'}`}>
          <img
            src={getProxyImageUrl(manga.cover)}
            alt={manga.title}
            className="w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500"
            loading="lazy"
          />

          {/* Ambient Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-void-950 via-void-950/45 to-transparent opacity-90 group-hover:opacity-75 transition-opacity" />

          {/* Rank Badge for Top Trending */}
          {rank !== undefined && rank <= 10 && (
            <div
              className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg font-serif font-black text-xs shadow-lg backdrop-blur-md flex items-center gap-1 z-20 ${
                rank === 1
                  ? 'bg-gradient-to-r from-solar-400 to-amber-600 text-void-950 border border-amber-300'
                  : rank === 2
                  ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-void-950 border border-white'
                  : rank === 3
                  ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 border border-amber-600'
                  : 'bg-void-950/85 text-solar-400 border border-solar-500/30'
              }`}
            >
              {rank <= 3 && <Flame className="w-3 h-3 fill-current" />}
              <span>#{rank}</span>
            </div>
          )}

          {/* Source Identifier Badge */}
          <div className="absolute top-2.5 right-11 flex items-center gap-1 z-20">
            {isMangaDex ? (
              <span className="px-2 py-0.5 rounded-md bg-void-950/90 backdrop-blur-md border border-telemetry-cyan/60 text-[10px] text-telemetry-cyan font-mono font-bold flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3" />
                <span>MD Safe</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-void-950/90 backdrop-blur-md border border-solar-500/40 text-[10px] text-solar-400 font-mono font-bold flex items-center gap-1 shadow-sm">
                <Zap className="w-3 h-3" />
                <span>Stream</span>
              </span>
            )}
          </div>

          {/* Bookmark Quick Action */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(manga);
            }}
            className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md transition-all z-20 ${
              bookmarked
                ? 'bg-solar-500 text-void-950 shadow-lg shadow-solar-500/30 scale-105'
                : 'bg-void-950/70 text-slate-300 hover:text-solar-400 hover:bg-void-900 border border-void-700/60'
            }`}
            title={bookmarked ? 'Remove from Shelf' : 'Add to Shelf'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Reading Progress Indicator Badge */}
          {history && !rank && (
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-void-950/90 backdrop-blur-md border border-solar-500/40 text-[10px] text-solar-400 font-mono font-medium z-20">
              <span className="w-1.5 h-1.5 rounded-full bg-solar-400 animate-ping" />
              <span className="truncate max-w-[95px]">{history.chapterTitle}</span>
            </div>
          )}

          {/* Bottom Details Overlay */}
          <div className="absolute bottom-0 inset-x-0 p-3 sm:p-3.5 flex flex-col justify-end z-20">
            {manga.tags && manga.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {manga.tags.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-void-900/80 backdrop-blur-sm text-slate-300 border border-void-700/60 font-mono"
                  >
                    {t}
                  </span>
                ))}
                {manga.type && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                      isMangaDex
                        ? 'bg-telemetry-cyan/15 text-telemetry-cyan border-telemetry-cyan/30'
                        : 'bg-solar-500/15 text-solar-400 border-solar-500/30'
                    }`}
                  >
                    {manga.type}
                  </span>
                )}
              </div>
            )}

            <h3
              className={`font-serif text-sm sm:text-base font-bold text-slate-100 transition-colors line-clamp-2 leading-snug ${
                isMangaDex ? 'group-hover:text-telemetry-cyan' : 'group-hover:text-solar-400'
              }`}
            >
              {manga.title}
            </h3>

            {manga.description && (
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-normal hidden sm:block">
                {manga.description}
              </p>
            )}

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className={`font-medium flex items-center gap-1 ${isMangaDex ? 'text-telemetry-cyan' : 'text-solar-400'}`}>
                <BookOpen className="w-3 h-3" />
                <span>{manga.status || 'Decipher'}</span>
              </span>
              <span className="group-hover:translate-x-0.5 transition-transform text-slate-400 group-hover:text-solar-400 flex items-center gap-0.5 font-bold">
                <span>Read</span>
                <span>→</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

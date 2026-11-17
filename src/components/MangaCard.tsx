import React from 'react';
import { Bookmark, BookOpen, Sparkles, Flame, Eye } from 'lucide-react';
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

  return (
    <div
      onClick={() => openManga(manga.id)}
      className={`group relative rounded-2xl bg-void-900 border border-void-800/80 hover:border-victorian-gold/70 cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-victorian-gold/15 ${
        featured ? 'col-span-1 md:col-span-2 row-span-2' : ''
      }`}
    >
      {/* Cover Image Container */}
      <div className={`relative overflow-hidden bg-void-950 ${featured ? 'aspect-[16/10]' : 'aspect-[3/4]'}`}>
        <img
          src={getProxyImageUrl(manga.cover)}
          alt={manga.title}
          className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500"
          loading="lazy"
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-void-950 via-void-950/40 to-transparent opacity-90 group-hover:opacity-75 transition-opacity" />

        {/* Rank Badge for Top Trending (2026 Look) */}
        {rank !== undefined && rank <= 10 && (
          <div
            className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg font-serif font-black text-xs shadow-lg backdrop-blur-md flex items-center gap-1 ${
              rank === 1
                ? 'bg-gradient-to-r from-amber-400 to-yellow-600 text-void-950 border border-yellow-300'
                : rank === 2
                ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-void-950 border border-white'
                : rank === 3
                ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 border border-amber-600'
                : 'bg-void-950/80 text-victorian-gold border border-victorian-gold/30'
            }`}
          >
            {rank <= 3 && <Flame className="w-3 h-3 fill-current" />}
            <span>#{rank}</span>
          </div>
        )}

        {/* Bookmark Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(manga);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md transition-all ${
            bookmarked
              ? 'bg-victorian-gold text-void-950 shadow-lg shadow-victorian-gold/40 scale-105'
              : 'bg-void-950/60 text-slate-300 hover:text-victorian-gold hover:bg-void-900'
          }`}
          title={bookmarked ? 'Remove Bookmark' : 'Preserve in Grimoire'}
        >
          <Bookmark className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Reading Progress Indicator Badge (if in history) */}
        {history && !rank && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-void-950/90 backdrop-blur-md border border-genz-amethyst/50 text-[10px] text-purple-300 font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-genz-amethyst animate-ping" />
            <span className="truncate max-w-[90px]">{history.chapterTitle}</span>
          </div>
        )}

        {/* Bottom Details Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-3 sm:p-3.5 flex flex-col justify-end">
          {manga.tags && manga.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {manga.tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-void-900/80 backdrop-blur-sm text-slate-300 border border-void-700/60 font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <h3 className="font-serif text-sm sm:text-base font-bold text-slate-100 group-hover:text-victorian-gold transition-colors line-clamp-2 leading-snug">
            {manga.title}
          </h3>

          {manga.description && (
            <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-normal hidden sm:block">
              {manga.description}
            </p>
          )}

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="text-victorian-gold font-medium flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              <span>WeebCentral</span>
            </span>
            <span className="group-hover:translate-x-1 transition-transform text-slate-400 group-hover:text-amber-200 flex items-center gap-0.5 font-bold">
              <span>Read</span>
              <span>→</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

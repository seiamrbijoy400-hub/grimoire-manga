import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { MangaItem } from '../types.ts';
import { useStore } from '../store/useStore.ts';
import { getProxyImageUrl } from '../services/api.ts';
import { filterSafeTags } from '../lib/contentSafety.ts';

const FALLBACK_COVER = '/logo.png';

interface MangaCardProps {
  manga: MangaItem;
  rank?: number;
}

/** Country marks instead of flag emoji — quieter and always legible. */
const originCode = (type?: string, country?: string) => {
  if (type === 'Manhwa' || country === 'KR') return { code: 'KR', label: 'Manhwa' };
  if (type === 'Manhua' || country === 'CN') return { code: 'CN', label: 'Manhua' };
  if (type === 'OEL' || country === 'US') return { code: 'EN', label: 'OEL' };
  return { code: 'JP', label: 'Manga' };
};

export const MangaCard: React.FC<MangaCardProps> = ({ manga, rank }) => {
  const { openManga, toggleBookmark, isBookmarked, getMangaHistory } = useStore();
  const bookmarked = isBookmarked(manga.id);
  const history = getMangaHistory(manga.id);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const origin = originCode(manga.type, manga.country);
  const imgSrc = imageError ? FALLBACK_COVER : getProxyImageUrl(manga.cover);
  const genre = filterSafeTags(manga.tags)[0];
  const open = () => openManga(manga.id, manga.title, manga.cover);

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <button
          type="button"
          onClick={open}
          aria-label={`Open ${manga.title}`}
          className="relative block aspect-[2/3] w-full overflow-hidden rounded-md border border-ink-700 bg-ink-900 text-left transition-all duration-300 group-hover:-translate-y-1 group-hover:border-paper/35 group-hover:shadow-[0_14px_0_-8px_rgba(244,239,228,0.12)]"
        >
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 shimmer-skeleton" aria-hidden="true" />
          )}
          <img
            src={imgSrc}
            alt=""
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
            className={`h-full w-full object-cover object-center transition-all duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } group-hover:scale-[1.03]`}
            loading="lazy"
            decoding="async"
          />

          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />

          {/* Rank / progress marker */}
          {rank !== undefined && rank <= 10 && (
            <span className="tnum absolute left-0 top-0 z-10 bg-paper px-1.5 py-1 font-mono text-[10px] font-semibold leading-none text-ink-950">
              {String(rank).padStart(2, '0')}
            </span>
          )}
          {history && rank === undefined && (
            <span className="tnum absolute left-2 top-2 z-10 bg-ink-950/85 px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-paper backdrop-blur-sm">
              p.{history.pageIndex || 1}
            </span>
          )}

          {/* Footer marks */}
          <span className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-center justify-between">
            <span className="tag !bg-ink-950/80">{origin.code}</span>
            {manga.status && (
              <span className="tag !bg-ink-950/80">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    manga.status.toLowerCase() === 'ongoing' ? 'bg-teal-400' : 'bg-paper-dim'
                  }`}
                />
                {manga.status}
              </span>
            )}
          </span>
        </button>

        {/* Save stays a sibling so the two actions never nest. */}
        <button
          type="button"
          onClick={() => toggleBookmark(manga)}
          className={`absolute right-1.5 top-1.5 z-10 flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${
            bookmarked
              ? 'border-stamp bg-stamp text-ink-950'
              : 'border-transparent bg-ink-950/45 text-paper-dim backdrop-blur-sm hover:border-ink-600 hover:text-paper'
          }`}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? `Remove ${manga.title} from library` : `Save ${manga.title} to library`}
        >
          <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Caption */}
      <button type="button" onClick={open} className="space-y-1 pt-2.5 text-left">
        <span
          className="line-clamp-2 block font-display text-[13.5px] font-semibold leading-snug tracking-[-0.01em] text-paper transition-colors group-hover:text-stamp"
          title={manga.title}
        >
          {manga.title}
        </span>
        <span className="flex items-center justify-between gap-2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-paper-dim">
          <span className="truncate">{genre || origin.label}</span>
          <span className="shrink-0 text-paper-dim/70 transition-colors group-hover:text-paper">
            Read →
          </span>
        </span>
      </button>
    </article>
  );
};

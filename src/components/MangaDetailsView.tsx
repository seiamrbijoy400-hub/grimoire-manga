import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  ChevronLeft,
  BookOpen,
  ArrowUpDown,
  Search,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  Share2,
  Check,
  RotateCcw,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../store/useStore.ts';
import { fetchMangaDetails, fetchChapterList, getProxyImageUrl } from '../services/api.ts';
import { BrandLoader } from './BrandLoader.tsx';
import { filterSafeTags } from '../lib/contentSafety.ts';
import { MangaDetails, ChapterItem, BookmarkCategory } from '../types.ts';

const CHUNK_SIZE = 50;
const FALLBACK_COVER = '/logo.png';

const LANGUAGE_META: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  bn: { label: 'বাংলা (Bangla)', flag: '🇧🇩' },
  banglish: { label: 'Banglish', flag: '🇧🇩' },
  hi: { label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  hinglish: { label: 'Hinglish', flag: '🇮🇳' },
  ur: { label: 'اردو (Urdu)', flag: '🇵🇰' },
  urdlish: { label: 'Urdlish', flag: '🇵🇰' },
  es: { label: 'Español', flag: '🇪🇸' },
  'es-la': { label: 'Español (Latam)', flag: '🇲🇽' },
  'pt-br': { label: 'Português', flag: '🇧🇷' },
  fr: { label: 'Français', flag: '🇫🇷' },
  id: { label: 'Indonesia', flag: '🇮🇩' },
  ja: { label: '日本語', flag: '🇯🇵' },
  ko: { label: '한국어', flag: '🇰🇷' },
  zh: { label: '中文', flag: '🇨🇳' },
  'zh-hk': { label: '粵語', flag: '🇭🇰' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  it: { label: 'Italiano', flag: '🇮🇹' },
  ru: { label: 'Русский', flag: '🇷🇺' },
  ar: { label: 'العربية', flag: '🇸🇦' },
  he: { label: 'עברית', flag: '🇮🇱' },
  ka: { label: 'ქართული', flag: '🇬🇪' },
  ms: { label: 'Melayu', flag: '🇲🇾' },
  th: { label: 'ไทย', flag: '🇹🇭' },
  vi: { label: 'Tiếng Việt', flag: '🇻🇳' },
  tr: { label: 'Türkçe', flag: '🇹🇷' },
  pl: { label: 'Polski', flag: '🇵🇱' },
};

const SHELF_LABELS: Record<BookmarkCategory, { label: string; icon: string; color: string }> = {
  reading: { label: 'Reading', icon: '📖', color: 'text-solar-400' },
  plan: { label: 'Plan to Read', icon: '⏳', color: 'text-telemetry-cyan' },
  completed: { label: 'Completed', icon: '🏆', color: 'text-telemetry-emerald' },
  favorites: { label: 'Favorites', icon: '⭐', color: 'text-amber-300' },
};

export const MangaDetailsView: React.FC = () => {
  const {
    activeMangaId,
    setView,
    openChapter,
    toggleBookmark,
    isBookmarked,
    getBookmark,
    setBookmarkCategory,
    getMangaHistory,
    isChapterRead,
    markChapterRead,
    markMangaAllRead,
    setActiveMangaMeta,
  } = useStore();

  const [details, setDetails] = useState<MangaDetails | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [chapterFilter, setChapterFilter] = useState('');
  const [sortDescending, setSortDescending] = useState(true);
  const [selectedChunk, setSelectedChunk] = useState<number>(0); // 0 = first chunk, -1 = all
  const [shelfDropdownOpen, setShelfDropdownOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!activeMangaId) return;

    async function load() {
      setLoading(true);
      const [d, ch] = await Promise.all([
        fetchMangaDetails(activeMangaId!),
        fetchChapterList(activeMangaId!),
      ]);
      setDetails(d);
      if (d) {
        setActiveMangaMeta(d.title, d.cover);
      }
      setChapters(ch);
      setLoading(false);
    }
    load();
  }, [activeMangaId, setActiveMangaMeta]);

  if (!activeMangaId) return null;

  const bookmarked = details ? isBookmarked(details.id) : false;
  const currentBookmark = details ? getBookmark(details.id) : undefined;
  const history = getMangaHistory(activeMangaId);

  // Available Languages and chapter counts
  const availableLanguages = useMemo(() => {
    const map: Record<string, number> = {};
    chapters.forEach((ch) => {
      const lang = ch.language || 'en';
      map[lang] = (map[lang] || 0) + 1;
    });
    return map;
  }, [chapters]);

  const languageKeys = useMemo(() => Object.keys(availableLanguages), [availableLanguages]);

  // Set default language intelligently: English first, or most populous language
  useEffect(() => {
    if (languageKeys.length === 0) return;
    if (languageKeys.includes('en')) {
      setSelectedLanguage('en');
    } else if (languageKeys.length === 1) {
      setSelectedLanguage(languageKeys[0]);
    } else {
      const sorted = [...languageKeys].sort((a, b) => availableLanguages[b] - availableLanguages[a]);
      setSelectedLanguage(sorted[0] || 'all');
    }
  }, [languageKeys, availableLanguages]);

  // 1. Filter chapters by selected language
  const languageFilteredChapters = useMemo(() => {
    if (selectedLanguage === 'all') return chapters;
    return chapters.filter((ch) => (ch.language || 'en') === selectedLanguage);
  }, [chapters, selectedLanguage]);

  // 2. Filter chapters by search query
  const filteredChapters = useMemo(() => {
    return languageFilteredChapters.filter((ch) =>
      ch.title.toLowerCase().includes(chapterFilter.toLowerCase())
    );
  }, [languageFilteredChapters, chapterFilter]);

  // Order chapters
  const orderedChapters = useMemo(() => {
    // WeebCentral delivers newest first by default
    return sortDescending ? filteredChapters : [...filteredChapters].reverse();
  }, [filteredChapters, sortDescending]);

  // Chunking for performance and visual comfort if chapters > CHUNK_SIZE
  const chunksCount = Math.ceil(orderedChapters.length / CHUNK_SIZE);

  const displayChapters = useMemo(() => {
    if (selectedChunk === -1 || chunksCount <= 1 || chapterFilter) {
      return orderedChapters;
    }
    const start = selectedChunk * CHUNK_SIZE;
    return orderedChapters.slice(start, start + CHUNK_SIZE);
  }, [orderedChapters, selectedChunk, chunksCount, chapterFilter]);

  // Determine starting / resume chapter
  const oldestChapter = chapters.length > 0 ? chapters[chapters.length - 1] : undefined;
  const resumeChapter = history
    ? chapters.find((c) => c.id === history.chapterId) || oldestChapter
    : oldestChapter;

  const totalReadCount = chapters.filter((c) => isChapterRead(c.id)).length;
  const readPercentage = chapters.length > 0 ? Math.round((totalReadCount / chapters.length) * 100) : 0;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen animate-fade-in pb-24 text-paper">
      {/* Sticky bar */}
      <div className="sticky top-0 z-30 border-b border-ink-700 bg-ink-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <button
            onClick={() => setView('home')}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper-dim transition-colors hover:text-paper"
          >
            <ChevronLeft className="h-4 w-4" />
            Index
          </button>

          {details && (
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate font-display text-[12.5px] font-semibold text-paper">
                {details.title}
              </span>
              <span className="tnum shrink-0 border border-ink-700 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-paper-dim">
                {readPercentage}% read
              </span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
          <div className="flex justify-center pb-2">
            <BrandLoader size="sm" label="Opening the file" />
          </div>
          <div className="rounded-lg border border-ink-700 bg-ink-900 p-5 sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="shimmer-skeleton mx-auto aspect-[3/4] w-40 shrink-0 rounded-sm md:mx-0 sm:w-52" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="shimmer-skeleton h-7 w-2/3 rounded-sm" />
                <div className="shimmer-skeleton h-3 w-1/3 rounded-sm" />
                <div className="shimmer-skeleton h-3 w-full rounded-sm" />
                <div className="shimmer-skeleton h-3 w-11/12 rounded-sm" />
                <div className="shimmer-skeleton h-3 w-4/5 rounded-sm" />
                <div className="flex gap-2 pt-3">
                  <div className="shimmer-skeleton h-11 w-32 rounded-md" />
                  <div className="shimmer-skeleton h-11 w-24 rounded-md" />
                </div>
              </div>
            </div>
          </div>
          <div className="shimmer-skeleton h-40 rounded-lg" />
        </div>
      ) : details ? (
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:px-6">
          {/* Series plate */}
          <section className="relative overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
            <div className="pointer-events-none absolute inset-0 bg-grid-lines opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-stamp" />

            <div className="relative z-10 flex flex-col items-start gap-6 p-5 sm:gap-8 sm:p-8 md:flex-row">
              <div className="relative mx-auto w-40 shrink-0 sm:w-52 md:mx-0">
                <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-sm border border-stamp/60" />
                <div className="relative aspect-[3/4] overflow-hidden rounded-sm border border-ink-600 bg-ink-950">
                  <img
                    src={getProxyImageUrl(details.cover)}
                    alt={details.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                    }}
                    className="h-full w-full object-cover object-[center_top]"
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-paper-dim">
                  <span className="text-paper">{details.type || 'Manga'}</span>
                  <span className="text-ink-600">/</span>
                  <span>{details.status || 'Ongoing'}</span>
                  <span className="text-ink-600">/</span>
                  <span className="tnum">{chapters.length} chapters</span>
                  {details.author && (
                    <>
                      <span className="text-ink-600">/</span>
                      <span className="normal-case tracking-normal">by {details.author}</span>
                    </>
                  )}
                </div>

                <h1 className="max-w-[22ch] font-display text-[clamp(1.7rem,5vw,2.7rem)] font-bold leading-[0.98] tracking-tightest text-paper">
                  {details.title}
                </h1>

                {filterSafeTags(details.tags).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {filterSafeTags(details.tags).slice(0, 8).map((tag) => (
                      <span key={tag} className="tag !bg-transparent">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {details.synopsis && (
                  <div className="max-h-40 overflow-y-auto border-l-2 border-stamp/60 pl-3.5 pr-2">
                    <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-paper-dim sm:text-[13px]">
                      {details.synopsis}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {resumeChapter && (
                    <button
                      onClick={() =>
                        openChapter(
                          activeMangaId,
                          resumeChapter.id,
                          resumeChapter.title,
                          details.title,
                          details.cover,
                        )
                      }
                      className="btn btn-stamp"
                    >
                      <BookOpen className="h-4 w-4" />
                      {history ? `Resume ${resumeChapter.title}` : 'Read chapter 1'}
                    </button>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setShelfDropdownOpen(!shelfDropdownOpen)}
                      className={`btn ${
                        bookmarked
                          ? 'border-stamp/60 bg-stamp/10 text-stamp'
                          : 'btn-ghost'
                      }`}
                      aria-expanded={shelfDropdownOpen}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? 'fill-current' : ''}`} />
                      {currentBookmark ? SHELF_LABELS[currentBookmark.category]?.label : 'Add to shelf'}
                      <ChevronDown className="ml-0.5 h-3.5 w-3.5" />
                    </button>

                    {shelfDropdownOpen && (
                      <div className="absolute left-0 top-full z-40 mt-1.5 w-48 space-y-0.5 overflow-hidden rounded-md border border-ink-700 bg-ink-900 p-1 text-xs shadow-2xl animate-fade-in">
                        {(Object.keys(SHELF_LABELS) as BookmarkCategory[]).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              if (!bookmarked) toggleBookmark(details, cat);
                              else setBookmarkCategory(details.id, cat);
                              setShelfDropdownOpen(false);
                            }}
                            className={`flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left transition-colors ${
                              currentBookmark?.category === cat
                                ? 'bg-stamp/10 text-stamp'
                                : 'text-paper-dim hover:bg-ink-800 hover:text-paper'
                            }`}
                          >
                            <span>{SHELF_LABELS[cat].icon}</span>
                            <span>{SHELF_LABELS[cat].label}</span>
                            {currentBookmark?.category === cat && (
                              <Check className="ml-auto h-3 w-3" />
                            )}
                          </button>
                        ))}

                        {bookmarked && (
                          <div className="border-t border-ink-700 pt-1">
                            <button
                              onClick={() => {
                                toggleBookmark(details);
                                setShelfDropdownOpen(false);
                              }}
                              className="w-full rounded-sm px-2.5 py-1.5 text-left text-[11px] text-stamp transition-colors hover:bg-ink-800"
                            >
                              Remove from library
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleCopyLink}
                    className="btn-icon"
                    aria-label="Copy link"
                    title="Copy link"
                  >
                    {copiedLink ? (
                      <Check className="h-4 w-4 text-teal-400" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Chapters */}
          <section className="space-y-4">
            <div className="flex flex-col justify-between gap-3 border-b border-ink-700 pb-2.5 sm:flex-row sm:items-end">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-stamp">01</span>
                <h2 className="font-display text-lg font-semibold text-paper">Chapters</h2>
                <span className="tnum font-mono text-[10px] uppercase tracking-[0.12em] text-paper-dim">
                  {totalReadCount}/{chapters.length} read
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => markMangaAllRead(details.id, chapters.map((c) => c.id))}
                  className="flex h-8 items-center gap-1.5 rounded-sm border border-ink-700 px-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-paper-dim transition-colors hover:border-teal-500/50 hover:text-teal-400"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark all read
                </button>
                <button
                  onClick={() => setSortDescending(!sortDescending)}
                  className="flex h-8 items-center gap-1.5 rounded-sm border border-ink-700 px-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-paper-dim transition-colors hover:border-ink-600 hover:text-paper"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortDescending ? 'Newest' : 'Oldest'}
                </button>
              </div>
            </div>

            {languageKeys.length >= 1 && (
              <div className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-dim">
                    <Globe className="h-3.5 w-3.5" />
                    Editions
                    <span className="text-paper">{languageKeys.length}</span>
                  </span>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-paper-dim">
                    Showing{' '}
                    <strong className="font-semibold text-paper">
                      {selectedLanguage === 'all'
                        ? 'All'
                        : LANGUAGE_META[selectedLanguage]?.label || selectedLanguage.toUpperCase()}
                    </strong>
                  </span>
                </div>

                <div className="no-scrollbar mt-2 flex flex-wrap items-center gap-1.5 overflow-x-auto">
                  {languageKeys.length > 1 && (
                    <button
                      onClick={() => setSelectedLanguage('all')}
                      className="chip"
                      data-active={selectedLanguage === 'all'}
                    >
                      All
                      <span className="tnum opacity-60">{chapters.length}</span>
                    </button>
                  )}

                  {languageKeys.map((lang) => {
                    const meta = LANGUAGE_META[lang] || { label: lang.toUpperCase(), flag: '' };
                    const count = availableLanguages[lang];
                    const isSelected =
                      selectedLanguage === lang ||
                      (languageKeys.length === 1 && selectedLanguage === 'all');
                    return (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className="chip"
                        data-active={isSelected}
                      >
                        {meta.label}
                        <span className="tnum opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-dim" />
                <input
                  type="text"
                  value={chapterFilter}
                  onChange={(e) => setChapterFilter(e.target.value)}
                  placeholder="Find a chapter"
                  aria-label="Filter chapters"
                  className="h-10 w-full rounded-md border border-ink-700 bg-transparent pl-9 pr-3 text-[12.5px] text-paper placeholder:text-paper-dim/60 focus:border-paper-dim focus:outline-none"
                />
              </div>

              {chunksCount > 1 && !chapterFilter && (
                <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
                  {Array.from({ length: chunksCount }).map((_, i) => {
                    const start = i * CHUNK_SIZE + 1;
                    const end = Math.min((i + 1) * CHUNK_SIZE, orderedChapters.length);
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedChunk(i)}
                        className="chip"
                        data-active={selectedChunk === i}
                      >
                        {start}–{end}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setSelectedChunk(-1)}
                    className="chip"
                    data-active={selectedChunk === -1}
                  >
                    All
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayChapters.map((ch, idx) => {
                const isRead = isChapterRead(ch.id);
                const isResume = history?.chapterId === ch.id;

                return (
                  <button
                    key={ch.id}
                    onClick={() =>
                      openChapter(activeMangaId, ch.id, ch.title, details?.title, details?.cover)
                    }
                    className={`group flex items-center justify-between gap-2 border-b border-ink-700 py-2.5 text-left transition-colors ${
                      isResume
                        ? 'bg-stamp/[0.06]'
                        : isRead
                          ? 'text-paper-dim/60 hover:bg-ink-900'
                          : 'hover:bg-ink-900'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="tnum w-5 shrink-0 px-1 font-mono text-[9.5px] text-paper-dim/70">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {isRead ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-teal-400" />
                      ) : (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            isResume ? 'bg-stamp' : 'bg-ink-600 group-hover:bg-paper-dim'
                          }`}
                        />
                      )}
                      <span className="min-w-0">
                        <span
                          className={`block truncate font-display text-[12.5px] font-semibold transition-colors ${
                            isResume
                              ? 'text-stamp'
                              : isRead
                                ? 'text-paper-dim/60'
                                : 'text-paper group-hover:text-stamp'
                          }`}
                        >
                          {ch.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.08em] text-paper-dim/60">
                          {ch.date || 'Undated'}
                          {ch.language && selectedLanguage === 'all' && (
                            <span>· {LANGUAGE_META[ch.language]?.label || ch.language.toUpperCase()}</span>
                          )}
                        </span>
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-2">
                      {isResume && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-stamp">
                          Current
                        </span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-paper-dim transition-transform group-hover:translate-x-0.5 group-hover:text-paper" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        <div className="mx-auto max-w-sm space-y-4 px-4 py-20 text-center">
          <p className="text-[13px] text-paper-dim">This series could not be loaded.</p>
          <button onClick={() => setView('home')} className="btn btn-ghost">
            Back to the index
          </button>
        </div>
      )}
    </div>
  );
};
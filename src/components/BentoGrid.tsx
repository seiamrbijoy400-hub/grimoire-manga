import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { MangaItem, FilterState, BookmarkCategory } from '../types.ts';
import { fetchAdvancedSearch, getProxyImageUrl } from '../services/api.ts';
import { MangaCard } from './MangaCard.tsx';
import { FilterDrawer, TYPE_OPTIONS } from './FilterDrawer.tsx';
import { BrandLoader, SkeletonCard } from './BrandLoader.tsx';
import { useStore } from '../store/useStore.ts';

const FALLBACK_COVER = '/logo.png';

const DEFAULT_FILTERS: FilterState = {
  query: '',
  selectedSource: 'all',
  selectedType: null,
  selectedCountry: null,
  selectedLanguage: null,
  selectedStatus: null,
  includedTags: [],
  excludedTags: [],
  sort: 'Popularity',
  order: 'Descending',
};

const SORT_OPTIONS = [
  { id: 'Popularity', label: 'Popularity' },
  { id: 'Latest Updates', label: 'Latest updates' },
  { id: 'Alphabet', label: 'A–Z' },
  { id: 'Subscribers', label: 'Subscribers' },
];

const originOf = (type?: string, country?: string) => {
  if (type === 'Manhwa' || country === 'KR') return { code: 'KR', label: 'Manhwa', place: 'Korea' };
  if (type === 'Manhua' || country === 'CN') return { code: 'CN', label: 'Manhua', place: 'China' };
  if (type === 'OEL' || country === 'US') return { code: 'EN', label: 'OEL', place: 'Western' };
  return { code: 'JP', label: 'Manga', place: 'Japan' };
};

/** Numbered section header — the spine of the whole page. */
const SectionHead: React.FC<{
  index: string;
  title: string;
  note?: string;
  right?: React.ReactNode;
}> = ({ index, title, note, right }) => (
  <div className="mb-4 flex items-end justify-between gap-4 border-b border-ink-700 pb-2.5">
    <div className="flex items-baseline gap-3">
      <span className="tnum font-mono text-[10px] uppercase tracking-[0.16em] text-stamp">{index}</span>
      <h2 className="font-display text-[17px] font-semibold tracking-tight text-paper sm:text-xl">
        {title}
      </h2>
    </div>
    <div className="flex items-center gap-3">
      {note && (
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-paper-dim sm:block">
          {note}
        </span>
      )}
      {right}
    </div>
  </div>
);

const EmptyState: React.FC<{
  index: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}> = ({ index, title, body, action }) => (
  <div className="relative overflow-hidden rounded-lg border border-ink-700 bg-ink-900 px-6 py-14 text-center">
    <span className="num-ghost pointer-events-none absolute -right-3 -top-6 select-none text-[104px]">
      {index}
    </span>
    <div className="relative mx-auto max-w-sm space-y-3">
      <h3 className="font-display text-base font-semibold text-paper">{title}</h3>
      <p className="text-[13px] leading-relaxed text-paper-dim">{body}</p>
      {action && <div className="pt-1">{action}</div>}
    </div>
  </div>
);

export const BentoGrid: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    bookmarks,
    history,
    clearHistory,
    openManga,
    openChapter,
    exportUserData,
    importUserData,
  } = useStore();

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [items, setItems] = useState<MangaItem[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [heroImageError, setHeroImageError] = useState(false);

  const [selectedShelf, setSelectedShelf] = useState<BookmarkCategory | 'all'>('all');
  const [shelfSearch, setShelfSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  const loadInitialData = useCallback(async () => {
    setLoadingInitial(true);
    setOffset(0);
    setHasMore(true);

    try {
      const data = await fetchAdvancedSearch(filters, 0);
      setItems(data);
      if (data.length < 24) setHasMore(false);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, [filters]);

  useEffect(() => {
    if (activeTab === 'catalog') {
      loadInitialData();
    } else {
      setLoadingInitial(false);
    }
  }, [activeTab, loadInitialData]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || loadingInitial || activeTab !== 'catalog') return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextOffset = offset + 32;

    try {
      const nextBatch = await fetchAdvancedSearch(filters, nextOffset);

      if (nextBatch.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueNew = nextBatch.filter((m) => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
        setOffset(nextOffset);
      }
    } catch (err) {
      console.error('Failed to load more manga:', err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [offset, hasMore, loadingInitial, activeTab, filters]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMoreRef.current) {
          loadMore();
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const historyList = useMemo(
    () => Object.values(history).sort((a, b) => b.updatedAt - a.updatedAt),
    [history],
  );

  const featured = items[0];
  const trendingList = useMemo(() => items.slice(1, 5), [items]);
  const lastRead = historyList[0];

  const activeFiltersCount =
    (filters.selectedSource !== 'all' ? 1 : 0) +
    (filters.selectedType ? 1 : 0) +
    (filters.selectedCountry ? 1 : 0) +
    (filters.selectedLanguage ? 1 : 0) +
    (filters.selectedStatus ? 1 : 0) +
    filters.includedTags.length +
    filters.excludedTags.length;

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      const matchesShelf = selectedShelf === 'all' || b.category === selectedShelf;
      const matchesSearch =
        !shelfSearch || b.title.toLowerCase().includes(shelfSearch.toLowerCase());
      return matchesShelf && matchesSearch;
    });
  }, [bookmarks, selectedShelf, shelfSearch]);

  const handleExport = () => {
    const jsonStr = exportUserData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kurso-scroll-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = importUserData(content);
        alert(success ? 'Library restored.' : 'That file is not a Kurso Scroll backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const now = new Date();
  const issueLabel = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const issueNumber = String(now.getMonth() + 1).padStart(2, '0');

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-5 sm:px-6 sm:pt-8 lg:px-8">
      <FilterDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={(newFilters) => setFilters(newFilters)}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        totalResultsCount={items.length}
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        className="hidden"
      />

      {/* ======================================================== */}
      {/* INDEX                                                   */}
      {/* ======================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-10 sm:space-y-12">
          {/* Issue strip */}
          <div className="flex items-center justify-between border-b border-ink-700 pb-2.5">
            <p className="eyebrow">
              Issue {issueNumber} <span className="px-1.5 text-ink-600">/</span> {issueLabel}
            </p>
            <p className="eyebrow hidden sm:block">Safe archive · No sign-in</p>
          </div>

          {/* Featured plate */}
          {featured && !filters.query && (
            <section aria-label="Editor's pick" className="relative">
              <div className="relative overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
                <div className="pointer-events-none absolute inset-0 bg-grid-lines opacity-60 [mask-image:linear-gradient(to_right,black,transparent_72%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-stamp" />

                <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-start lg:p-10">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="stamp-mark">Feature</span>
                      <span className="eyebrow">
                        {String(items.length).padStart(3, '0')} titles loaded
                      </span>
                    </div>

                    <h1 className="mt-5 max-w-[18ch] font-display text-[clamp(2rem,7vw,3.4rem)] font-bold leading-[0.94] tracking-tightest text-paper">
                      {featured.title}
                    </h1>

                    {featured.description && (
                      <p className="mt-4 line-clamp-3 max-w-[54ch] text-[13.5px] leading-relaxed text-paper-dim sm:text-sm">
                        {featured.description}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-[0.1em] text-paper-dim">
                      <span>{originOf(featured.type, featured.country).code} · {originOf(featured.type, featured.country).label}</span>
                      {featured.status && (
                        <>
                          <span className="text-ink-600">/</span>
                          <span>{featured.status}</span>
                        </>
                      )}
                      {featured.latestChapter && (
                        <>
                          <span className="text-ink-600">/</span>
                          <span>{featured.latestChapter}</span>
                        </>
                      )}
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => openManga(featured.id, featured.title, featured.cover)}
                        className="btn btn-stamp"
                      >
                        <BookOpen className="h-4 w-4" />
                        Read now
                      </button>
                      <button
                        onClick={() => openManga(featured.id, featured.title, featured.cover)}
                        className="btn btn-ghost"
                      >
                        Details
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Plate */}
                  <div className="justify-self-center lg:justify-self-end">
                    <div className="relative w-[180px] sm:w-[210px] lg:w-[232px]">
                      <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 rounded-sm border border-stamp/70" />
                      <div
                        onClick={() => openManga(featured.id, featured.title, featured.cover)}
                        className="relative aspect-[3/4] cursor-pointer overflow-hidden rounded-sm border border-ink-600 bg-ink-950"
                      >
                        <img
                          src={heroImageError ? FALLBACK_COVER : getProxyImageUrl(featured.cover)}
                          alt={featured.title}
                          onError={() => setHeroImageError(true)}
                          className="h-full w-full object-cover object-center"
                          loading="eager"
                        />
                      </div>
                      <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-paper-dim">
                        Cover plate · Vol. 01
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Continue reading */}
          {lastRead && (
            <section aria-label="Continue reading">
              <SectionHead index="01" title="Pick up where you left off" note={formatRelativeTime(lastRead.updatedAt)} />
              <div
                onClick={() =>
                  openChapter(
                    lastRead.mangaId,
                    lastRead.chapterId,
                    lastRead.chapterTitle,
                    lastRead.mangaTitle,
                    lastRead.mangaCover,
                  )
                }
                className="card-flat group flex cursor-pointer flex-col gap-4 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-[86px] w-16 shrink-0 overflow-hidden rounded-sm border border-ink-700 bg-ink-950">
                    <img
                      src={lastRead.mangaCover || FALLBACK_COVER}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-stamp">
                      In progress
                    </span>
                    <h3 className="truncate font-display text-[15px] font-semibold text-paper">
                      {lastRead.mangaTitle}
                    </h3>
                    <p className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-paper-dim">
                      {lastRead.chapterTitle}
                      {lastRead.totalImages
                        ? ` · ${lastRead.pageIndex || 1}/${lastRead.totalImages}`
                        : ''}
                    </p>
                    {lastRead.totalImages ? (
                      <div className="h-[3px] w-40 overflow-hidden bg-ink-750">
                        <div
                          className="h-full bg-stamp"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((lastRead.pageIndex || 1) / lastRead.totalImages) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <span className="btn btn-stamp self-stretch sm:self-auto">
                  Resume
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </section>
          )}

          {/* Trending */}
          {trendingList.length > 0 && !filters.query && (
            <section aria-label="Trending">
              <SectionHead
                index={lastRead ? '02' : '01'}
                title="Trending this week"
                note="Most opened titles"
              />
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4">
                {trendingList.map((manga, idx) => (
                  <MangaCard key={manga.id} manga={manga} rank={idx + 1} />
                ))}
              </div>
            </section>
          )}

          {/* Archive */}
          <section aria-label="The archive" className="space-y-4">
            <SectionHead
              index={lastRead ? '03' : '02'}
              title="The archive"
              note={`${items.length} titles loaded`}
            />

            {/* Controls */}
            <div className="flex flex-col gap-3">
              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setFilters({ ...filters, selectedType: null })}
                  className="chip"
                  data-active={filters.selectedType === null}
                >
                  All
                </button>
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        selectedType: filters.selectedType === t.id ? null : t.id,
                      })
                    }
                    className="chip"
                    data-active={filters.selectedType === t.id}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative">
                  <span className="sr-only">Sort titles</span>
                  <select
                    value={filters.sort}
                    onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                    className="h-9 appearance-none rounded-md border border-ink-700 bg-transparent pl-3 pr-8 font-mono text-[10px] uppercase tracking-[0.12em] text-paper-dim transition-colors hover:border-ink-600 focus:border-paper focus:outline-none"
                  >
                    {SORT_OPTIONS.map((s) => (
                      <option key={s.id} value={s.id} className="bg-ink-900 text-paper">
                        Sort: {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-paper-dim" />
                </label>

                <button
                  onClick={() => setDrawerOpen(true)}
                  className="flex h-9 items-center gap-2 rounded-md border border-ink-700 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-paper-dim transition-colors hover:border-ink-600 hover:text-paper"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="tnum flex h-4 min-w-4 items-center justify-center rounded-sm bg-stamp px-1 text-[9px] font-semibold text-ink-950">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="h-9 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper-dim underline underline-offset-4 hover:text-paper"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Active filter ledger */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {filters.selectedCountry && (
                  <FilterTag
                    label={`Country: ${filters.selectedCountry}`}
                    onRemove={() => setFilters({ ...filters, selectedCountry: null })}
                  />
                )}
                {filters.selectedLanguage && (
                  <FilterTag
                    label={`Lang: ${filters.selectedLanguage.toUpperCase()}`}
                    onRemove={() => setFilters({ ...filters, selectedLanguage: null })}
                  />
                )}
                {filters.selectedType && (
                  <FilterTag
                    label={`Format: ${filters.selectedType}`}
                    onRemove={() => setFilters({ ...filters, selectedType: null })}
                  />
                )}
                {filters.selectedStatus && (
                  <FilterTag
                    label={`Status: ${filters.selectedStatus}`}
                    onRemove={() => setFilters({ ...filters, selectedStatus: null })}
                  />
                )}
                {filters.includedTags.map((tag) => (
                  <FilterTag
                    key={tag}
                    label={`+ ${tag}`}
                    onRemove={() =>
                      setFilters({
                        ...filters,
                        includedTags: filters.includedTags.filter((t) => t !== tag),
                      })
                    }
                  />
                ))}
                {filters.excludedTags.map((tag) => (
                  <FilterTag
                    key={`x-${tag}`}
                    label={`− ${tag}`}
                    onRemove={() =>
                      setFilters({
                        ...filters,
                        excludedTags: filters.excludedTags.filter((t) => t !== tag),
                      })
                    }
                  />
                ))}
              </div>
            )}

            {/* Grid */}
            {loadingInitial ? (
              <div className="space-y-8">
                <div className="flex justify-center pt-2">
                  <BrandLoader size="sm" label="Opening the index" />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                index="00"
                title="Nothing matches those filters"
                body="The index returned no titles for this combination. Clear a filter or two and try again."
                action={
                  <button onClick={() => setFilters(DEFAULT_FILTERS)} className="btn btn-stamp">
                    Reset filters
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {items.map((manga) => (
                  <MangaCard key={manga.id} manga={manga} />
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="space-y-4 pt-4 text-center">
                <div ref={observerTarget} className="h-4" />
                {loadingMore ? (
                  <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-dim">
                    <Loader2 className="h-4 w-4 animate-spin text-stamp" />
                    Pulling the next sheet
                  </div>
                ) : hasMore ? (
                  <button onClick={loadMore} className="btn btn-ghost">
                    Load more
                  </button>
                ) : (
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-dim/70">
                    End of the index · {items.length} titles
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ======================================================== */}
      {/* LIBRARY                                                 */}
      {/* ======================================================== */}
      {activeTab === 'bookmarks' && (
        <section className="space-y-6" aria-label="Library">
          <SectionHead
            index="01"
            title="Library"
            note={`${bookmarks.length} saved`}
            right={
              <div className="flex items-center gap-1">
                <button onClick={handleExport} className="btn-icon !h-9 !w-9" aria-label="Export library">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-icon !h-9 !w-9"
                  aria-label="Import library"
                >
                  <Upload className="h-3.5 w-3.5" />
                </button>
              </div>
            }
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
              {(['all', 'reading', 'plan', 'completed', 'favorites'] as const).map((cat) => {
                const count =
                  cat === 'all' ? bookmarks.length : bookmarks.filter((b) => b.category === cat).length;
                const label =
                  cat === 'all'
                    ? 'All'
                    : cat === 'plan'
                      ? 'Plan to read'
                      : cat.charAt(0).toUpperCase() + cat.slice(1);
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedShelf(cat)}
                    className="chip"
                    data-active={selectedShelf === cat}
                  >
                    {label}
                    <span className="tnum opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="w-full sm:w-60">
              <input
                type="search"
                placeholder="Search saved titles"
                value={shelfSearch}
                onChange={(e) => setShelfSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-ink-700 bg-transparent px-3 text-[12px] text-paper placeholder:text-paper-dim/60 focus:border-paper-dim focus:outline-none"
              />
            </div>
          </div>

          {filteredBookmarks.length === 0 ? (
            <EmptyState
              index="00"
              title="No titles on this shelf"
              body="Save a cover from the index and it lands here. Your library is stored on this device only."
              action={
                <button onClick={() => setActiveTab('catalog')} className="btn btn-stamp">
                  Browse the index
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredBookmarks.map((b) => (
                <MangaCard
                  key={b.id}
                  manga={{ id: b.id, title: b.title, cover: b.cover, source: b.source }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* HISTORY                                                 */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <section className="space-y-6" aria-label="Reading history">
          <SectionHead
            index="01"
            title="Reading history"
            note={`${historyList.length} entries`}
            right={
              historyList.length > 0 ? (
                <button
                  onClick={() => {
                    if (confirm('Clear all reading history?')) clearHistory();
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-md border border-ink-700 px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper-dim transition-colors hover:border-stamp/60 hover:text-stamp"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              ) : undefined
            }
          />

          {historyList.length === 0 ? (
            <EmptyState
              index="00"
              title="Nothing read yet"
              body="Chapters you open are logged here with your exact page, so you can pick the thread back up on any device with the same browser."
              action={
                <button onClick={() => setActiveTab('catalog')} className="btn btn-stamp">
                  Find something to read
                </button>
              }
            />
          ) : (
            <ol className="divide-y divide-ink-700 border-y border-ink-700">
              {historyList.map((hist, i) => (
                <li key={`${hist.mangaId}-${hist.chapterId}`}>
                  <button
                    onClick={() =>
                      openChapter(
                        hist.mangaId,
                        hist.chapterId,
                        hist.chapterTitle,
                        hist.mangaTitle,
                        hist.mangaCover,
                      )
                    }
                    className="group flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-ink-900/60"
                  >
                    <span className="tnum hidden w-6 shrink-0 font-mono text-[10px] text-paper-dim sm:block">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <img
                      src={hist.mangaCover || FALLBACK_COVER}
                      alt=""
                      className="h-16 w-12 shrink-0 rounded-sm border border-ink-700 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-[13.5px] font-semibold text-paper group-hover:text-stamp">
                        {hist.mangaTitle}
                      </h3>
                      <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-paper-dim">
                        {hist.chapterTitle} · page {hist.pageIndex || 1}
                      </p>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-paper-dim/70">
                        {new Date(hist.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-paper-dim transition-transform group-hover:translate-x-0.5 group-hover:text-paper" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {/* Back to top */}
      {showBackToTop && !filters.query && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-ink-600 bg-ink-900/95 text-paper shadow-lg backdrop-blur sm:bottom-6 sm:right-6"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

const FilterTag: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-sm border border-ink-700 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-paper-dim">
    {label}
    <button onClick={onRemove} className="text-paper-dim hover:text-stamp" aria-label={`Remove ${label}`}>
      <X className="h-3 w-3" />
    </button>
  </span>
);

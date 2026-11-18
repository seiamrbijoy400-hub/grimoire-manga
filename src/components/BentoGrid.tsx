import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Flame,
  Clock,
  Bookmark,
  BookOpen,
  Compass,
  ChevronRight,
  Loader2,
  ArrowUp,
  Filter,
  Search,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Check,
  X,
  Globe,
  SlidersHorizontal,
  Sparkles
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
  { id: 'Latest Updates', label: 'Latest Updates' },
  { id: 'Alphabet', label: 'Alphabetical' },
  { id: 'Subscribers', label: 'Subscribers' },
];

export const BentoGrid: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    bookmarks,
    history,
    clearHistory,
    openManga,
    openChapter,
    setSearchOpen,
    exportUserData,
    importUserData,
  } = useStore();

  // Advanced Filter state
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Items & pagination state for catalog
  const [items, setItems] = useState<MangaItem[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [heroImageError, setHeroImageError] = useState(false);

  // Shelves state
  const [selectedShelf, setSelectedShelf] = useState<BookmarkCategory | 'all'>('all');
  const [shelfSearch, setShelfSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  // Load initial batch when filters change
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

  // Load more for infinite scroll
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

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMoreRef.current) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  // Back to top scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const historyList = useMemo(() => {
    return Object.values(history).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [history]);

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

  // Filtered bookmarks by shelf & search
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      const matchesShelf = selectedShelf === 'all' || b.category === selectedShelf;
      const matchesSearch = !shelfSearch || b.title.toLowerCase().includes(shelfSearch.toLowerCase());
      return matchesShelf && matchesSearch;
    });
  }, [bookmarks, selectedShelf, shelfSearch]);

  // Handle export JSON
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

  // Handle import JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = importUserData(content);
        if (success) {
          alert('Library & reading history restored successfully.');
        } else {
          alert('Invalid backup JSON file.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getOriginLabel = (type?: string, country?: string) => {
    if (type === 'Manhwa' || country === 'KR') return { flag: '🇰🇷', label: 'Manhwa', origin: 'Korea' };
    if (type === 'Manhua' || country === 'CN') return { flag: '🇨🇳', label: 'Manhua', origin: 'China' };
    if (type === 'OEL' || country === 'US') return { flag: '🌐', label: 'Global', origin: 'Western' };
    return { flag: '🇯🇵', label: 'Manga', origin: 'Japan' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16 pb-28">
      {/* Filter Drawer Component */}
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
      {/* PRIMARY TAB: DISCOVER / ARCHIVE (3-SECTION EXPERIENCE)   */}
      {/* ======================================================== */}
      {activeTab === 'catalog' && (
        <>
          {/* ==================================================== */}
          {/* SECTION 01 — DISCOVER                                */}
          {/* ==================================================== */}
          <section className="space-y-8" aria-label="Discover Section">
            {/* Featured Editorial Hero */}
            {featured && !filters.query && (
              <div className="relative rounded-2xl overflow-hidden bg-[#111318] border border-[#C69A45]/20 shadow-[0_30px_90px_-45px_rgba(198,154,69,0.55)] animate-fade-in">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C69A45]/70 to-transparent pointer-events-none z-20" />
                {/* Ambient artistic backdrop */}
                <div
                  className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: `url(${heroImageError ? FALLBACK_COVER : getProxyImageUrl(featured.cover)})`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#090A0C] via-[#090A0C]/90 to-transparent pointer-events-none" />

                <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col-reverse md:flex-row items-center justify-between gap-8 lg:gap-12">
                  {/* Left Editorial Copy */}
                  <div className="w-full md:w-3/5 space-y-4 text-left">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded bg-[#191A1F] border border-[#C69A45]/30 text-[10px] font-mono uppercase tracking-widest text-[#C69A45] font-semibold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C69A45] animate-pulse" />
                        Editorial Feature • Vol. 2026
                      </span>
                      {(() => {
                        const origin = getOriginLabel(featured.type, featured.country);
                        return (
                          <span className="px-2.5 py-1 rounded bg-[#191A1F] border border-[#292A2D] text-[10px] font-mono text-[#AAA69D] flex items-center gap-1.5">
                            <span>{origin.flag}</span>
                            <span>{origin.origin} • {origin.label}</span>
                          </span>
                        );
                      })()}
                      {featured.status && (
                        <span className="px-2.5 py-1 rounded bg-[#191A1F] border border-[#292A2D] text-[10px] font-mono text-[#AAA69D] flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${featured.status.toLowerCase() === 'ongoing' ? 'bg-[#42B8A8]' : 'bg-[#AAA69D]'}`} />
                          <span>{featured.status}</span>
                        </span>
                      )}
                    </div>

                    <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F0E9DC] tracking-tight leading-tight">
                      {featured.title}
                    </h1>

                    {featured.description && (
                      <p className="text-sm sm:text-base text-[#AAA69D] leading-relaxed line-clamp-3 max-w-2xl font-sans">
                        {featured.description}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => openManga(featured.id, featured.title, featured.cover)}
                        className="px-6 py-3 rounded-lg bg-[#C69A45] hover:bg-[#D8AA55] text-[#090A0C] font-semibold text-sm transition-all shadow-lg shadow-[#C69A45]/15 flex items-center gap-2"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Start Reading</span>
                      </button>

                      <button
                        onClick={() => openManga(featured.id, featured.title, featured.cover)}
                        className="px-5 py-3 rounded-lg bg-[#191A1F] hover:bg-[#21232A] border border-[#292A2D] text-xs font-medium text-[#F0E9DC] transition-all"
                      >
                        View Chronicle Details
                      </button>
                    </div>
                  </div>

                  {/* Right Artwork Showcase */}
                  <div
                    onClick={() => openManga(featured.id, featured.title, featured.cover)}
                    className="w-44 sm:w-56 md:w-64 aspect-[3/4] rounded-lg overflow-hidden shadow-2xl border border-[#C69A45]/25 shrink-0 cursor-pointer hover:scale-[1.03] transition-transform duration-500 bg-[#111318] animate-float-slow glow-gold"
                  >
                    <img
                      src={heroImageError ? FALLBACK_COVER : getProxyImageUrl(featured.cover)}
                      alt={featured.title}
                      onError={() => setHeroImageError(true)}
                      className="w-full h-full object-cover object-center"
                      loading="eager"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Trending This Week (Compact recommendations below hero) */}
            {trendingList.length > 0 && !filters.query && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#292A2D] pb-3">
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-[#F0E9DC]">
                      Trending This Week
                    </h2>
                    <p className="text-xs text-[#AAA69D] font-sans">
                      Top curated works experiencing high community readership
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {trendingList.map((manga, idx) => (
                    <MangaCard key={manga.id} manga={manga} rank={idx + 2} />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ==================================================== */}
          {/* SECTION 02 — THE READER'S DESK                       */}
          {/* ==================================================== */}
          <section className="space-y-6 pt-2" aria-label="Reader's Desk Section">
            <div className="flex items-center justify-between border-b border-[#292A2D] pb-3">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#F0E9DC]">
                  The Reader's Desk
                </h2>
                <p className="text-xs text-[#AAA69D] font-sans">
                  Reading continuity, saved bookmarks & latest updates
                </p>
              </div>

              {historyList.length > 0 && (
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs text-[#C69A45] hover:underline font-sans flex items-center gap-1"
                >
                  <span>View All Chronicles</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Primary Continue Reading Panel */}
            {lastRead ? (
              <div
                onClick={() =>
                  openChapter(
                    lastRead.mangaId,
                    lastRead.chapterId,
                    lastRead.chapterTitle,
                    lastRead.mangaTitle,
                    lastRead.mangaCover
                  )
                }
                className="p-4 sm:p-6 rounded-xl bg-[#111318] border border-[#292A2D] hover:border-[#C69A45]/40 transition-all duration-300 cursor-pointer group shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 sm:gap-6 min-w-0 w-full sm:w-auto">
                  <div className="w-16 sm:w-20 aspect-[3/4] rounded-lg overflow-hidden bg-[#090A0C] shrink-0 border border-[#292A2D]">
                    <img
                      src={lastRead.mangaCover || FALLBACK_COVER}
                      alt={lastRead.mangaTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="space-y-1.5 truncate">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#C69A45]" />
                      <span className="text-[10px] uppercase font-mono tracking-wider text-[#C69A45] font-semibold">
                        Continue Reading
                      </span>
                      <span className="text-[10px] text-[#AAA69D] font-mono">
                        • {formatRelativeTime(lastRead.updatedAt)}
                      </span>
                    </div>

                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#F0E9DC] truncate group-hover:text-[#C69A45] transition-colors">
                      {lastRead.mangaTitle}
                    </h3>

                    <p className="text-xs text-[#AAA69D] font-mono">
                      {lastRead.chapterTitle} • Page {lastRead.pageIndex || 1}
                      {lastRead.totalImages ? ` of ${lastRead.totalImages}` : ''}
                    </p>

                    {/* Progress Bar */}
                    {lastRead.totalImages && lastRead.totalImages > 0 && (
                      <div className="w-48 h-1 bg-[#191A1F] rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-[#C69A45] rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((lastRead.pageIndex || 1) / lastRead.totalImages) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C69A45] text-[#090A0C] text-xs font-semibold group-hover:bg-[#D8AA55] transition-all shrink-0 self-end sm:self-center shadow-md">
                  <span>Resume Reading</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-[#111318] border border-[#292A2D] text-center space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#191A1F] border border-[#292A2D] flex items-center justify-center mx-auto text-[#C69A45]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-base font-bold text-[#F0E9DC]">
                  Your Reading Desk is Clear
                </h3>
                <p className="text-xs text-[#AAA69D] max-w-md mx-auto leading-relaxed">
                  Select any volume from the archive below or begin with this week's editorial feature to start tracking your reading journey.
                </p>
              </div>
            )}

            {/* Recently Visited Shelves (if multiple history items exist) */}
            {historyList.length > 1 && (
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[#AAA69D]">
                  Recently Read Volumes
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {historyList.slice(1, 6).map((hist) => (
                    <div
                      key={hist.mangaId}
                      onClick={() =>
                        openChapter(
                          hist.mangaId,
                          hist.chapterId,
                          hist.chapterTitle,
                          hist.mangaTitle,
                          hist.mangaCover
                        )
                      }
                      className="p-2.5 rounded-lg bg-[#111318] border border-[#292A2D] hover:border-[#C69A45]/40 transition-colors cursor-pointer group flex items-center gap-3"
                    >
                      <img
                        src={hist.mangaCover || FALLBACK_COVER}
                        alt=""
                        className="w-10 h-13 rounded object-cover shrink-0 bg-[#090A0C] border border-[#292A2D]"
                      />
                      <div className="min-w-0">
                        <h4 className="font-serif text-xs font-bold text-[#F0E9DC] truncate group-hover:text-[#C69A45] transition-colors">
                          {hist.mangaTitle}
                        </h4>
                        <p className="text-[10px] text-[#AAA69D] font-mono truncate">
                          {hist.chapterTitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ==================================================== */}
          {/* SECTION 03 — THE ARCHIVE                             */}
          {/* ==================================================== */}
          <section className="space-y-6 pt-4" aria-label="Explore the Archive Section">
            {/* Header & Controls Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#292A2D] pb-4">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#F0E9DC]">
                  Explore the Archive
                </h2>
                <p className="text-xs text-[#AAA69D] font-sans">
                  The curated catalog of international graphic literature
                </p>
              </div>

              {/* Filter Controls & Origin Selector */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Origin Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setFilters({ ...filters, selectedType: null })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-sans transition-all shrink-0 ${
                      filters.selectedType === null
                        ? 'bg-[#191A1F] text-[#C69A45] border border-[#C69A45]/40 font-semibold'
                        : 'bg-[#111318] text-[#AAA69D] hover:text-[#F0E9DC] border border-[#292A2D]'
                    }`}
                  >
                    All Origins
                  </button>

                  {TYPE_OPTIONS.map((t) => {
                    const isSelected = filters.selectedType === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setFilters({ ...filters, selectedType: isSelected ? null : t.id })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-sans flex items-center gap-1.5 transition-all shrink-0 ${
                          isSelected
                            ? 'bg-[#191A1F] text-[#C69A45] border border-[#C69A45]/40 font-semibold'
                            : 'bg-[#111318] text-[#AAA69D] hover:text-[#F0E9DC] border border-[#292A2D]'
                        }`}
                      >
                        <span>{t.flag}</span>
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="h-4 w-px bg-[#292A2D] hidden md:block" />

                {/* Sort Dropdown */}
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                  className="px-3 py-1.5 rounded-lg bg-[#111318] border border-[#292A2D] text-xs text-[#AAA69D] focus:outline-none focus:border-[#C69A45]/60 cursor-pointer font-sans"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#111318] text-[#F0E9DC]">
                      Sort: {s.label}
                    </option>
                  ))}
                </select>

                {/* Filter Drawer Trigger */}
                <button
                  onClick={() => setDrawerOpen(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-sans flex items-center gap-1.5 transition-all border ${
                    activeFiltersCount > 0
                      ? 'bg-[#191A1F] border-[#C69A45] text-[#C69A45] font-semibold'
                      : 'bg-[#111318] border-[#292A2D] text-[#AAA69D] hover:text-[#F0E9DC]'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#C69A45] text-[#090A0C] text-[10px] flex items-center justify-center font-mono font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Active Filter Badges */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-mono text-[#AAA69D]">Active Filters:</span>

                {filters.selectedCountry && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#191A1F] border border-[#292A2D] text-xs text-[#C69A45]">
                    <span>Country: {filters.selectedCountry}</span>
                    <button
                      onClick={() => setFilters({ ...filters, selectedCountry: null })}
                      className="hover:text-[#F0E9DC]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.selectedLanguage && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#191A1F] border border-[#292A2D] text-xs text-[#C69A45]">
                    <span>Lang: {filters.selectedLanguage.toUpperCase()}</span>
                    <button
                      onClick={() => setFilters({ ...filters, selectedLanguage: null })}
                      className="hover:text-[#F0E9DC]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.selectedType && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#191A1F] border border-[#292A2D] text-xs text-[#C69A45]">
                    <span>Origin: {filters.selectedType}</span>
                    <button
                      onClick={() => setFilters({ ...filters, selectedType: null })}
                      className="hover:text-[#F0E9DC]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.selectedStatus && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#191A1F] border border-[#292A2D] text-xs text-[#C69A45]">
                    <span>Status: {filters.selectedStatus}</span>
                    <button
                      onClick={() => setFilters({ ...filters, selectedStatus: null })}
                      className="hover:text-[#F0E9DC]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.includedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#191A1F] border border-[#292A2D] text-xs text-[#F0E9DC]"
                  >
                    <span>+{tag}</span>
                    <button
                      onClick={() =>
                        setFilters({
                          ...filters,
                          includedTags: filters.includedTags.filter((t) => t !== tag),
                        })
                      }
                      className="hover:text-[#C69A45]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="text-xs text-[#AAA69D] hover:text-[#C69A45] underline ml-2 font-mono"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Archive Catalogue Grid */}
            {loadingInitial ? (
              <div className="space-y-8">
                <div className="flex justify-center pt-2">
                  <BrandLoader size="sm" label="Unrolling the archive" sublabel="Fetching the newest folios" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 space-y-4 rounded-xl bg-[#111318] border border-[#292A2D]">
                <div className="w-12 h-12 rounded-lg bg-[#191A1F] border border-[#292A2D] flex items-center justify-center mx-auto text-[#AAA69D]">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold text-[#F0E9DC]">
                  No Archive Records Found
                </h3>
                <p className="text-xs text-[#AAA69D] max-w-md mx-auto">
                  No works match your current filter parameters. Try broadening your criteria or reset the search filters.
                </p>
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="px-4 py-2 rounded-lg bg-[#C69A45] text-[#090A0C] font-semibold text-xs hover:bg-[#D8AA55] transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {items.map((manga) => (
                  <MangaCard key={manga.id} manga={manga} />
                ))}
              </div>
            )}

            {/* Pagination & Infinite Scroll Indicator */}
            {items.length > 0 && (
              <div className="pt-8 text-center space-y-4">
                <div ref={observerTarget} className="h-4" />

                {loadingMore ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#AAA69D] font-mono">
                    <Loader2 className="w-4 h-4 text-[#C69A45] animate-spin" />
                    <span>Loading next archive folio...</span>
                  </div>
                ) : hasMore ? (
                  <button
                    onClick={loadMore}
                    className="px-6 py-2.5 rounded-lg bg-[#111318] hover:bg-[#191A1F] border border-[#292A2D] hover:border-[#C69A45]/40 text-xs font-medium text-[#F0E9DC] transition-all"
                  >
                    Load More Titles ({items.length} loaded)
                  </button>
                ) : (
                  <p className="text-xs text-[#AAA69D]/60 font-mono">
                    End of current archive folio • {items.length} titles
                  </p>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MY LIBRARY (PERSONAL SHELVES)                     */}
      {/* ======================================================== */}
      {activeTab === 'bookmarks' && (
        <section className="space-y-6" aria-label="My Library Section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292A2D] pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#F0E9DC]">
                My Personal Library
              </h2>
              <p className="text-xs text-[#AAA69D] font-sans">
                Organized reading shelves, bookmarks & personal archives
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="px-3 py-1.5 rounded-lg bg-[#111318] hover:bg-[#191A1F] border border-[#292A2D] text-xs text-[#AAA69D] hover:text-[#F0E9DC] flex items-center gap-1.5 transition-colors"
                title="Export Library JSON"
              >
                <Download className="w-3.5 h-3.5 text-[#C69A45]" />
                <span>Backup</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-[#111318] hover:bg-[#191A1F] border border-[#292A2D] text-xs text-[#AAA69D] hover:text-[#F0E9DC] flex items-center gap-1.5 transition-colors"
                title="Restore Library JSON"
              >
                <Upload className="w-3.5 h-3.5 text-[#C69A45]" />
                <span>Restore</span>
              </button>
            </div>
          </div>

          {/* Shelves Selector & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['all', 'reading', 'plan', 'completed', 'favorites'] as const).map((cat) => {
                const count =
                  cat === 'all'
                    ? bookmarks.length
                    : bookmarks.filter((b) => b.category === cat).length;
                const isSelected = selectedShelf === cat;
                const label = cat === 'all' ? 'All' : cat === 'plan' ? 'Plan to Read' : cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedShelf(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-sans capitalize transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#191A1F] text-[#C69A45] border border-[#C69A45]/40 font-semibold'
                        : 'bg-[#111318] text-[#AAA69D] hover:text-[#F0E9DC] border border-[#292A2D]'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] font-mono opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search saved volumes..."
                value={shelfSearch}
                onChange={(e) => setShelfSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#111318] border border-[#292A2D] text-xs text-[#F0E9DC] placeholder-[#AAA69D]/50 focus:outline-none focus:border-[#C69A45]/60"
              />
            </div>
          </div>

          {/* Bookmarks Grid */}
          {filteredBookmarks.length === 0 ? (
            <div className="text-center py-16 space-y-3 rounded-xl bg-[#111318] border border-[#292A2D]">
              <Bookmark className="w-8 h-8 text-[#AAA69D] mx-auto" />
              <h3 className="font-serif text-base font-bold text-[#F0E9DC]">
                No Volumes on this Shelf
              </h3>
              <p className="text-xs text-[#AAA69D] max-w-sm mx-auto">
                Explore the archive catalogue and use the bookmark icon on any manga card to organize your personal reading library.
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="px-4 py-2 rounded-lg bg-[#C69A45] text-[#090A0C] font-semibold text-xs hover:bg-[#D8AA55] transition-colors"
              >
                Browse Archive
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {filteredBookmarks.map((b) => (
                <MangaCard
                  key={b.id}
                  manga={{
                    id: b.id,
                    title: b.title,
                    cover: b.cover,
                    source: b.source,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* TAB 3: READING HISTORY (CHRONICLES)                      */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <section className="space-y-6" aria-label="Reading History Section">
          <div className="flex items-center justify-between border-b border-[#292A2D] pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#F0E9DC]">
                Reading History
              </h2>
              <p className="text-xs text-[#AAA69D] font-sans">
                Timeline of all read chapters and current page continuity
              </p>
            </div>

            {historyList.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all reading history records?')) clearHistory();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#111318] hover:bg-rose-950/40 border border-[#292A2D] hover:border-rose-800 text-xs text-[#AAA69D] hover:text-rose-400 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {historyList.length === 0 ? (
            <div className="text-center py-16 space-y-3 rounded-xl bg-[#111318] border border-[#292A2D]">
              <Clock className="w-8 h-8 text-[#AAA69D] mx-auto" />
              <h3 className="font-serif text-base font-bold text-[#F0E9DC]">
                No History Recorded
              </h3>
              <p className="text-xs text-[#AAA69D] max-w-sm mx-auto">
                As you read chapters, your progress and last-viewed pages will be systematically logged here for effortless continuity.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((hist) => (
                <div
                  key={`${hist.mangaId}-${hist.chapterId}`}
                  onClick={() =>
                    openChapter(
                      hist.mangaId,
                      hist.chapterId,
                      hist.chapterTitle,
                      hist.mangaTitle,
                      hist.mangaCover
                    )
                  }
                  className="p-4 rounded-xl bg-[#111318] border border-[#292A2D] hover:border-[#C69A45]/40 transition-all cursor-pointer group flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={hist.mangaCover || FALLBACK_COVER}
                      alt=""
                      className="w-12 h-16 rounded object-cover shrink-0 bg-[#090A0C] border border-[#292A2D]"
                    />
                    <div className="min-w-0 space-y-1">
                      <h4 className="font-serif text-sm font-bold text-[#F0E9DC] truncate group-hover:text-[#C69A45] transition-colors">
                        {hist.mangaTitle}
                      </h4>
                      <p className="text-xs text-[#C69A45] font-mono">
                        {hist.chapterTitle} • Page {hist.pageIndex || 1}
                      </p>
                      <p className="text-[10px] text-[#AAA69D] font-mono">
                        {new Date(hist.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191A1F] border border-[#292A2D] text-xs font-sans text-[#F0E9DC] group-hover:bg-[#C69A45] group-hover:text-[#090A0C] transition-all shrink-0">
                    <span>Continue</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-[#111318] border border-[#292A2D] text-[#C69A45] shadow-2xl hover:border-[#C69A45] transition-all z-30"
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

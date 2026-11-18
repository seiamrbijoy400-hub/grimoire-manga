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
  Sparkles,
  Search,
  Check,
  X,
  Layers,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import { MangaItem, FilterState, BookmarkCategory, MangaSource } from '../types.ts';
import { fetchAdvancedSearch } from '../services/api.ts';
import { MangaCard } from './MangaCard.tsx';
import { FilterDrawer, TYPE_OPTIONS } from './FilterDrawer.tsx';
import { useStore } from '../store/useStore.ts';

const DEFAULT_FILTERS: FilterState = {
  query: '',
  selectedSource: 'all',
  selectedType: null,
  selectedStatus: null,
  includedTags: [],
  excludedTags: [],
  sort: 'Popularity',
  order: 'Descending',
};

const SORT_OPTIONS = [
  { id: 'Popularity', label: '🔥 Popularity' },
  { id: 'Latest Updates', label: '⚡ Latest Updates' },
  { id: 'Alphabet', label: '🔤 Alphabet' },
  { id: 'Subscribers', label: '⭐ Subscribed' },
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
      { rootMargin: '500px' }
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
  const lastRead = historyList[0];

  const activeFiltersCount =
    (filters.selectedSource !== 'all' ? 1 : 0) +
    (filters.selectedType ? 1 : 0) +
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
    a.download = `kuroscroll-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
          alert('Personal shelves & reading continuity successfully restored!');
        } else {
          alert('Failed to parse backup JSON file.');
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24">
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
      {/* TAB 1: CODEX CATALOG VIEW                                */}
      {/* ======================================================== */}
      {activeTab === 'catalog' && (
        <>
          {/* Dual-Source Engine Selector Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-void-900 border border-void-750 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider pl-1 hidden sm:inline">
                Data Stream:
              </span>

              {/* Source Switcher Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setFilters({ ...filters, selectedSource: 'all' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                    filters.selectedSource === 'all'
                      ? 'bg-solar-500 text-void-950 shadow-md shadow-solar-500/20'
                      : 'bg-void-950 text-slate-400 hover:text-slate-200 border border-void-750'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Unified Matrix</span>
                </button>

                <button
                  onClick={() => setFilters({ ...filters, selectedSource: 'weebcentral' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                    filters.selectedSource === 'weebcentral'
                      ? 'bg-solar-500 text-void-950 shadow-md shadow-solar-500/20'
                      : 'bg-void-950 text-slate-400 hover:text-solar-400 border border-void-750'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>WeebCentral Stream</span>
                </button>

                <button
                  onClick={() => setFilters({ ...filters, selectedSource: 'mangadex' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                    filters.selectedSource === 'mangadex'
                      ? 'bg-telemetry-cyan text-void-950 shadow-md shadow-telemetry-cyan/20'
                      : 'bg-void-950 text-slate-400 hover:text-telemetry-cyan border border-void-750'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-telemetry-cyan" />
                  <span>MangaDex Safe Vault</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 hidden md:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Upstream Bypass Active</span>
            </div>
          </div>

          {/* Futuristic Editorial Hero Showcase */}
          {featured && !filters.query && (
            <div className="relative rounded-3xl overflow-hidden bg-void-900 border border-void-700/70 p-6 sm:p-8 shadow-2xl group">
              <div className="absolute inset-0 bg-gradient-to-r from-void-950 via-void-950/90 to-void-950/30 z-10" />

              <div
                className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-25 group-hover:opacity-40 transition-opacity"
                style={{ backgroundImage: `url(${featured.cover})` }}
              />

              <div className="relative z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-2xl space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-solar-400 to-amber-600 text-void-950 text-xs font-serif font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      {filters.selectedType ? `${filters.selectedType} Pinnacle` : '#1 Ranked Masterpiece'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {featured.source === 'mangadex' ? 'MangaDex Safe Vault' : 'WeebCentral Stream'}
                    </span>
                  </div>

                  <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
                    {featured.title}
                  </h1>

                  {featured.description && (
                    <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                      {featured.description}
                    </p>
                  )}

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => openManga(featured.id, featured.title, featured.cover)}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-solar-500 to-amber-500 hover:from-amber-400 hover:to-solar-500 text-void-950 font-serif font-bold text-sm shadow-xl shadow-solar-500/25 hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Decipher Grimoire</span>
                    </button>

                    <button
                      onClick={() => setDrawerOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-void-850 hover:bg-void-800 border border-void-700 text-xs text-solar-400 hover:border-solar-500/60 transition-all flex items-center gap-2 font-mono font-medium shadow-sm"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Codex Filter ({activeFiltersCount})</span>
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => openManga(featured.id, featured.title, featured.cover)}
                  className="w-32 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-solar-500/40 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                >
                  <img
                    src={featured.cover}
                    alt={featured.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          {/* "Resume Chronicle" Quick Bar */}
          {lastRead && (
            <div
              onClick={() => openChapter(lastRead.mangaId, lastRead.chapterId, lastRead.chapterTitle, lastRead.mangaTitle, lastRead.mangaCover)}
              className="p-3 sm:p-4 rounded-2xl bg-void-900 border border-solar-500/40 hover:border-solar-500 flex items-center justify-between gap-4 cursor-pointer group shadow-lg transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-13 rounded-lg overflow-hidden bg-void-950 shrink-0 border border-void-700">
                  <img src={lastRead.mangaCover} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-solar-400 animate-ping" />
                    <span className="text-[10px] uppercase font-mono tracking-wider text-solar-400 font-bold">
                      Resume Chronicle
                    </span>
                  </div>
                  <h4 className="font-serif text-sm font-bold text-slate-100 truncate group-hover:text-solar-400 transition-colors">
                    {lastRead.mangaTitle}
                  </h4>
                  <p className="text-xs text-solar-400/90 font-mono">
                    {lastRead.chapterTitle} • Page {lastRead.pageIndex}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-solar-500/20 text-solar-300 text-xs font-mono font-bold group-hover:bg-solar-500 group-hover:text-void-950 transition-all shrink-0">
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Origin Pills & Sort Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-void-700/60 pb-3">
            {/* Origin Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setFilters({ ...filters, selectedType: null })}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 ${
                  filters.selectedType === null
                    ? 'bg-solar-500 text-void-950 font-bold shadow-md shadow-solar-500/20'
                    : 'bg-void-900 text-slate-400 hover:text-slate-200 hover:bg-void-850 border border-void-750'
                }`}
              >
                🌐 All Origins
              </button>

              {TYPE_OPTIONS.map((t) => {
                const isSelected = filters.selectedType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setFilters({ ...filters, selectedType: t.id })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all shrink-0 ${
                      isSelected
                        ? 'bg-solar-500 text-void-950 font-bold shadow-md shadow-solar-500/20'
                        : 'bg-void-900 text-slate-300 hover:text-solar-400 hover:bg-void-850 border border-void-750'
                    }`}
                  >
                    <span>{t.flag}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sort & Filter Drawer Button */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                className="px-3 py-1.5 rounded-xl bg-void-900 border border-void-750 text-xs font-mono text-slate-300 focus:outline-none focus:border-solar-500/60 cursor-pointer"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-void-900 text-slate-200">
                    {s.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setDrawerOpen(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2 transition-all border ${
                  activeFiltersCount > 0
                    ? 'bg-solar-500/20 border-solar-500 text-solar-400 font-bold'
                    : 'bg-void-900 border-void-750 text-slate-300 hover:text-solar-400'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-solar-500 text-void-950 text-[10px] flex items-center justify-center font-mono font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active Filter Criteria Tags */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-mono text-slate-400">Criteria:</span>

              {filters.selectedSource !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-telemetry-cyan/20 text-telemetry-cyan text-xs font-mono font-bold flex items-center gap-1 border border-telemetry-cyan/40">
                  <span>Stream: {filters.selectedSource === 'mangadex' ? 'MangaDex Safe' : 'WeebCentral'}</span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:scale-125"
                    onClick={() => setFilters({ ...filters, selectedSource: 'all' })}
                  />
                </span>
              )}

              {filters.selectedType && (
                <span className="px-2.5 py-1 rounded-lg bg-solar-500/20 text-solar-400 text-xs font-mono font-bold flex items-center gap-1 border border-solar-500/40">
                  <span>Origin: {filters.selectedType}</span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:scale-125"
                    onClick={() => setFilters({ ...filters, selectedType: null })}
                  />
                </span>
              )}

              {filters.selectedStatus && (
                <span className="px-2.5 py-1 rounded-lg bg-void-800 text-slate-200 text-xs font-mono font-bold flex items-center gap-1 border border-void-700">
                  <span>Status: {filters.selectedStatus}</span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:scale-125"
                    onClick={() => setFilters({ ...filters, selectedStatus: null })}
                  />
                </span>
              )}

              {filters.includedTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 text-xs font-mono flex items-center gap-1 border border-emerald-500/50"
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>{tag}</span>
                  <X
                    className="w-3 h-3 cursor-pointer hover:scale-125"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        includedTags: filters.includedTags.filter((t) => t !== tag),
                      })
                    }
                  />
                </span>
              ))}

              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-[11px] font-mono text-solar-400 hover:underline ml-1"
              >
                Reset All
              </button>
            </div>
          )}

          {/* Main Catalog Grid */}
          {loadingInitial ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-void-900 animate-pulse border border-void-800" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {items.map((manga, idx) => (
                  <MangaCard
                    key={manga.id}
                    manga={manga}
                    rank={idx < 10 && !filters.query ? idx + 1 : undefined}
                  />
                ))}
              </div>

              {/* Infinite Scroll Sentinel Target */}
              <div ref={observerTarget} className="h-10 w-full" />

              {loadingMore && (
                <div className="py-8 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-7 h-7 text-solar-500 animate-spin" />
                  <p className="font-serif text-xs text-amber-200">
                    Streaming more scrolls from {filters.selectedSource === 'mangadex' ? 'MangaDex Vault' : 'WeebCentral'}...
                  </p>
                </div>
              )}

              {hasMore && !loadingMore && items.length > 0 && (
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={loadMore}
                    className="px-8 py-3 rounded-2xl bg-gradient-to-r from-void-900 to-void-850 hover:bg-void-800 border border-solar-500/40 hover:border-solar-500 text-solar-400 font-serif font-bold text-xs tracking-wide shadow-xl shadow-solar-500/10 hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-solar-400" />
                    <span>Summon More Scrolls (Loaded {items.length})</span>
                  </button>
                </div>
              )}

              {!hasMore && items.length > 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-500 font-serif">
                    ❦ All manuscripts of this realm have been unveiled ❦
                  </p>
                </div>
              )}

              {items.length === 0 && !loadingInitial && (
                <div className="py-24 text-center space-y-3">
                  <p className="text-sm text-slate-400 font-serif">
                    No manuscripts found matching the selected stream or tags.
                  </p>
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="px-4 py-2 rounded-xl bg-void-850 border border-solar-500/40 text-xs text-solar-400 font-mono"
                  >
                    Reset Codex Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PERSONAL CODEX SHELVES (BOOKMARKS)                */}
      {/* ======================================================== */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-void-700/60 pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-100 flex items-center gap-2">
                <span>Personal Codex Shelves</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-solar-500/20 text-solar-400 font-mono font-bold">
                  {bookmarks.length} Titles
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Encrypted local shelf library with JSON backup & restore
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="px-3 py-1.5 rounded-xl bg-void-900 hover:bg-void-850 border border-void-750 text-slate-300 hover:text-solar-400 text-xs font-mono flex items-center gap-1.5 transition-all"
                title="Export library backup JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-void-900 hover:bg-void-850 border border-void-750 text-slate-300 hover:text-solar-400 text-xs font-mono flex items-center gap-1.5 transition-all"
                title="Import library backup JSON"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restore JSON</span>
              </button>
            </div>
          </div>

          {/* Shelves Category Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedShelf('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 ${
                  selectedShelf === 'all'
                    ? 'bg-solar-500 text-void-950 font-bold shadow-md shadow-solar-500/20'
                    : 'bg-void-900 text-slate-400 hover:text-slate-200 border border-void-750'
                }`}
              >
                All ({bookmarks.length})
              </button>
              <button
                onClick={() => setSelectedShelf('reading')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 ${
                  selectedShelf === 'reading'
                    ? 'bg-solar-500 text-void-950 font-bold shadow-md shadow-solar-500/20'
                    : 'bg-void-900 text-slate-400 hover:text-slate-200 border border-void-750'
                }`}
              >
                📖 Reading ({bookmarks.filter((b) => b.category === 'reading').length})
              </button>
              <button
                onClick={() => setSelectedShelf('plan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 ${
                  selectedShelf === 'plan'
                    ? 'bg-solar-500 text-void-950 font-bold shadow-md shadow-solar-500/20'
                    : 'bg-void-900 text-slate-400 hover:text-slate-200 border border-void-750'
                }`}
              >
                ⏳ Plan ({bookmarks.filter((b) => b.category === 'plan').length})
              </button>
              <button
                onClick={() => setSelectedShelf('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 ${
                  selectedShelf === 'completed'
                    ? 'bg-solar-500 text-void-950 font-bold shadow-md shadow-solar-500/20'
                    : 'bg-void-900 text-slate-400 hover:text-slate-200 border border-void-750'
                }`}
              >
                🏆 Completed ({bookmarks.filter((b) => b.category === 'completed').length})
              </button>
              <button
                onClick={() => setSelectedShelf('favorites')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 ${
                  selectedShelf === 'favorites'
                    ? 'bg-solar-500 text-void-950 font-bold shadow-md shadow-solar-500/20'
                    : 'bg-void-900 text-slate-400 hover:text-slate-200 border border-void-750'
                }`}
              >
                ⭐ Favorites ({bookmarks.filter((b) => b.category === 'favorites').length})
              </button>
            </div>

            <div className="relative max-w-xs flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={shelfSearch}
                onChange={(e) => setShelfSearch(e.target.value)}
                placeholder="Search shelves..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-void-900 border border-void-750 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-solar-500/60 font-mono"
              />
            </div>
          </div>

          {filteredBookmarks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {filteredBookmarks.map((manga) => (
                <MangaCard key={manga.id} manga={manga} />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center space-y-4">
              <Bookmark className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-serif text-lg text-slate-300">No Manuscripts in this Shelf</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-mono">
                Explore the Unified Matrix and click the bookmark ribbon to archive manuscripts here.
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="px-6 py-2 rounded-xl bg-solar-500 text-void-950 font-serif font-bold text-xs shadow-lg shadow-solar-500/20 hover:scale-105 transition-all"
              >
                Explore Codex
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CHRONICLES (READING HISTORY)                      */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-void-700/60 pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-100 flex items-center gap-2">
                <span>Reading Chronicles</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-solar-500/20 text-solar-400 font-mono font-bold">
                  {historyList.length} In-Progress
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Your uninterrupted reading continuity across all scrolls
              </p>
            </div>

            {historyList.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all reading chronicles?')) {
                    clearHistory();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-void-900 hover:bg-rose-950/40 border border-void-750 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Chronicles</span>
              </button>
            )}
          </div>

          {historyList.length > 0 ? (
            <div className="space-y-3">
              {historyList.map((item) => (
                <div
                  key={item.mangaId}
                  className="p-4 rounded-2xl bg-void-900 border border-void-750 hover:border-solar-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-md group"
                >
                  <div
                    onClick={() => openManga(item.mangaId, item.mangaTitle, item.mangaCover)}
                    className="flex items-center gap-4 cursor-pointer min-w-0"
                  >
                    <div className="w-14 h-20 rounded-xl overflow-hidden bg-void-950 shrink-0 border border-void-700">
                      <img src={item.mangaCover} alt="" className="w-full h-full object-cover" />
                    </div>

                    <div className="truncate">
                      <h4 className="font-serif text-base font-bold text-slate-100 group-hover:text-solar-400 transition-colors truncate">
                        {item.mangaTitle}
                      </h4>
                      <p className="text-xs text-solar-400 font-mono mt-0.5">
                        {item.chapterTitle} • Page {item.pageIndex} of {item.totalImages}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>Read {formatRelativeTime(item.updatedAt)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openChapter(item.mangaId, item.chapterId, item.chapterTitle, item.mangaTitle, item.mangaCover)}
                      className="px-4 py-2 rounded-xl bg-solar-500 hover:bg-solar-400 text-void-950 font-serif font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-solar-500/20"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Resume Scroll</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center space-y-4">
              <Clock className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-serif text-lg text-slate-300">Chronicle Journal is Blank</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-mono">
                Start reading any manga to have your exact scroll position and chapter history logged here.
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="px-6 py-2 rounded-xl bg-solar-500 text-void-950 font-serif font-bold text-xs shadow-lg shadow-solar-500/20 hover:scale-105 transition-all"
              >
                Browse Unified Stream
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-void-900/90 backdrop-blur-xl border border-solar-500/50 text-solar-400 hover:bg-solar-500 hover:text-void-950 shadow-2xl shadow-solar-500/25 transition-all hover:scale-110"
          title="Return to Zenith"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

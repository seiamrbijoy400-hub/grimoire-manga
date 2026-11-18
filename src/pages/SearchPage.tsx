import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  X,
  Loader2,
  Search,
  Filter,
  TrendingUp,
  Clock,
  SlidersHorizontal,
  ChevronDown,
  ArrowRight,
  AlertCircle,
  BookOpen,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../store/useStore.ts';
import { searchMangaApi, getProxyImageUrl } from '../services/api.ts';
import { MangaItem } from '../types.ts';
import {
  FALLBACK_COVER,
  POPULAR_SEARCHES,
} from '../components/SearchModal.tsx';

// ─── constants ────────────────────────────────────────────────────────────────
const HISTORY_KEY = 'grimoire:search-history';
const MAX_HISTORY = 10;
const DEBOUNCE_MS = 350;
const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating',    label: 'Top Rated' },
  { value: 'latest',    label: 'Latest' },
  { value: 'alpha',     label: 'A → Z' },
];

type SortKey = typeof SORT_OPTIONS[number]['value'];

// ─── helpers ──────────────────────────────────────────────────────────────────
function readHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function pushHistory(term: string) {
  const h = readHistory().filter((t) => t !== term);
  h.unshift(term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)));
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="flex flex-col gap-2 p-2 bg-[#111318] rounded border border-[#292A2D] animate-pulse">
    <div className="w-full h-48 rounded bg-[#1E2027]" />
    <div className="h-3 w-3/4 rounded bg-[#1E2027]" />
    <div className="h-3 w-1/2 rounded bg-[#1E2027]" />
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openManga, setSearchOpen } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  // ── URL-driven query ────────────────────────────────────────────────────────
  const queryParam = searchParams.get('q') ?? '';
  const [query,       setQuery]       = useState<string>(queryParam);
  const [committed,   setCommitted]   = useState<string>(queryParam); // last searched

  // ── Results & pagination ────────────────────────────────────────────────────
  const [results,  setResults]  = useState<MangaItem[]>([]);
  const [page,     setPage]     = useState(0);
  const [hasMore,  setHasMore]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [typeFilter,   setTypeFilter]   = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [genreFilter,  setGenreFilter]  = useState<string>('');
  const [sortKey,      setSortKey]      = useState<SortKey>('relevance');
  const [showFilters,  setShowFilters]  = useState(false);

  // ── History & suggestions ───────────────────────────────────────────────────
  const [history,       setHistory]       = useState<string[]>(readHistory);
  const [suggestions,   setSuggestions]   = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Focus input on mount; close global modal ────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus();
    setSearchOpen(false);
  }, []);

  // ── Autocomplete suggestions from history / popular ─────────────────────────
  useEffect(() => {
    if (!query.trim() || query === committed) {
      setSuggestions([]);
      return;
    }
    const q = query.toLowerCase();
    const pool = [...history, ...POPULAR_SEARCHES];
    const hits = Array.from(new Set(pool.filter((t) => t.toLowerCase().startsWith(q)))).slice(0, 6);
    setSuggestions(hits);
  }, [query, history, committed]);

  // ── URL sync (debounced) ────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => {
      if (query.trim()) {
        setSearchParams({ q: query }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  // ── Debounced live search (auto-fire after typing) ──────────────────────────
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setPage(0);
      setHasMore(false);
      setError(null);
      return;
    }
    const id = setTimeout(() => {
      runSearch(query.trim(), 0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  // ── Core search function ────────────────────────────────────────────────────
  const runSearch = useCallback(async (term: string, offset: number) => {
    if (offset === 0) {
      setLoading(true);
      setError(null);
      setResults([]);
      setPage(0);
    } else {
      setLoadingMore(true);
    }
    try {
      const items = await searchMangaApi(term, false, offset);
      if (offset === 0) {
        setResults(items);
      } else {
        setResults((prev) => [...prev, ...items]);
      }
      setHasMore(items.length >= PAGE_SIZE);
      setPage(Math.floor(offset / PAGE_SIZE));
      setCommitted(term);
      pushHistory(term);
      setHistory(readHistory());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // ── Load more ───────────────────────────────────────────────────────────────
  const loadMore = () => {
    if (!committed || loadingMore || !hasMore) return;
    runSearch(committed, (page + 1) * PAGE_SIZE);
  };

  // ── Commit search (Enter / suggestion click) ────────────────────────────────
  const commitSearch = (term: string) => {
    const t = term.trim();
    if (!t) return;
    setQuery(t);
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchParams({ q: t });
    runSearch(t, 0);
    inputRef.current?.blur();
  };

  // ── Clear all filters ───────────────────────────────────────────────────────
  const clearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setGenreFilter('');
    setSortKey('relevance');
  };

  const hasActiveFilters = typeFilter || statusFilter || genreFilter || sortKey !== 'relevance';

  // ── Genre options derived from results ──────────────────────────────────────
  const genreOptions = useMemo(() => {
    const set = new Set<string>();
    results.forEach((item) => item.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [results]);

  // ── Client-side filter + sort ───────────────────────────────────────────────
  const filteredResults = useMemo(() => {
    let list = results.filter((item) => {
      const typeMatch   = typeFilter
        ? (item.type?.toLowerCase() ?? '').includes(typeFilter.toLowerCase())
        : true;
      const statusMatch = statusFilter
        ? (item.status?.toLowerCase() ?? '').includes(statusFilter.toLowerCase())
        : true;
      const genreMatch  = genreFilter
        ? item.tags?.some((tag) => tag.toLowerCase() === genreFilter.toLowerCase())
        : true;
      return typeMatch && statusMatch && genreMatch;
    });

    if (sortKey === 'alpha') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    // 'relevance', 'rating', 'latest' rely on API ordering for now
    return list;
  }, [results, typeFilter, statusFilter, genreFilter, sortKey]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#090A0C] text-[#F0E9DC] flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#0D0E13]/95 backdrop-blur border-b border-[#292A2D]">
        <div className="flex items-center gap-3 px-4 py-3 max-w-5xl mx-auto w-full">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="shrink-0 p-1.5 rounded-lg text-[#AAA69D] hover:text-[#F0E9DC] hover:bg-[#1E2027] transition-colors"
            aria-label="Go back"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Search input container */}
          <div className="relative flex-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1E2027] border border-[#292A2D] focus-within:border-[#C69A45]/60 transition-colors">
              <Search className="shrink-0 w-4 h-4 text-[#AAA69D]" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && suggestions.length > 0}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitSearch(query);
                  }
                  if (e.key === 'Escape') {
                    setQuery('');
                    setShowSuggestions(false);
                  }
                }}
                placeholder="Search manga, manhwa, authors, genres…"
                className="flex-1 min-w-0 bg-transparent text-[#F0E9DC] placeholder-[#AAA69D]/50 text-sm focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setResults([]); setShowSuggestions(false); }}
                  className="shrink-0 text-[#AAA69D] hover:text-[#F0E9DC] transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {loading && <Loader2 className="shrink-0 w-4 h-4 animate-spin text-[#C69A45]" />}
            </div>

            {/* Autocomplete suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute top-full left-0 right-0 mt-1 bg-[#1E2027] border border-[#292A2D] rounded-xl overflow-hidden shadow-2xl z-50"
              >
                {suggestions.map((s) => (
                  <li
                    key={s}
                    role="option"
                    aria-selected={false}
                    onMouseDown={() => commitSearch(s)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#AAA69D] hover:bg-[#292A2D] hover:text-[#F0E9DC] cursor-pointer transition-colors"
                  >
                    <Search className="w-3 h-3 shrink-0" />
                    <span className="truncate">{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-[#C69A45]/20 text-[#C69A45] border border-[#C69A45]/40'
                : 'bg-[#1E2027] text-[#AAA69D] border border-[#292A2D] hover:text-[#F0E9DC]'
            }`}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#C69A45] shrink-0" />
            )}
          </button>
        </div>

        {/* ── Filter panel ───────────────────────────────────────────────────── */}
        {showFilters && (
          <div className="border-t border-[#292A2D] bg-[#0D0E13] px-4 py-3">
            <div className="max-w-5xl mx-auto flex flex-wrap items-end gap-4">
              {/* Type */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#AAA69D] uppercase tracking-wider">
                  Type
                </label>
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-[#1E2027] border border-[#292A2D] rounded-lg text-sm text-[#F0E9DC] focus:outline-none focus:border-[#C69A45]/60 cursor-pointer"
                    aria-label="Filter by type"
                  >
                    <option value="">All types</option>
                    <option value="manga">Manga</option>
                    <option value="manhwa">Manhwa</option>
                    <option value="manhua">Manhua</option>
                    <option value="OEL">OEL</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#AAA69D] pointer-events-none" />
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#AAA69D] uppercase tracking-wider">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-[#1E2027] border border-[#292A2D] rounded-lg text-sm text-[#F0E9DC] focus:outline-none focus:border-[#C69A45]/60 cursor-pointer"
                    aria-label="Filter by status"
                  >
                    <option value="">All statuses</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="hiatus">Hiatus</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#AAA69D] pointer-events-none" />
                </div>
              </div>

              {/* Genre — only when tags are available */}
              {genreOptions.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#AAA69D] uppercase tracking-wider">
                    Genre
                  </label>
                  <div className="relative">
                    <select
                      value={genreFilter}
                      onChange={(e) => setGenreFilter(e.target.value)}
                      className="appearance-none pl-3 pr-7 py-1.5 bg-[#1E2027] border border-[#292A2D] rounded-lg text-sm text-[#F0E9DC] focus:outline-none focus:border-[#C69A45]/60 cursor-pointer max-w-[180px]"
                      aria-label="Filter by genre"
                    >
                      <option value="">All genres</option>
                      {genreOptions.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#AAA69D] pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Sort */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#AAA69D] uppercase tracking-wider">
                  Sort
                </label>
                <div className="relative">
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-[#1E2027] border border-[#292A2D] rounded-lg text-sm text-[#F0E9DC] focus:outline-none focus:border-[#C69A45]/60 cursor-pointer"
                    aria-label="Sort results"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#AAA69D] pointer-events-none" />
                </div>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#AAA69D] hover:text-[#E05252] hover:bg-[#E05252]/10 border border-[#292A2D] transition-colors"
                  aria-label="Clear all filters"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}

              {/* Result count pill */}
              {!loading && results.length > 0 && (
                <span className="ml-auto text-xs text-[#AAA69D] self-end pb-1.5">
                  {filteredResults.length} of {results.length} results
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" ref={listRef}>
        <div className="max-w-5xl mx-auto w-full px-4 py-6">

          {/* ── Empty state: no query ─────────────────────────────────────────── */}
          {!query.trim() && !loading && (
            <div className="space-y-8">
              {/* Search history */}
              {history.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[#AAA69D] uppercase tracking-wider">
                      <Clock className="w-4 h-4" /> Recent
                    </h2>
                    <button
                      onClick={() => { clearHistory(); setHistory([]); }}
                      className="text-xs text-[#AAA69D] hover:text-[#E05252] transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {history.map((term) => (
                      <button
                        key={term}
                        onClick={() => commitSearch(term)}
                        className="px-3 py-1.5 rounded-full text-sm bg-[#1E2027] border border-[#292A2D] text-[#AAA69D] hover:border-[#C69A45]/60 hover:text-[#F0E9DC] transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Popular searches */}
              <section>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[#AAA69D] uppercase tracking-wider mb-3">
                  <TrendingUp className="w-4 h-4" /> Popular
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      onClick={() => commitSearch(term)}
                      className="p-3 text-left rounded-xl bg-[#111318] border border-[#292A2D] text-sm text-[#F0E9DC] hover:border-[#C69A45]/60 hover:bg-[#1E2027] transition-colors"
                    >
                      <span className="text-[#C69A45] mr-1.5">#</span>
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ── Loading skeletons ─────────────────────────────────────────────── */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* ── Error state ───────────────────────────────────────────────────── */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <AlertCircle className="w-10 h-10 text-[#E05252]" />
              <p className="text-[#E05252] font-medium">{error}</p>
              <button
                onClick={() => runSearch(committed || query, 0)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E2027] border border-[#292A2D] text-sm text-[#AAA69D] hover:text-[#F0E9DC] transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {/* ── No results ────────────────────────────────────────────────────── */}
          {!loading && !error && query.trim() && filteredResults.length === 0 && results.length === 0 && committed && (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <BookOpen className="w-10 h-10 text-[#AAA69D]" />
              <p className="text-[#F0E9DC] font-semibold">No results for "{committed}"</p>
              <p className="text-sm text-[#AAA69D]">Try a different title, author, or genre.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {POPULAR_SEARCHES.slice(0, 4).map((term) => (
                  <button
                    key={term}
                    onClick={() => commitSearch(term)}
                    className="px-3 py-1.5 rounded-full text-sm bg-[#1E2027] border border-[#292A2D] text-[#AAA69D] hover:border-[#C69A45]/60 hover:text-[#F0E9DC] transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── No results after filtering ────────────────────────────────────── */}
          {!loading && !error && filteredResults.length === 0 && results.length > 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Filter className="w-8 h-8 text-[#AAA69D]" />
              <p className="text-[#F0E9DC] font-semibold">No items match the active filters</p>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E2027] border border-[#292A2D] text-sm text-[#AAA69D] hover:text-[#F0E9DC] transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Clear filters
              </button>
            </div>
          )}

          {/* ── Results grid ──────────────────────────────────────────────────── */}
          {!loading && filteredResults.length > 0 && (
            <>
              {/* Result meta */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#AAA69D]">
                  <span className="text-[#F0E9DC] font-semibold">{filteredResults.length}</span>
                  {results.length > filteredResults.length && ` of ${results.length}`} results
                  {committed && ` for "${committed}"`}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openManga(item.id, item.title, item.cover)}
                    className="group flex flex-col gap-2 p-2 rounded-xl bg-[#111318] border border-[#292A2D] hover:border-[#C69A45]/50 hover:bg-[#1E2027] cursor-pointer transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#C69A45]/40"
                    aria-label={`Open ${item.title}`}
                  >
                    {/* Cover */}
                    <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-[#090A0C] border border-[#292A2D]">
                      <img
                        src={getProxyImageUrl(item.cover)}
                        alt={item.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                        }}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    {/* Title */}
                    <h3 className="font-semibold text-xs leading-tight line-clamp-2 text-[#F0E9DC]">
                      {item.title}
                    </h3>
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {item.type && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#C69A45]/15 text-[#C69A45] border border-[#C69A45]/30">
                          {item.type}
                        </span>
                      )}
                      {item.status && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                          item.status.toLowerCase().includes('ongoing')
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : item.status.toLowerCase().includes('completed')
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : 'bg-[#1E2027] text-[#AAA69D] border-[#292A2D]'
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                    {/* Arrow indicator */}
                    <ArrowRight className="self-end w-3 h-3 text-[#AAA69D] group-hover:text-[#C69A45] transition-colors" />
                  </button>
                ))}
              </div>

              {/* ── Load more ─────────────────────────────────────────────────── */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1E2027] border border-[#292A2D] text-sm font-medium text-[#AAA69D] hover:text-[#F0E9DC] hover:border-[#C69A45]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                    ) : (
                      <>Load more results</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

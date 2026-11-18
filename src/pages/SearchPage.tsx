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
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../store/useStore.ts';
import { MobileTabBar } from '../components/Navbar.tsx';
import { fetchAdvancedSearch, getProxyImageUrl } from '../services/api.ts';
import { MangaItem, FilterState, MangaSource } from '../types.ts';
import {
  FALLBACK_COVER,
  POPULAR_SEARCHES,
} from '../components/SearchModal.tsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const HISTORY_KEY = 'grimoire:search-history';
const MAX_HISTORY = 10;
const DEBOUNCE_MS = 350;
const PAGE_SIZE = 24;

const GENRE_CHIPS = [
  'All',
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Isekai',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-fi',
  'Seinen',
  'Shounen',
  'Slice of Life',
  'Supernatural',
  'Thriller',
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Popularity' },
  { value: 'latest',    label: 'Latest updates' },
  { value: 'alpha',     label: 'A → Z' },
  { value: 'rating',    label: 'Top rated' },
];

type SortKey = 'relevance' | 'latest' | 'alpha' | 'rating';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function pushHistory(term: string) {
  if (!term.trim()) return;
  const h = readHistory().filter((t) => t.toLowerCase() !== term.toLowerCase());
  h.unshift(term.trim());
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)));
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="flex flex-col gap-2.5">
    <div className="shimmer-skeleton aspect-[2/3] w-full rounded-md border border-ink-700" />
    <div className="shimmer-skeleton h-3.5 w-3/4 rounded-sm" />
    <div className="shimmer-skeleton h-2.5 w-1/2 rounded-sm" />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openManga, setSearchOpen, setView } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  // ── URL-driven Query ────────────────────────────────────────────────────────
  const queryParam = searchParams.get('q') ?? '';
  const [query,       setQuery]       = useState<string>(queryParam);
  const [committed,   setCommitted]   = useState<string>(queryParam);

  // ── Results & Pagination ────────────────────────────────────────────────────
  const [results,     setResults]     = useState<MangaItem[]>([]);
  const [offset,      setOffset]      = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [sourceFilter, setSourceFilter] = useState<MangaSource>('all');
  const [typeFilter,   setTypeFilter]   = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [genreFilter,  setGenreFilter]  = useState<string>('');
  const [sortKey,      setSortKey]      = useState<SortKey>('relevance');
  const [showFilters,  setShowFilters]  = useState(false);

  // ── History & Suggestions ───────────────────────────────────────────────────
  const [history,         setHistory]         = useState<string[]>(readHistory);
  const [suggestions,     setSuggestions]     = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Focus input on mount; close global modal
  useEffect(() => {
    inputRef.current?.focus();
    setSearchOpen(false);
  }, [setSearchOpen]);

  // Autocomplete suggestions
  useEffect(() => {
    if (!query.trim() || query === committed) {
      setSuggestions([]);
      return;
    }
    const q = query.toLowerCase();
    const pool = [...history, ...POPULAR_SEARCHES];
    const hits = Array.from(new Set(pool.filter((t) => t.toLowerCase().includes(q)))).slice(0, 6);
    setSuggestions(hits);
  }, [query, history, committed]);

  // URL query sync
  useEffect(() => {
    const id = setTimeout(() => {
      if (query.trim()) {
        setSearchParams({ q: query.trim() }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query, setSearchParams]);

  // ── Core Search Function (Direct Server Integration) ────────────────────────
  const runSearch = useCallback(
    async (
      term: string,
      currentOffset: number = 0,
      overrideGenre?: string,
      overrideType?: string,
      overrideStatus?: string,
      overrideSort?: SortKey,
      overrideSource?: MangaSource
    ) => {
      const activeGenre  = overrideGenre !== undefined ? overrideGenre : genreFilter;
      const activeType   = overrideType !== undefined ? overrideType : typeFilter;
      const activeStatus = overrideStatus !== undefined ? overrideStatus : statusFilter;
      const activeSort   = overrideSort !== undefined ? overrideSort : sortKey;
      const activeSource = overrideSource !== undefined ? overrideSource : sourceFilter;

      // Allow searching if there is a term OR an active filter
      if (!term.trim() && !activeGenre && !activeType && !activeStatus) {
        setResults([]);
        setOffset(0);
        setHasMore(false);
        setError(null);
        return;
      }

      if (currentOffset === 0) {
        setLoading(true);
        setError(null);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      try {
        const filterState: Partial<FilterState> = {
          query: term.trim(),
          selectedSource: activeSource,
          selectedType: activeType || null,
          selectedStatus: activeStatus || null,
          includedTags: activeGenre ? [activeGenre] : [],
          sort:
            activeSort === 'latest'
              ? 'Latest Updates'
              : activeSort === 'alpha'
              ? 'Alphabet'
              : 'Popularity',
          order: 'Descending',
        };

        const items = await fetchAdvancedSearch(filterState, currentOffset);

        // Normalize items so badges and types are guaranteed
        const normalized = items.map((m) => ({
          ...m,
          type: m.type || (m.tags?.includes('Manhwa') ? 'Manhwa' : m.tags?.includes('Manhua') ? 'Manhua' : 'Manga'),
          status: m.status || 'Ongoing',
          tags: m.tags || [],
        }));

        if (currentOffset === 0) {
          setResults(normalized);
        } else {
          setResults((prev) => {
            const seen = new Set(prev.map((i) => i.id));
            const unique = normalized.filter((i) => !seen.has(i.id));
            return [...prev, ...unique];
          });
        }

        setHasMore(items.length >= PAGE_SIZE);
        setOffset(currentOffset);
        setCommitted(term.trim());

        if (term.trim()) {
          pushHistory(term.trim());
          setHistory(readHistory());
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Search failed. Please try again.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [genreFilter, typeFilter, statusFilter, sortKey, sourceFilter]
  );

  // Debounced auto-search when query changes
  useEffect(() => {
    if (!query.trim() && !genreFilter && !typeFilter && !statusFilter) {
      setResults([]);
      setOffset(0);
      setHasMore(false);
      setError(null);
      return;
    }
    const id = setTimeout(() => {
      runSearch(query, 0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  // Load More Pagination
  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    runSearch(committed, offset + PAGE_SIZE);
  };

  // Commit Search (Enter or suggestion click)
  const commitSearch = (term: string) => {
    const t = term.trim();
    setQuery(t);
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchParams(t ? { q: t } : {});
    runSearch(t, 0);
    inputRef.current?.blur();
  };

  // Handle Genre Chip Click
  const handleGenreChipClick = (genre: string) => {
    const nextGenre = genre === 'All' || genreFilter.toLowerCase() === genre.toLowerCase() ? '' : genre;
    setGenreFilter(nextGenre);
    runSearch(query, 0, nextGenre);
  };

  // Clear all filters
  const clearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setGenreFilter('');
    setSourceFilter('all');
    setSortKey('relevance');
    runSearch(query, 0, '', '', '', 'relevance', 'all');
  };

  const hasActiveFilters = Boolean(typeFilter || statusFilter || genreFilter || sourceFilter !== 'all' || sortKey !== 'relevance');

  // Client-side quick filter & sort guarantee
  const displayedResults = useMemo(() => {
    let list = results.filter((item) => {
      const typeMatch = typeFilter
        ? (item.type?.toLowerCase() ?? '').includes(typeFilter.toLowerCase())
        : true;
      const statusMatch = statusFilter
        ? (item.status?.toLowerCase() ?? '').includes(statusFilter.toLowerCase())
        : true;
      const genreMatch = genreFilter
        ? item.tags?.some((t) => t.toLowerCase() === genreFilter.toLowerCase())
        : true;
      const sourceMatch =
        sourceFilter === 'all'
          ? true
          : sourceFilter === 'mangadex'
          ? item.id.startsWith('md:')
          : !item.id.startsWith('md:');
      return typeMatch && statusMatch && genreMatch && sourceMatch;
    });

    if (sortKey === 'alpha') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [results, typeFilter, statusFilter, genreFilter, sourceFilter, sortKey]);

  return (
    <div className="flex min-h-screen flex-col bg-ink-950 text-paper">
      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-ink-700 bg-ink-950/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3">
          <button
            onClick={() => {
              setView('home');
              navigate('/');
            }}
            className="btn-icon"
            aria-label="Back to the index"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitSearch(query);
            }}
            className="relative flex-1"
          >
            <div className="flex h-11 items-center gap-2.5 rounded-md border border-ink-700 bg-ink-900 px-3 transition-colors focus-within:border-paper-dim">
              <Search className="h-4 w-4 shrink-0 text-stamp" />
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
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Titles, authors, genres…"
                aria-label="Search the archive"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-paper placeholder:text-paper-dim/60 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setShowSuggestions(false);
                  }}
                  className="shrink-0 p-1 text-paper-dim hover:text-paper"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-stamp" />}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-md border border-ink-700 bg-ink-900 py-1 shadow-2xl"
              >
                {suggestions.map((s) => (
                  <li
                    key={s}
                    role="option"
                    aria-selected={false}
                    onMouseDown={() => commitSearch(s)}
                    className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-[13px] text-paper-dim transition-colors hover:bg-ink-800 hover:text-paper"
                  >
                    <Search className="h-3 w-3 shrink-0" />
                    <span className="truncate">{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </form>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`btn btn-ghost !h-11 !px-3 ${showFilters ? '!border-paper-dim !text-paper' : ''}`}
            aria-expanded={showFilters}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-stamp" />}
          </button>
        </div>

        {/* Genre row */}
        <div className="no-scrollbar mx-auto flex w-full max-w-6xl items-center gap-1.5 overflow-x-auto px-4 pb-2.5">
          {GENRE_CHIPS.map((genre) => {
            const isSelected =
              (genre === 'All' && !genreFilter) ||
              genreFilter.toLowerCase() === genre.toLowerCase();
            return (
              <button
                key={genre}
                onClick={() => handleGenreChipClick(genre)}
                className="chip"
                data-active={isSelected}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {/* Filter drawer */}
        {showFilters && (
          <div className="border-t border-ink-700 bg-ink-900/70 px-4 py-3.5 animate-fade-in">
            <div className="mx-auto flex max-w-6xl flex-wrap items-end gap-3">
              <div className="flex min-w-[130px] flex-col gap-1">
                <label className="eyebrow">Source</label>
                <div className="relative">
                  <select
                    value={sourceFilter}
                    onChange={(e) => {
                      const src = e.target.value as MangaSource;
                      setSourceFilter(src);
                      runSearch(query, 0, undefined, undefined, undefined, undefined, src);
                    }}
                    className="h-9 w-full appearance-none rounded-md border border-ink-700 bg-ink-950 pl-2.5 pr-7 text-[11px] text-paper focus:border-paper-dim focus:outline-none"
                  >
                    <option value="all">All sources</option>
                    <option value="weebcentral">WeebCentral</option>
                    <option value="mangadex">MangaDex (safe)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-dim" />
                </div>
              </div>

              <div className="flex min-w-[110px] flex-col gap-1">
                <label className="eyebrow">Format</label>
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      const t = e.target.value;
                      setTypeFilter(t);
                      runSearch(query, 0, undefined, t);
                    }}
                    className="h-9 w-full appearance-none rounded-md border border-ink-700 bg-ink-950 pl-2.5 pr-7 text-[11px] text-paper focus:border-paper-dim focus:outline-none"
                  >
                    <option value="">All formats</option>
                    <option value="Manga">Manga</option>
                    <option value="Manhwa">Manhwa</option>
                    <option value="Manhua">Manhua</option>
                    <option value="OEL">OEL</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-dim" />
                </div>
              </div>

              <div className="flex min-w-[110px] flex-col gap-1">
                <label className="eyebrow">Status</label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      const s = e.target.value;
                      setStatusFilter(s);
                      runSearch(query, 0, undefined, undefined, s);
                    }}
                    className="h-9 w-full appearance-none rounded-md border border-ink-700 bg-ink-950 pl-2.5 pr-7 text-[11px] text-paper focus:border-paper-dim focus:outline-none"
                  >
                    <option value="">Any status</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Complete">Completed</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-dim" />
                </div>
              </div>

              <div className="flex min-w-[120px] flex-col gap-1">
                <label className="eyebrow">Sort</label>
                <div className="relative">
                  <select
                    value={sortKey}
                    onChange={(e) => {
                      const s = e.target.value as SortKey;
                      setSortKey(s);
                      runSearch(query, 0, undefined, undefined, undefined, s);
                    }}
                    className="h-9 w-full appearance-none rounded-md border border-ink-700 bg-ink-950 pl-2.5 pr-7 text-[11px] text-paper focus:border-paper-dim focus:outline-none"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper-dim" />
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex h-9 items-center gap-1.5 rounded-md border border-ink-700 px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper-dim transition-colors hover:border-stamp/60 hover:text-stamp"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}

              {!loading && results.length > 0 && (
                <span className="ml-auto self-end pb-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-dim">
                  {displayedResults.length} results
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" ref={listRef}>
        <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6">
          {/* Idle */}
          {!query.trim() && !genreFilter && !typeFilter && !statusFilter && !loading && (
            <div className="mx-auto max-w-3xl space-y-10 py-2">
              {history.length > 0 && (
                <section>
                  <div className="flex items-center justify-between border-b border-ink-700 pb-2.5">
                    <h2 className="eyebrow flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Recent searches
                    </h2>
                    <button
                      onClick={() => {
                        clearHistory();
                        setHistory([]);
                      }}
                      className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-dim underline underline-offset-4 hover:text-paper"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {history.map((term) => (
                      <button key={term} onClick={() => commitSearch(term)} className="chip">
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between border-b border-ink-700 pb-2.5">
                  <h2 className="eyebrow flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Start here
                  </h2>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-dim">
                    Curated
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                  {POPULAR_SEARCHES.map((term, i) => (
                    <button
                      key={term}
                      onClick={() => commitSearch(term)}
                      className="group flex items-center justify-between border-b border-ink-700 py-2.5 text-left"
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="tnum font-mono text-[10px] text-stamp">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-[13px] font-medium text-paper transition-colors group-hover:text-stamp">
                          {term}
                        </span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-paper-dim transition-transform group-hover:translate-x-0.5 group-hover:text-paper" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-20 text-center">
              <AlertCircle className="h-8 w-8 text-stamp" />
              <p className="text-[13px] text-paper">{error}</p>
              <button onClick={() => runSearch(committed || query, 0)} className="btn btn-ghost">
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && displayedResults.length === 0 && (query.trim() || genreFilter) && (
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-20 text-center">
              <BookOpen className="h-8 w-8 text-paper-dim/60" />
              <h3 className="font-display text-base font-semibold text-paper">
                Nothing in the index for that
              </h3>
              <p className="text-[12.5px] leading-relaxed text-paper-dim">
                No titles match{' '}
                {genreFilter && <span className="text-stamp">{genreFilter}</span>}
                {genreFilter && query.trim() ? ' + ' : ''}
                {query.trim() && `“${query.trim()}”`}.
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn btn-stamp mt-1">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Results */}
          {!loading && displayedResults.length > 0 && (
            <>
              <div className="mb-5 flex items-baseline justify-between border-b border-ink-700 pb-2.5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-dim">
                  <span className="text-paper">{displayedResults.length}</span> results
                  {genreFilter && <span className="text-stamp"> · {genreFilter}</span>}
                  {committed && ` · “${committed}”`}
                </p>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-dim/70">
                  Weeb + Dex
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {displayedResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openManga(item.id, item.title, item.cover)}
                    className="group cursor-pointer text-left"
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-ink-700 bg-ink-900 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-paper/35">
                      <img
                        src={getProxyImageUrl(item.cover)}
                        alt={item.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                        decoding="async"
                      />
                      {item.id.startsWith('md:') && (
                        <span className="tag absolute left-1.5 top-1.5 !bg-ink-950/85">Dex</span>
                      )}
                    </div>

                    <h3 className="mt-2 line-clamp-2 font-display text-[12.5px] font-semibold leading-snug text-paper transition-colors group-hover:text-stamp">
                      {item.title}
                    </h3>

                    <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.08em] text-paper-dim">
                      <span className="truncate">{item.type || 'Series'}</span>
                      {item.status && (
                        <span className="shrink-0 opacity-80">
                          {item.status.toLowerCase().includes('ongoing') ? 'Ongoing' : 'Complete'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mb-6 mt-10 flex justify-center">
                  <button onClick={loadMore} disabled={loadingMore} className="btn btn-ghost">
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-stamp" />
                        Loading
                      </>
                    ) : (
                      <>
                        Load more
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <MobileTabBar />
    </div>
  );
};

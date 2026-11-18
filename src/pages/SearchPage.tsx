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
  { value: 'relevance', label: '🔥 Popularity' },
  { value: 'latest',    label: '⚡ Latest Updates' },
  { value: 'alpha',     label: '🔤 A → Z' },
  { value: 'rating',    label: '⭐ Top Rated' },
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
  <div className="flex flex-col gap-2 p-2.5 bg-[#111318] rounded-xl border border-[#292A2D] animate-pulse">
    <div className="w-full aspect-[2/3] rounded-lg bg-[#1E2027]" />
    <div className="h-3.5 w-3/4 rounded bg-[#1E2027] mt-1" />
    <div className="h-3 w-1/2 rounded bg-[#1E2027]" />
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
    <div className="min-h-screen bg-[#090A0C] text-[#F0E9DC] flex flex-col">
      {/* ── Sticky Top Bar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#090A0C]/95 backdrop-blur-md border-b border-[#292A2D]">
        <div className="flex items-center gap-2.5 px-3 py-3 max-w-6xl mx-auto w-full">
          {/* Back Button */}
          <button
            onClick={() => {
              setView('home');
              navigate('/');
            }}
            className="shrink-0 p-2 rounded-xl text-[#AAA69D] hover:text-[#C69A45] hover:bg-[#191A1F] transition-colors border border-transparent hover:border-[#292A2D]"
            aria-label="Return to Archive Home"
            title="Return to Home"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitSearch(query);
            }}
            className="relative flex-1"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111318] border border-[#292A2D] focus-within:border-[#C69A45]/60 transition-colors">
              <Search className="shrink-0 w-4 h-4 text-[#C69A45]" />
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
                placeholder="Search manga, manhwa, authors, genres... (Press Enter to search)"
                className="flex-1 min-w-0 bg-transparent text-[#F0E9DC] placeholder-[#AAA69D]/50 text-sm focus:outline-none font-sans"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setShowSuggestions(false);
                  }}
                  className="shrink-0 p-0.5 text-[#AAA69D] hover:text-[#F0E9DC] transition-colors"
                  aria-label="Clear search text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {loading && <Loader2 className="shrink-0 w-4 h-4 animate-spin text-[#C69A45]" />}
            </div>

            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute top-full left-0 right-0 mt-1.5 bg-[#111318] border border-[#292A2D] rounded-xl overflow-hidden shadow-2xl z-50 py-1"
              >
                {suggestions.map((s) => (
                  <li
                    key={s}
                    role="option"
                    aria-selected={false}
                    onMouseDown={() => commitSearch(s)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-[#AAA69D] hover:bg-[#191A1F] hover:text-[#C69A45] cursor-pointer transition-colors"
                  >
                    <Search className="w-3 h-3 shrink-0 text-[#AAA69D]" />
                    <span className="truncate">{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </form>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              showFilters || hasActiveFilters
                ? 'bg-[#C69A45]/15 text-[#C69A45] border-[#C69A45]/40'
                : 'bg-[#111318] text-[#AAA69D] border-[#292A2D] hover:text-[#F0E9DC]'
            }`}
            aria-label="Toggle filters drawer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#C69A45] animate-pulse" />
            )}
          </button>
        </div>

        {/* ── Gen-Z Quick Genre Chips Row ────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-t border-[#292A2D]/60 bg-[#090A0C] no-scrollbar">
          {GENRE_CHIPS.map((genre) => {
            const isSelected =
              (genre === 'All' && !genreFilter) ||
              genreFilter.toLowerCase() === genre.toLowerCase();
            return (
              <button
                key={genre}
                onClick={() => handleGenreChipClick(genre)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-mono transition-all ${
                  isSelected
                    ? 'bg-[#C69A45] text-black font-bold shadow-[0_0_12px_rgba(198,154,69,0.35)]'
                    : 'bg-[#111318] text-[#AAA69D] border border-[#292A2D] hover:text-[#F0E9DC] hover:border-[#C69A45]/40'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {/* ── Advanced Filter Drawer ─────────────────────────────────────────── */}
        {showFilters && (
          <div className="border-t border-[#292A2D] bg-[#0D0E13] px-4 py-3.5 animate-fade-in">
            <div className="max-w-6xl mx-auto flex flex-wrap items-end gap-3 sm:gap-4">
              {/* Source Filter */}
              <div className="flex flex-col gap-1 min-w-[130px]">
                <label className="text-[11px] font-mono text-[#AAA69D] uppercase tracking-wider">
                  Source Engine
                </label>
                <div className="relative">
                  <select
                    value={sourceFilter}
                    onChange={(e) => {
                      const src = e.target.value as MangaSource;
                      setSourceFilter(src);
                      runSearch(query, 0, undefined, undefined, undefined, undefined, src);
                    }}
                    className="w-full appearance-none pl-3 pr-7 py-1.5 bg-[#191A1F] border border-[#292A2D] rounded-lg text-xs text-[#F0E9DC] focus:outline-none focus:border-[#C69A45]/60 cursor-pointer"
                  >
                    <option value="all">🌐 All (Weeb + MangaDex)</option>
                    <option value="weebcentral">⚡ WeebCentral Stream</option>
                    <option value="mangadex">🛡️ MangaDex Safe</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#AAA69D] pointer-events-none" />
                </div>
              </div>

              {/* Type Filter */}
              <div className="flex flex-col gap-1 min-w-[110px]">
                <label className="text-[11px] font-mono text-[#AAA69D] uppercase tracking-wider">
                  Format
                </label>
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      const t = e.target.value;
                      setTypeFilter(t);
                      runSearch(query, 0, undefined, t);
                    }}
                    className="w-full appearance-none pl-3 pr-7 py-1.5 bg-[#191A1F] border border-[#292A2D] rounded-lg text-xs text-[#F0E9DC] focus:outline-none focus:border-[#C69A45]/60 cursor-pointer"
                  >
                    <option value="">All Formats</option>
                    <option value="Manga">🇯🇵 Manga</option>
                    <option value="Manhwa">🇰🇷 Manhwa</option>
                    <option value="Manhua">🇨🇳 Manhua</option>
                    <option value="OEL">🌐 OEL</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#AAA69D] pointer-events-none" />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex flex-col gap-1 min-w-[110px]">
                <label className="text-[11px] font-mono text-[#AAA69D] uppercase tracking-wider">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      const s = e.target.value;
                      setStatusFilter(s);
                      runSearch(query, 0, undefined, undefined, s);
                    }}
                    className="w-full appearance-none pl-3 pr-7 py-1.5 bg-[#191A1F] border border-[#292A2D] rounded-lg text-xs text-[#F0E9DC] focus:outline-none focus:border-[#C69A45]/60 cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    <option value="Ongoing">Active / Ongoing</option>
                    <option value="Complete">Completed</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#AAA69D] pointer-events-none" />
                </div>
              </div>

              {/* Sort Order */}
              <div className="flex flex-col gap-1 min-w-[120px]">
                <label className="text-[11px] font-mono text-[#AAA69D] uppercase tracking-wider">
                  Sort By
                </label>
                <div className="relative">
                  <select
                    value={sortKey}
                    onChange={(e) => {
                      const s = e.target.value as SortKey;
                      setSortKey(s);
                      runSearch(query, 0, undefined, undefined, undefined, s);
                    }}
                    className="w-full appearance-none pl-3 pr-7 py-1.5 bg-[#191A1F] border border-[#292A2D] rounded-lg text-xs text-[#F0E9DC] focus:outline-none focus:border-[#C69A45]/60 cursor-pointer"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#AAA69D] pointer-events-none" />
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#AAA69D] hover:text-[#E05252] hover:bg-[#E05252]/10 border border-[#292A2D] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}

              {/* Counter */}
              {!loading && results.length > 0 && (
                <span className="ml-auto text-xs text-[#AAA69D] self-end pb-1 font-mono">
                  Showing {displayedResults.length} manuscripts
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" ref={listRef}>
        <div className="max-w-6xl mx-auto w-full px-4 py-6">
          {/* ── Empty State: When no search and no active filters ──────────────── */}
          {!query.trim() && !genreFilter && !typeFilter && !statusFilter && !loading && (
            <div className="space-y-8 max-w-3xl mx-auto py-6">
              {/* Recent History */}
              {history.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="flex items-center gap-2 text-xs font-mono font-semibold text-[#AAA69D] uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-[#C69A45]" />
                      <span>Recent Searches</span>
                    </h2>
                    <button
                      onClick={() => {
                        clearHistory();
                        setHistory([]);
                      }}
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
                        className="px-3.5 py-1.5 rounded-full text-xs bg-[#111318] border border-[#292A2D] text-[#AAA69D] hover:border-[#C69A45]/60 hover:text-[#F0E9DC] transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Recommended Discoveries */}
              <section>
                <h2 className="flex items-center gap-2 text-xs font-mono font-semibold text-[#AAA69D] uppercase tracking-wider mb-3">
                  <TrendingUp className="w-4 h-4 text-[#C69A45]" />
                  <span>Popular Discoveries</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      onClick={() => commitSearch(term)}
                      className="p-3 text-left rounded-xl bg-[#111318] border border-[#292A2D] text-xs font-medium text-[#F0E9DC] hover:border-[#C69A45]/60 hover:bg-[#191A1F] transition-all group"
                    >
                      <span className="text-[#C69A45] mr-1.5 font-mono">#</span>
                      <span className="group-hover:text-[#C69A45] transition-colors">{term}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ── Loading Skeletons ─────────────────────────────────────────────── */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* ── Error State ───────────────────────────────────────────────────── */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <AlertCircle className="w-10 h-10 text-[#E05252]" />
              <p className="text-[#E05252] font-medium text-sm">{error}</p>
              <button
                onClick={() => runSearch(committed || query, 0)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111318] border border-[#292A2D] text-xs font-semibold text-[#AAA69D] hover:text-[#F0E9DC] transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Retry Search
              </button>
            </div>
          )}

          {/* ── No Results Found ──────────────────────────────────────────────── */}
          {!loading && !error && displayedResults.length === 0 && (query.trim() || genreFilter) && (
            <div className="flex flex-col items-center gap-3.5 py-16 text-center">
              <BookOpen className="w-10 h-10 text-[#AAA69D]/60" />
              <h3 className="text-[#F0E9DC] font-serif text-lg font-bold">
                No manuscripts found
              </h3>
              <p className="text-xs text-[#AAA69D] max-w-sm">
                No titles match your current criteria{' '}
                {genreFilter && <span className="text-[#C69A45]">[{genreFilter}]</span>}
                {query.trim() && ` "${query.trim()}"`}.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-[#111318] border border-[#292A2D] text-xs font-semibold text-[#C69A45] hover:bg-[#191A1F] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All Filters
                </button>
              )}
            </div>
          )}

          {/* ── Results Grid ──────────────────────────────────────────────────── */}
          {!loading && displayedResults.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-[#AAA69D] font-mono">
                  <span className="text-[#F0E9DC] font-semibold">{displayedResults.length}</span> results found
                  {genreFilter && (
                    <span className="ml-1 text-[#C69A45]">in {genreFilter}</span>
                  )}
                  {committed && ` for "${committed}"`}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {displayedResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openManga(item.id, item.title, item.cover)}
                    className="group flex flex-col gap-2 p-2 rounded-xl bg-[#111318] border border-[#292A2D] hover:border-[#C69A45]/50 hover:bg-[#191A1F] cursor-pointer transition-all text-left shadow-md hover:shadow-xl"
                  >
                    {/* Cover Art */}
                    <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-[#090A0C] border border-[#292A2D] relative">
                      <img
                        src={getProxyImageUrl(item.cover)}
                        alt={item.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                        }}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      {item.id.startsWith('md:') && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/80 text-[#C69A45] border border-[#C69A45]/40 backdrop-blur-xs">
                          MangaDex
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-serif font-bold text-xs leading-tight line-clamp-2 text-[#F0E9DC] group-hover:text-[#C69A45] transition-colors">
                      {item.title}
                    </h3>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-1 mt-auto pt-1">
                      {item.type && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#090A0C] text-[#C69A45] border border-[#292A2D]">
                          {item.type}
                        </span>
                      )}
                      {item.status && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                            item.status.toLowerCase().includes('ongoing')
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60'
                              : 'bg-sky-950/40 text-sky-400 border-sky-900/60'
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>

                    {/* Arrow Action */}
                    <div className="flex items-center justify-between text-[10px] text-[#AAA69D] pt-1">
                      <span className="truncate text-[#AAA69D]/70 font-mono">
                        {item.tags?.[0] || 'Read'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#AAA69D] group-hover:text-[#C69A45] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Pagination: Load More ────────────────────────────────────── */}
              {hasMore && (
                <div className="flex justify-center mt-10 mb-6">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#111318] border border-[#292A2D] text-xs font-semibold text-[#AAA69D] hover:text-[#F0E9DC] hover:border-[#C69A45]/50 transition-all disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#C69A45]" />
                        <span>Retrieving manuscripts…</span>
                      </>
                    ) : (
                      <>
                        <span>Load Next Batch</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
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

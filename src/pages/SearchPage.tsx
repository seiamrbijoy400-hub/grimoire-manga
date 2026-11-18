import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore.ts';
import { searchMangaApi, getProxyImageUrl } from '../services/api.ts';
import { MangaItem } from '../types.ts';
import { FALLBACK_COVER } from '../components/SearchModal.tsx'; // reuse constant

/**
 * Dedicated search page (`/search`) that mirrors the functionality of the
 * global `SearchModal` but lives on its own route. It reads the `q` query
 * parameter, performs a debounced API lookup, and displays results.
 *
 * URL format: `/search?q=your+search+term`
 */
export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') ?? '';
  const [query, setQuery] = useState<string>(queryParam);
  const [results, setResults] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { openManga, setSearchOpen } = useStore();

  // Focus input when page loads
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync URL when query changes (after debounce)
  useEffect(() => {
    const handler = setTimeout(() => {
      // Update URL without adding a new entry to history when query is empty
      if (query) {
        setSearchParams({ q: query });
      } else {
        setSearchParams({});
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query, setSearchParams]);

  // Perform debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const items = await searchMangaApi(query.trim(), false);
      setResults(items);
      setLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  // Close global modal if it somehow stays open while on page
  useEffect(() => {
    setSearchOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#090A0C] text-[#F0E9DC] flex flex-col">
      {/* Header with input */}
      <header className="flex items-center gap-3 p-4 border-b border-[#292A2D] bg-[#111318]">
        <button
          onClick={() => setSearchOpen(true)}
          className="p-1 rounded text-[#AAA69D] hover:text-[#F0E9DC] hover:bg-[#191A1F] transition-colors"
          aria-label="Open modal search"
        >
          <X className="w-4 h-4" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search manga, manhwa, authors, genres..."
          className="flex-1 bg-transparent text-[#F0E9DC] placeholder-[#AAA69D]/60 text-sm focus:outline-none font-sans"
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#C69A45]" />}
      </header>

      {/* Results */}
      <section className="flex-1 overflow-y-auto p-2 space-y-1">
        {results.length > 0 ? (
          results.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => {
                openManga(item.id, item.title, item.cover);
              }}
              className="flex items-center gap-3.5 p-2.5 rounded-lg cursor-pointer hover:bg-[#191A1F]/60 transition-colors"
            >
              <div className="w-11 h-15 rounded overflow-hidden bg-[#090A0C] shrink-0 border border-[#292A2D]">
                <img
                  src={getProxyImageUrl(item.cover)}
                  alt={item.title}
                  onError={e => {
                    (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                  }}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-serif text-sm font-bold truncate text-[#F0E9DC]">
                  {item.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-[#AAA69D]">
                  {item.type && (
                    <span className="px-1.5 py-0.2 rounded bg-[#090A0C] text-[#C69A45] border border-[#292A2D] font-mono">
                      {item.type}
                    </span>
                  )}
                  {item.status && <span>{item.status}</span>}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#AAA69D]" />
            </div>
          ))
        ) : query && !loading ? (
          <div className="py-12 text-center text-[#AAA69D]">
            <p className="text-xs">No manuscripts found matching "{query}".</p>
          </div>
        ) : null}
      </section>
    </div>
  );
};

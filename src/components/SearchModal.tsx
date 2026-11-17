import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Sparkles, BookOpen } from 'lucide-react';
import { useStore } from '../store/useStore.ts';
import { searchMangaApi, getProxyImageUrl } from '../services/api.ts';
import { MangaItem } from '../types.ts';

const POPULAR_SEARCHES = [
  'Solo Leveling',
  'One Piece',
  'Jujutsu Kaisen',
  'Berserk',
  'Chainsaw Man',
  'Omniscient Reader',
  'Vagabond',
];

export const SearchModal: React.FC = () => {
  const { searchOpen, setSearchOpen, openManga } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [searchOpen]);

  // Global key shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  // Live debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const items = await searchMangaApi(query.trim(), true);
      setResults(items);
      setLoading(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [query]);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-void-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl bg-void-900 border border-victorian-gold/30 rounded-2xl shadow-2xl shadow-victorian-gold/10 overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-void-800 gap-3">
          <Search className="w-5 h-5 text-victorian-gold shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search grimoires by title, author, or genre..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-base focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-victorian-gold animate-spin shrink-0" />}
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-void-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Popular Tags when query is empty */}
        {!query && (
          <div className="p-4 border-b border-void-800/60 bg-void-950/40">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-victorian-gold" />
              <span>Trending Invocations</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((title) => (
                <button
                  key={title}
                  onClick={() => setQuery(title)}
                  className="px-3 py-1 rounded-lg bg-void-850 hover:bg-void-800 border border-void-700/60 text-xs text-slate-300 hover:text-victorian-gold transition-colors"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-void-850">
          {results.length > 0 ? (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSearchOpen(false);
                  openManga(item.id);
                }}
                className="flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-void-800/80 cursor-pointer group transition-all"
              >
                <div className="w-12 h-16 rounded-lg overflow-hidden bg-void-950 shrink-0 border border-void-700/50">
                  <img
                    src={getProxyImageUrl(item.cover)}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif text-sm font-semibold text-slate-200 group-hover:text-victorian-gold transition-colors truncate">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-void-850 text-slate-400 border border-void-700/50">
                      WeebCentral
                    </span>
                    {item.type && (
                      <span className="text-[11px] text-genz-amethyst font-medium">
                        {item.type}
                      </span>
                    )}
                  </div>
                </div>
                <BookOpen className="w-4 h-4 text-slate-500 group-hover:text-victorian-gold transition-colors shrink-0" />
              </div>
            ))
          ) : query && !loading ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm">No grimoires found matching "{query}".</p>
              <p className="text-xs mt-1 text-slate-600">Try searching for alternative titles or characters.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

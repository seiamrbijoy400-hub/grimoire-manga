import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Sparkles, BookOpen, Clock, ArrowRight } from 'lucide-react';
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
  'Gachiakuta',
];

export const SearchModal: React.FC = () => {
  const { searchOpen, setSearchOpen, openManga } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MangaItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(-1);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [searchOpen]);

  // Global key shortcut Ctrl+K & Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }

      if (searchOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
          e.preventDefault();
          const target = results[selectedIndex];
          setSearchOpen(false);
          openManga(target.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen, results, selectedIndex, openManga]);

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
      setSelectedIndex(-1);
      setLoading(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-void-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl bg-void-900 border border-void-700/80 rounded-2xl shadow-2xl shadow-solar-500/10 overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-void-750 gap-3 bg-void-950/60">
          <Search className="w-5 h-5 text-solar-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, authors, genres (↑/↓ to navigate)..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none font-mono"
          />
          {loading && <Loader2 className="w-4 h-4 text-solar-400 animate-spin shrink-0" />}
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-void-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Popular Tags when query is empty */}
        {!query && (
          <div className="p-4 border-b border-void-750 bg-void-950/40">
            <div className="flex items-center gap-2 mb-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-solar-400" />
              <span>Trending Discoveries</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((title) => (
                <button
                  key={title}
                  onClick={() => setQuery(title)}
                  className="px-3 py-1 rounded-xl bg-void-850 hover:bg-void-800 border border-void-750 text-xs text-slate-300 hover:text-solar-400 font-mono transition-colors"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {results.length > 0 ? (
            results.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSearchOpen(false);
                    openManga(item.id);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3.5 p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-void-800 border border-solar-500/50 shadow-md'
                      : 'hover:bg-void-850 border border-transparent'
                  }`}
                >
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-void-950 shrink-0 border border-void-700">
                    <img
                      src={getProxyImageUrl(item.cover)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-serif text-sm font-bold truncate transition-colors ${
                        isSelected ? 'text-solar-400' : 'text-slate-200'
                      }`}
                    >
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-void-850 text-slate-400 border border-void-700 font-mono">
                        WeebCentral
                      </span>
                      {item.type && (
                        <span className="text-[10px] text-solar-400 font-mono font-bold">
                          {item.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 transition-all shrink-0 ${
                      isSelected
                        ? 'text-solar-400 translate-x-1 opacity-100'
                        : 'text-slate-600 opacity-0'
                    }`}
                  />
                </div>
              );
            })
          ) : query && !loading ? (
            <div className="py-12 text-center text-slate-500 space-y-1 font-mono">
              <p className="text-xs">No manuscripts found matching "{query}".</p>
              <p className="text-[10px] text-slate-600">Try searching for alternative spellings or authors.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

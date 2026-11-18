import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore.ts';
import { searchMangaApi, getProxyImageUrl } from '../services/api.ts';
import { MangaItem } from '../types.ts';

export const FALLBACK_COVER = '/logo.png';

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
  const navigate = useNavigate();
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

      if (searchOpen) {
        if (results.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && results[selectedIndex]) {
              const target = results[selectedIndex];
              setSearchOpen(false);
              openManga(target.id, target.title, target.cover);
            } else if (query.trim()) {
              setSearchOpen(false);
              navigate(`/search?q=${encodeURIComponent(query)}`);
            }
          }
        } else if (e.key === 'Enter' && query.trim()) {
          e.preventDefault();
          setSearchOpen(false);
          navigate(`/search?q=${encodeURIComponent(query)}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen, results, selectedIndex, openManga, query, navigate]);


  // Live debounced search
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
      setSelectedIndex(-1);
      setLoading(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  if (!searchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[#090A0C]/80 backdrop-blur-sm animate-fade-in"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-[#111318] border border-[#292A2D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#292A2D] gap-3 bg-[#090A0C]/90">
          <img src="/logo.png" alt="KUROSCROLL" className="w-5 h-5 object-contain shrink-0" />
          <Search className="w-4 h-4 text-[#C69A45] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search manga, manhwa, authors, genres... (↑/↓ to navigate)"
            className="flex-1 bg-transparent text-[#F0E9DC] placeholder-[#AAA69D]/60 text-sm focus:outline-none font-sans"
          />
          {loading && <Loader2 className="w-4 h-4 text-[#C69A45] animate-spin shrink-0" />}
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1 rounded text-[#AAA69D] hover:text-[#F0E9DC] hover:bg-[#191A1F] transition-colors"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Popular Tags when query is empty */}
        {!query && (
          <div className="p-4 border-b border-[#292A2D] bg-[#090A0C]/40">
            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-[#AAA69D] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#C69A45]" />
              <span>Recommended Discoveries</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((title) => (
                <button
                  key={title}
                  onClick={() => setQuery(title)}
                  className="px-3 py-1 rounded-lg bg-[#191A1F] hover:bg-[#21232A] border border-[#292A2D] text-xs text-[#AAA69D] hover:text-[#C69A45] font-sans transition-colors"
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
                    openManga(item.id, item.title, item.cover);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3.5 p-2.5 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#191A1F] border border-[#C69A45]/40 shadow-sm'
                      : 'hover:bg-[#191A1F]/60 border border-transparent'
                  }`}
                >
                  <div className="w-11 h-15 rounded overflow-hidden bg-[#090A0C] shrink-0 border border-[#292A2D]">
                    <img
                      src={getProxyImageUrl(item.cover)}
                      alt={item.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                      }}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-serif text-sm font-bold truncate transition-colors ${
                        isSelected ? 'text-[#C69A45]' : 'text-[#F0E9DC]'
                      }`}
                    >
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {item.type && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#090A0C] text-[#C69A45] border border-[#292A2D] font-mono">
                          {item.type}
                        </span>
                      )}
                      {item.status && (
                        <span className="text-[10px] text-[#AAA69D] font-mono">
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 transition-all shrink-0 ${
                      isSelected
                        ? 'text-[#C69A45] translate-x-1 opacity-100'
                        : 'text-[#AAA69D] opacity-0'
                    }`}
                  />
                </div>
              );
            })
          ) : query && !loading ? (
            <div className="py-12 text-center text-[#AAA69D] space-y-1 font-sans">
              <p className="text-xs">No manuscripts found matching "{query}".</p>
              <p className="text-[11px] text-[#AAA69D]/60 font-mono">Try searching with alternative romanized spellings or keywords.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

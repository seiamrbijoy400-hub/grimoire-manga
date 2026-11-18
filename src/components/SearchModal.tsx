import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  ArrowRight
} from 'lucide-react';;
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore.ts';
import { searchMangaApi, getProxyImageUrl } from '../services/api.ts';
import { MangaItem } from '../types.ts';
import { BrandLogo } from './BrandMark.tsx';
import { lockBodyScroll } from '../lib/ui.ts';
import { FALLBACK_COVER } from '../lib/placeholder.ts';
export { FALLBACK_COVER };

export const POPULAR_SEARCHES = [
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
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (searchOpen) {
      if (window.matchMedia('(min-width: 640px)').matches) setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(-1);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const cleanup = lockBodyScroll(true);
    return () => { if (cleanup) cleanup(); };
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

    const myReq = ++reqIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchMangaApi(query.trim(), false);
        if (myReq !== reqIdRef.current) return;
        setResults(items);
        setSelectedIndex(-1);
      } catch {
        if (myReq !== reqIdRef.current) return;
        setResults([]);
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && results[selectedIndex]) {
      const target = results[selectedIndex];
      setSearchOpen(false);
      openManga(target.id, target.title, target.cover);
    } else if (query.trim()) {
      setSearchOpen(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  if (!searchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-start justify-center bg-ink-950/85 px-4 pt-16 backdrop-blur-sm animate-fade-in sm:pt-24"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-ink-700 bg-ink-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <form
          onSubmit={handleFormSubmit}
          className="flex items-center gap-3 border-b border-ink-700 px-4 py-3"
        >
          <BrandLogo compact decorative className="h-6 w-6 shrink-0" />
          <Search className="h-4 w-4 shrink-0 text-stamp" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleFormSubmit(e);
              }
            }}
            placeholder="Search the index…"
            aria-label="Search the index"
            className="min-w-0 flex-1 bg-transparent text-[16px] sm:text-[13.5px] text-paper placeholder:text-paper-dim/60 focus:outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-stamp" />}
          <kbd className="hidden shrink-0 border border-ink-700 px-1.5 py-0.5 font-mono text-[9px] text-paper-dim sm:block">
            ESC
          </kbd>
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="shrink-0 p-1 text-paper-dim transition-colors hover:text-paper"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </form>

        {!query && (
          <div className="border-b border-ink-700 px-4 py-3">
            <p className="eyebrow mb-2.5">Start here</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SEARCHES.map((title, i) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    navigate(`/search?q=${encodeURIComponent(title)}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-paper-dim transition-colors hover:border-ink-600 hover:text-paper"
                >
                  <span className="tnum text-stamp/80">{String(i + 1).padStart(2, '0')}</span>
                  {title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
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
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-2 py-2 transition-colors ${
                    isSelected ? 'border-ink-600 bg-ink-900' : 'border-transparent hover:bg-ink-900/70'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded-sm border border-ink-700 bg-ink-950">
                    <img
                      src={getProxyImageUrl(item.cover)}
                      alt=""
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                      }}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4
                      className={`truncate font-display text-[13px] font-semibold ${
                        isSelected ? 'text-stamp' : 'text-paper'
                      }`}
                    >
                      {item.title}
                    </h4>
                    <div className="mt-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-paper-dim">
                      {item.type && <span>{item.type}</span>}
                      {item.status && (
                        <>
                          <span className="text-ink-600">/</span>
                          <span>{item.status}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    className={`h-4 w-4 shrink-0 transition-all ${
                      isSelected ? 'translate-x-0 text-stamp opacity-100' : 'text-paper-dim opacity-0'
                    }`}
                  />
                </div>
              );
            })
          ) : query && !loading ? (
            <div className="space-y-1 py-12 text-center">
              <p className="text-[12.5px] text-paper-dim">Nothing in the index for “{query}”.</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper-dim/60">
                Try a romanised spelling or a shorter query
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
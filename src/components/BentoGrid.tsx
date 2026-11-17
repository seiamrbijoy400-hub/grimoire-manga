import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Flame,
  Sparkles,
  Clock,
  Bookmark,
  BookOpen,
  Compass,
  ChevronRight,
  Loader2,
  ArrowUp,
  Layers,
  Search
} from 'lucide-react';
import { MangaItem } from '../types.ts';
import { fetchTrending, fetchLatest, searchMangaApi } from '../services/api.ts';
import { MangaCard } from './MangaCard.tsx';
import { useStore } from '../store/useStore.ts';

const GENRE_CHIPS = [
  { id: 'all', label: '🔥 All Grimoires' },
  { id: 'action', label: '⚔️ Shonen & Action', query: 'action' },
  { id: 'manhwa', label: '👑 Manhwa / Webtoon', query: 'manhwa' },
  { id: 'fantasy', label: '✨ Fantasy & Magic', query: 'fantasy' },
  { id: 'dark', label: '💀 Dark & Psychological', query: 'dark' },
  { id: 'romance', label: '🌸 Romance & Drama', query: 'romance' },
];

export const BentoGrid: React.FC = () => {
  const { bookmarks, history, openManga, openChapter, setSearchOpen } = useStore();
  const [activeTab, setActiveTab] = useState<'trending' | 'latest' | 'genre' | 'bookmarks' | 'history'>('trending');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  
  const [items, setItems] = useState<MangaItem[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  // Load initial batch when tab or genre changes
  const loadInitialData = useCallback(async () => {
    setLoadingInitial(true);
    setOffset(0);
    setHasMore(true);

    try {
      let data: MangaItem[] = [];
      if (activeTab === 'trending') {
        data = await fetchTrending(0);
      } else if (activeTab === 'latest') {
        data = await fetchLatest(0);
      } else if (activeTab === 'genre') {
        const chip = GENRE_CHIPS.find((c) => c.id === selectedGenre);
        data = await searchMangaApi(chip?.query || '', false, 0);
      }
      setItems(data);
      if (data.length < 30) setHasMore(false);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, [activeTab, selectedGenre]);

  useEffect(() => {
    if (activeTab !== 'bookmarks' && activeTab !== 'history') {
      loadInitialData();
    } else {
      setLoadingInitial(false);
    }
  }, [activeTab, selectedGenre, loadInitialData]);

  // Load more function for infinite scrolling
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || loadingInitial) return;
    if (activeTab === 'bookmarks' || activeTab === 'history') return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextOffset = offset + 32;

    try {
      let nextBatch: MangaItem[] = [];
      if (activeTab === 'trending') {
        nextBatch = await fetchTrending(nextOffset);
      } else if (activeTab === 'latest') {
        nextBatch = await fetchLatest(nextOffset);
      } else if (activeTab === 'genre') {
        const chip = GENRE_CHIPS.find((c) => c.id === selectedGenre);
        nextBatch = await searchMangaApi(chip?.query || '', false, nextOffset);
      }

      if (nextBatch.length === 0) {
        setHasMore(false);
      } else {
        // Deduplicate
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
  }, [offset, hasMore, loadingInitial, activeTab, selectedGenre]);

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

  const historyList = Object.values(history).sort((a, b) => b.updatedAt - a.updatedAt);
  const featured = items[0];
  const lastRead = historyList[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 pb-24">
      {/* 2026 Gen-Z Hero Bento Showcase */}
      {featured && activeTab === 'trending' && (
        <div className="relative rounded-3xl overflow-hidden bg-void-900 border border-victorian-gold/30 p-6 sm:p-8 shadow-2xl shadow-victorian-gold/10 group">
          <div className="absolute inset-0 bg-gradient-to-r from-void-950 via-void-950/90 to-void-950/40 z-10" />
          
          {/* Backdrop Cover with blur */}
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-30 group-hover:opacity-45 transition-opacity"
            style={{ backgroundImage: `url(${featured.cover})` }}
          />

          <div className="relative z-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-void-950 text-xs font-serif font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  #1 Most Read Grimoire
                </span>
                <span className="text-xs text-slate-400 font-mono">WeebCentral Live Feed</span>
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
                  onClick={() => openManga(featured.id)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-victorian-gold to-amber-500 hover:from-amber-400 hover:to-victorian-gold text-void-950 font-serif font-bold text-sm shadow-xl shadow-victorian-gold/25 hover:scale-105 transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Decipher Grimoire</span>
                </button>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-void-850/80 hover:bg-void-800 border border-void-700/80 text-xs text-slate-300 hover:text-victorian-gold transition-colors flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Instant Search</span>
                </button>
              </div>
            </div>

            {/* Thumbnail Mini-Card */}
            <div
              onClick={() => openManga(featured.id)}
              className="w-32 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-victorian-gold/40 shrink-0 cursor-pointer hover:scale-105 transition-transform"
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

      {/* Helpful "Continue Reading" Quick Bar (if user has active history) */}
      {lastRead && (
        <div
          onClick={() => openChapter(lastRead.mangaId, lastRead.chapterId, lastRead.chapterTitle)}
          className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-void-900 via-purple-950/30 to-void-900 border border-genz-amethyst/40 hover:border-genz-amethyst flex items-center justify-between gap-4 cursor-pointer group shadow-lg transition-all"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-13 rounded-lg overflow-hidden bg-void-950 shrink-0 border border-genz-amethyst/30">
              <img src={lastRead.mangaCover} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-genz-amethyst animate-ping" />
                <span className="text-[10px] uppercase font-mono tracking-wider text-genz-amethyst font-bold">
                  Resume Chronicle
                </span>
              </div>
              <h4 className="font-serif text-sm font-bold text-slate-100 truncate group-hover:text-genz-amethyst transition-colors">
                {lastRead.mangaTitle}
              </h4>
              <p className="text-xs text-victorian-gold font-mono">
                {lastRead.chapterTitle} • In-Progress
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-genz-amethyst/20 text-purple-200 text-xs font-serif font-bold group-hover:bg-genz-amethyst group-hover:text-void-950 transition-all shrink-0">
            <span>Continue</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="space-y-3 border-b border-void-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => {
              setActiveTab('trending');
              setSelectedGenre('all');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'trending'
                ? 'bg-victorian-gold text-void-950 shadow-md shadow-victorian-gold/25 font-bold'
                : 'bg-void-900 text-slate-400 hover:text-slate-200 hover:bg-void-850'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Trending</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('latest');
              setSelectedGenre('all');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'latest'
                ? 'bg-victorian-gold text-void-950 shadow-md shadow-victorian-gold/25 font-bold'
                : 'bg-void-900 text-slate-400 hover:text-slate-200 hover:bg-void-850'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Latest Updates</span>
          </button>

          <button
            onClick={() => setActiveTab('genre')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'genre'
                ? 'bg-victorian-gold text-void-950 shadow-md shadow-victorian-gold/25 font-bold'
                : 'bg-void-900 text-slate-400 hover:text-slate-200 hover:bg-void-850'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Genres & Tags</span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'bookmarks'
                ? 'bg-victorian-gold text-void-950 shadow-md shadow-victorian-gold/25 font-bold'
                : 'bg-void-900 text-slate-400 hover:text-slate-200 hover:bg-void-850'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Grimoire Bookmarks ({bookmarks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'history'
                ? 'bg-victorian-gold text-void-950 shadow-md shadow-victorian-gold/25 font-bold'
                : 'bg-void-900 text-slate-400 hover:text-slate-200 hover:bg-void-850'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Chronicles ({historyList.length})</span>
          </button>
        </div>

        {/* 2026 Genre Filter Chips (when in Genre tab) */}
        {activeTab === 'genre' && (
          <div className="flex flex-wrap items-center gap-2 pt-1 animate-fade-in">
            {GENRE_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setSelectedGenre(chip.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedGenre === chip.id
                    ? 'bg-genz-amethyst text-white shadow-md shadow-genz-amethyst/30 font-bold'
                    : 'bg-void-850 border border-void-700 text-slate-300 hover:text-victorian-gold'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Catalog Grid */}
      {loadingInitial ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-void-900 animate-pulse border border-void-800" />
          ))}
        </div>
      ) : activeTab === 'bookmarks' ? (
        bookmarks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {bookmarks.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-3">
            <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="font-serif text-lg text-slate-300">Your Grimoire is Empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the bookmark icon on any manga to preserve it here.
            </p>
          </div>
        )
      ) : activeTab === 'history' ? (
        historyList.length > 0 ? (
          <div className="space-y-3">
            {historyList.map((item) => (
              <div
                key={item.mangaId}
                onClick={() => openChapter(item.mangaId, item.chapterId, item.chapterTitle)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-void-900 hover:bg-void-850 border border-void-800 hover:border-genz-amethyst/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-16 rounded-xl overflow-hidden bg-void-950 shrink-0">
                    <img src={item.mangaCover} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm sm:text-base font-bold text-slate-200 group-hover:text-genz-amethyst transition-colors">
                      {item.mangaTitle}
                    </h4>
                    <p className="text-xs text-victorian-gold font-mono mt-0.5">
                      Last Read: {item.chapterTitle}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 group-hover:text-slate-100">
                  <span>Resume</span>
                  <ChevronRight className="w-4 h-4 text-genz-amethyst group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-3">
            <Compass className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="font-serif text-lg text-slate-300">No Chronicles Recorded</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start reading any chapter to record your journey.
            </p>
          </div>
        )
      ) : (
        /* Infinite Scrolling Catalog Grid */
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {items.map((manga, idx) => (
              <MangaCard
                key={manga.id}
                manga={manga}
                rank={activeTab === 'trending' ? idx + 1 : undefined}
              />
            ))}
          </div>

          {/* Infinite Scroll Sentinel Target */}
          <div ref={observerTarget} className="h-10 w-full" />

          {/* Loading More Spinner / Sentinel Indicator */}
          {loadingMore && (
            <div className="py-8 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-7 h-7 text-victorian-gold animate-spin" />
              <p className="font-serif text-xs text-amber-200">
                Summoning more grimoires from WeebCentral...
              </p>
            </div>
          )}

          {/* Explicit "Load More" Action Button (Gen-Z user friendly) */}
          {hasMore && !loadingMore && (
            <div className="pt-4 flex justify-center">
              <button
                onClick={loadMore}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-void-900 to-void-850 hover:bg-void-800 border border-victorian-gold/40 hover:border-victorian-gold text-victorian-gold font-serif font-bold text-xs tracking-wide shadow-xl shadow-victorian-gold/10 hover:scale-105 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-victorian-gold" />
                <span>Summon More Grimoires (Loaded {items.length})</span>
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
        </div>
      )}

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-void-900/90 backdrop-blur-xl border border-victorian-gold/50 text-victorian-gold hover:bg-victorian-gold hover:text-void-950 shadow-2xl shadow-victorian-gold/25 transition-all hover:scale-110"
          title="Return to Zenith"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

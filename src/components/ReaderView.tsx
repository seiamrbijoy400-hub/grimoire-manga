import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Play,
  Pause,
  Sliders,
  Sparkles,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Scroll,
  Loader2,
  Flame
} from 'lucide-react';
import { useStore } from '../store/useStore.ts';
import { fetchChapterImages, fetchChapterList, getProxyImageUrl } from '../services/api.ts';
import { ChapterItem } from '../types.ts';

interface ChapterBlock {
  chapterId: string;
  chapterTitle: string;
  images: string[];
}

export const ReaderView: React.FC = () => {
  const {
    activeMangaId,
    activeChapterId,
    activeChapterTitle,
    openChapter,
    setView,
    readerSettings,
    updateReaderSettings,
    updateHistory,
  } = useStore();

  const [loadedChapters, setLoadedChapters] = useState<ChapterBlock[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingNext, setLoadingNext] = useState(false);
  const [currentDisplayTitle, setCurrentDisplayTitle] = useState(activeChapterTitle || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [showHud, setShowHud] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const lastScrollY = useRef(0);
  const autoScrollRaf = useRef<number | null>(null);
  const loadingNextRef = useRef(false);

  // Load initial chapter and chapter catalog
  useEffect(() => {
    if (!activeChapterId || !activeMangaId) return;

    let mounted = true;
    async function load() {
      setLoadingInitial(true);
      window.scrollTo({ top: 0 });

      const [imgList, chList] = await Promise.all([
        fetchChapterImages(activeChapterId!),
        fetchChapterList(activeMangaId!),
      ]);

      if (mounted) {
        setChapters(chList);
        const initialTitle = chList.find((c) => c.id === activeChapterId)?.title || activeChapterTitle || 'Chapter';
        setLoadedChapters([
          {
            chapterId: activeChapterId!,
            chapterTitle: initialTitle,
            images: imgList,
          },
        ]);
        setCurrentDisplayTitle(initialTitle);
        setLoadingInitial(false);
        setCurrentPage(1);
      }
    }
    load();

    return () => {
      mounted = false;
      if (autoScrollRaf.current) cancelAnimationFrame(autoScrollRaf.current);
    };
  }, [activeChapterId, activeMangaId]);

  // Total pages across all loaded chapters
  const totalLoadedImages = loadedChapters.reduce((acc, ch) => acc + ch.images.length, 0);

  // Function to load the next chapter seamlessly
  const loadNextChapterSeamlessly = useCallback(async () => {
    if (loadingNextRef.current || loadedChapters.length === 0 || chapters.length === 0) return;

    const lastLoaded = loadedChapters[loadedChapters.length - 1];
    const lastIdx = chapters.findIndex((c) => c.id === lastLoaded.chapterId);

    // WeebCentral lists chapters newest to oldest. Reading order is oldest to newest, so next chapter is index - 1
    if (lastIdx <= 0) {
      // Reached the newest released chapter!
      return;
    }

    const nextChapterMeta = chapters[lastIdx - 1];
    if (!nextChapterMeta) return;

    loadingNextRef.current = true;
    setLoadingNext(true);

    try {
      const nextImages = await fetchChapterImages(nextChapterMeta.id);
      if (nextImages && nextImages.length > 0) {
        setLoadedChapters((prev) => [
          ...prev,
          {
            chapterId: nextChapterMeta.id,
            chapterTitle: nextChapterMeta.title,
            images: nextImages,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to append next chapter:', err);
    } finally {
      loadingNextRef.current = false;
      setLoadingNext(false);
    }
  }, [loadedChapters, chapters]);

  // Track scroll position, active chapter title, and trigger infinite next chapter
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(100, Math.round((currentScroll / docHeight) * 100)) : 0;
      setScrollProgress(progress);

      // Auto-hide HUD on downward scroll, reveal on upward scroll
      if (currentScroll > lastScrollY.current + 35 && currentScroll > 150) {
        setShowHud(false);
      } else if (currentScroll < lastScrollY.current - 20) {
        setShowHud(true);
      }
      lastScrollY.current = currentScroll;

      // Infinite Chapter Trigger: When within 1400px of bottom or > 80% scroll
      if (docHeight > 0 && docHeight - currentScroll < 1600 && !loadingNextRef.current) {
        loadNextChapterSeamlessly();
      }

      // Track active chapter block currently in viewport
      for (const block of loadedChapters) {
        const el = document.getElementById(`chapter-block-${block.chapterId}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.5 && rect.bottom >= window.innerHeight * 0.2) {
            if (currentDisplayTitle !== block.chapterTitle) {
              setCurrentDisplayTitle(block.chapterTitle);
              if (activeMangaId) {
                updateHistory({
                  mangaId: activeMangaId,
                  mangaTitle: 'Manga Grimoire',
                  mangaCover: block.images[0] || '',
                  chapterId: block.chapterId,
                  chapterTitle: block.chapterTitle,
                  pageIndex: 1,
                  totalImages: block.images.length,
                });
              }
            }
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadedChapters, currentDisplayTitle, activeMangaId, updateHistory, loadNextChapterSeamlessly]);

  // Auto-scroll loop
  useEffect(() => {
    if (!autoScrollActive) {
      if (autoScrollRaf.current) cancelAnimationFrame(autoScrollRaf.current);
      return;
    }

    const speed = readerSettings.autoScrollSpeed || 3;
    const step = () => {
      window.scrollBy({ top: speed * 0.75, behavior: 'auto' });
      autoScrollRaf.current = requestAnimationFrame(step);
    };
    autoScrollRaf.current = requestAnimationFrame(step);

    return () => {
      if (autoScrollRaf.current) cancelAnimationFrame(autoScrollRaf.current);
    };
  }, [autoScrollActive, readerSettings.autoScrollSpeed]);

  return (
    <div
      className={`min-h-screen relative select-none transition-colors duration-500 ${
        readerSettings.visualTheme === 'parchment'
          ? 'theme-parchment'
          : readerSettings.visualTheme === 'amethyst'
          ? 'theme-amethyst'
          : 'bg-void-950'
      }`}
    >
      {/* Dynamic Ambient Glow Layer */}
      {readerSettings.ambientGlow && (
        <div className="ambient-glow-layer opacity-40" />
      )}

      {/* Floating Victorian Satin Ribbon Bookmark Indicator */}
      <div
        className="fixed top-0 right-4 sm:right-8 z-30 flex flex-col items-center pointer-events-none transition-all duration-300"
        style={{
          transform: `translateY(${Math.min(14, scrollProgress * 0.15)}px)`,
        }}
      >
        <div className="w-8 sm:w-10 pt-2 pb-4 bg-gradient-to-b from-victorian-crimson via-red-800 to-red-950 rounded-b-md shadow-2xl border-x border-b border-red-500/30 flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-victorian-gold/80 mb-1 shadow-inner" />
          <span className="text-[10px] sm:text-xs font-serif font-black text-amber-200">
            {scrollProgress}%
          </span>
          <span className="text-[8px] font-mono text-amber-300/80">
            {loadedChapters.length} ch
          </span>
        </div>
      </div>

      {/* Floating Top Navigation HUD */}
      <nav
        className={`fixed top-0 inset-x-0 z-40 backdrop-blur-xl bg-void-950/85 border-b border-void-800/80 px-4 py-2.5 transition-transform duration-300 ${
          showHud ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('details')}
              className="p-2 rounded-xl bg-void-900 hover:bg-void-850 text-slate-300 hover:text-victorian-gold transition-colors border border-void-800"
              title="Return to Details"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="truncate max-w-[200px] sm:max-w-md">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-serif font-bold text-slate-100 truncate">
                  {currentDisplayTitle}
                </h2>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-victorian-gold/20 text-victorian-gold border border-victorian-gold/40 font-mono hidden sm:inline">
                  Infinite Scroll Active
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {totalLoadedImages} Pages in Stream • Victorian Endless Strip
              </p>
            </div>
          </div>

          {/* Quick HUD Controls */}
          <div className="flex items-center gap-2">
            {/* Auto-scroll Play/Pause */}
            <button
              onClick={() => setAutoScrollActive(!autoScrollActive)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                autoScrollActive
                  ? 'bg-victorian-gold text-void-950 border-victorian-gold shadow-md shadow-victorian-gold/30'
                  : 'bg-void-900 border-void-800 text-slate-300 hover:text-victorian-gold'
              }`}
            >
              {autoScrollActive ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Auto-Scroll</span>
            </button>

            {/* Reader Settings Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl border transition-colors ${
                showSettings
                  ? 'bg-victorian-gold/20 text-victorian-gold border-victorian-gold'
                  : 'bg-void-900 border-void-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Reader Preferences"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Reader Settings Dropdown Modal */}
      {showSettings && (
        <div className="fixed top-16 right-4 sm:right-12 z-50 w-72 p-4 rounded-2xl bg-void-900/95 backdrop-blur-2xl border border-victorian-gold/40 shadow-2xl shadow-victorian-gold/15 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-void-800 pb-2">
            <span className="text-xs font-serif font-bold text-victorian-gold flex items-center gap-1.5">
              <Scroll className="w-3.5 h-3.5" />
              Scroll Preferences
            </span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-200 text-xs font-mono"
            >
              ✕
            </button>
          </div>

          {/* Theme Palette */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400">Visual Aesthetic</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => updateReaderSettings({ visualTheme: 'void' })}
                className={`py-1.5 rounded-lg text-[10px] font-serif border ${
                  readerSettings.visualTheme === 'void'
                    ? 'bg-void-800 border-victorian-gold text-victorian-gold font-bold'
                    : 'bg-void-950 border-void-800 text-slate-400'
                }`}
              >
                OLED Void
              </button>
              <button
                onClick={() => updateReaderSettings({ visualTheme: 'parchment' })}
                className={`py-1.5 rounded-lg text-[10px] font-serif border ${
                  readerSettings.visualTheme === 'parchment'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold'
                    : 'bg-void-950 border-void-800 text-slate-400'
                }`}
              >
                Parchment
              </button>
              <button
                onClick={() => updateReaderSettings({ visualTheme: 'amethyst' })}
                className={`py-1.5 rounded-lg text-[10px] font-serif border ${
                  readerSettings.visualTheme === 'amethyst'
                    ? 'bg-purple-950/60 border-purple-500 text-purple-300 font-bold'
                    : 'bg-void-950 border-void-800 text-slate-400'
                }`}
              >
                Amethyst
              </button>
            </div>
          </div>

          {/* Auto-Scroll Velocity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Auto-Scroll Velocity</span>
              <span className="text-victorian-gold">{readerSettings.autoScrollSpeed}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              value={readerSettings.autoScrollSpeed}
              onChange={(e) => updateReaderSettings({ autoScrollSpeed: Number(e.target.value) })}
              className="w-full accent-victorian-gold cursor-pointer"
            />
          </div>

          {/* Strip Gap */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Panel Gap</span>
              <span className="text-victorian-gold">{readerSettings.stripGap}px</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[0, 4, 8, 16].map((gap) => (
                <button
                  key={gap}
                  onClick={() => updateReaderSettings({ stripGap: gap })}
                  className={`py-1 rounded-md text-[10px] font-mono border ${
                    readerSettings.stripGap === gap
                      ? 'bg-victorian-gold/20 border-victorian-gold text-victorian-gold'
                      : 'bg-void-950 border-void-800 text-slate-400'
                  }`}
                >
                  {gap === 0 ? 'Gapless' : `${gap}px`}
                </button>
              ))}
            </div>
          </div>

          {/* Ambient Glow Toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-mono text-slate-300">Ambient Backlight</span>
            <button
              onClick={() => updateReaderSettings({ ambientGlow: !readerSettings.ambientGlow })}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                readerSettings.ambientGlow ? 'bg-victorian-gold' : 'bg-void-800'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-void-950 absolute top-0.5 transition-transform ${
                  readerSettings.ambientGlow ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Main Continuous Infinite Scroll Canvas */}
      <main
        className="max-w-4xl mx-auto px-0 sm:px-4 pt-16 pb-32 flex flex-col items-center"
        onClick={() => setShowHud(!showHud)}
      >
        {/* Initial Loading Skeleton */}
        {loadingInitial ? (
          <div className="w-full max-w-2xl space-y-4 px-4 py-24 animate-pulse">
            <div className="h-[80vh] bg-void-900 rounded-3xl border border-void-800 flex flex-col items-center justify-center space-y-4 text-slate-500 font-serif">
              <Loader2 className="w-8 h-8 text-victorian-gold animate-spin" />
              <span>Summoning Victorian Manuscript...</span>
            </div>
          </div>
        ) : loadedChapters.length > 0 ? (
          <div className="w-full flex flex-col items-center">
            {loadedChapters.map((block, blockIdx) => (
              <div
                key={block.chapterId}
                id={`chapter-block-${block.chapterId}`}
                className="w-full flex flex-col items-center"
              >
                {/* Victorian Chapter Divider Banner */}
                <div className="w-full py-10 px-4 text-center space-y-2 select-none">
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-victorian-gold/60 to-transparent" />
                    <div className="wax-seal w-8 h-8 rounded-full flex items-center justify-center text-amber-200 text-xs font-serif font-black shadow-xl">
                      ❦
                    </div>
                    <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-victorian-gold/60 to-transparent" />
                  </div>
                  {blockIdx > 0 && (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-victorian-gold/80 block">
                      Chapter Seamlessly Continued
                    </span>
                  )}
                  <h2 className="font-serif text-lg sm:text-2xl font-bold tracking-wide text-amber-100">
                    {block.chapterTitle}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {block.images.length} Illuminated Pages
                  </p>
                </div>

                {/* Chapter Images Strip */}
                <div
                  className="w-full flex flex-col items-center"
                  style={{ gap: `${readerSettings.stripGap}px` }}
                >
                  {block.images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="relative w-full max-w-3xl flex justify-center bg-void-950 overflow-hidden shadow-2xl"
                    >
                      <img
                        src={getProxyImageUrl(imgUrl)}
                        alt={`${block.chapterTitle} - Page ${idx + 1}`}
                        className="w-full h-auto object-contain transition-all duration-300"
                        loading="lazy"
                        decoding="async"
                      />

                      {/* Subtle Page Watermark */}
                      <span className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-500/60 bg-void-950/70 px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Seamless Infinite Next Chapter Loader */}
            {loadingNext && (
              <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 bg-void-950/80">
                <Loader2 className="w-8 h-8 text-victorian-gold animate-spin" />
                <p className="font-serif text-sm text-amber-200 font-bold">
                  Unrolling Subsequent Chapter...
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  Continuous scroll streaming from WeebCentral
                </p>
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* Floating Bottom Quick HUD */}
      <footer
        className={`fixed bottom-0 inset-x-0 z-40 backdrop-blur-xl bg-void-950/85 border-t border-void-800/80 px-4 py-2.5 transition-transform duration-300 ${
          showHud ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-serif font-bold text-amber-200 truncate max-w-[160px] sm:max-w-xs">
              {currentDisplayTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Manual Next Chapter Load Trigger */}
            <button
              onClick={loadNextChapterSeamlessly}
              disabled={loadingNext}
              className="px-3.5 py-1.5 rounded-xl bg-void-900 hover:bg-void-850 border border-victorian-gold/40 text-victorian-gold hover:border-victorian-gold text-xs font-serif font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              {loadingNext ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Flame className="w-3.5 h-3.5 text-victorian-gold" />
              )}
              <span>Load Next Chapter</span>
            </button>

            {/* Scroll to Top */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-2 rounded-xl bg-void-900 border border-void-800 text-slate-400 hover:text-victorian-gold transition-colors"
              title="Scroll to Top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

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
  Flame,
  Maximize2,
  Minimize2,
  List,
  Layers,
  Sun,
  Moon,
  ChevronDown,
  Eye,
  Columns,
  Square,
  Volume2,
  VolumeX,
  Radio,
  ShieldCheck,
  Zap,
  Box
} from 'lucide-react';
import { useStore } from '../store/useStore.ts';
import { fetchChapterImages, fetchChapterList, getProxyImageUrl } from '../services/api.ts';
import { ChapterItem, ReadingMode, VisualTheme, ImageFitMode, AudioAmbience } from '../types.ts';

interface ChapterBlock {
  chapterId: string;
  chapterTitle: string;
  images: string[];
}

const HoloPanel3D: React.FC<{
  imgUrl: string;
  pageIdx: number;
  total: number;
  scroll3D: boolean;
  imageFitClass: string;
}> = ({ imgUrl, pageIdx, total, scroll3D, imageFitClass }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!scroll3D) {
      setTransform('');
      return;
    }

    let rafId: number;
    const updateTilt = () => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elemCenter = rect.top + rect.height / 2;
      const diff = (elemCenter - viewportCenter) / (window.innerHeight / 2);
      const clamped = Math.max(-1, Math.min(1, diff));
      // Parabolic subtle cylinder bow: rotateX between -6.5deg and +6.5deg, translateZ backward towards edges
      const rotX = clamped * -6.5;
      const tz = Math.abs(clamped) * -22;
      setTransform(`perspective(1200px) rotateX(${rotX.toFixed(2)}deg) translateZ(${tz.toFixed(1)}px)`);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateTilt);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateTilt();

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [scroll3D]);

  return (
    <div
      ref={panelRef}
      className={`relative w-full overflow-hidden group transition-all ${
        scroll3D
          ? 'shadow-2xl rounded-xl border border-[#292A2D] my-2 duration-100'
          : 'duration-300'
      }`}
      style={{
        transform: scroll3D ? transform : undefined,
        transformStyle: 'preserve-3d',
        willChange: scroll3D ? 'transform' : 'auto',
      }}
    >
      {loadError ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-6 bg-[#111318] border border-[#292A2D] text-center space-y-2">
          <p className="text-xs text-[#AAA69D] font-mono">Panel {pageIdx + 1} temporarily unavailable</p>
          <button
            onClick={() => {
              setLoadError(false);
              setRetryKey((k) => k + 1);
            }}
            className="px-3 py-1 rounded bg-[#191A1F] border border-[#292A2D] text-xs text-[#C69A45] hover:bg-[#C69A45] hover:text-[#090A0C] transition-colors"
          >
            Reload Panel
          </button>
        </div>
      ) : (
        <img
          key={retryKey}
          src={getProxyImageUrl(imgUrl)}
          alt={`Page ${pageIdx + 1}`}
          onError={() => setLoadError(true)}
          className={`block select-none pointer-events-none transition-all duration-300 ${imageFitClass}`}
          loading={pageIdx < 4 ? 'eager' : 'lazy'}
        />
      )}
      {/* Subtle Micro Page Counter */}
      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-[#090A0C]/85 backdrop-blur-sm text-[9px] font-mono text-[#AAA69D] border border-[#292A2D] opacity-0 group-hover:opacity-100 transition-opacity">
        p.{pageIdx + 1} / {total}
      </div>
      {/* 3D Holo Rim Glare */}
      {scroll3D && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#C69A45]/[0.05] via-transparent to-[#C69A45]/[0.05] opacity-60" />
      )}
    </div>
  );
};

export const ReaderView: React.FC = () => {
  const {
    activeMangaId,
    activeMangaTitle,
    activeMangaCover,
    activeChapterId,
    activeChapterTitle,
    openChapter,
    setView,
    readerSettings,
    updateReaderSettings,
    updateHistory,
    markChapterRead,
  } = useStore();

  const [loadedChapters, setLoadedChapters] = useState<ChapterBlock[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingNext, setLoadingNext] = useState(false);
  const [currentDisplayTitle, setCurrentDisplayTitle] = useState(activeChapterTitle || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [showHud, setShowHud] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapterDrawer, setShowChapterDrawer] = useState(false);
  const [chapterSearch, setChapterSearch] = useState('');
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lastScrollY = useRef(0);
  const autoScrollRaf = useRef<number | null>(null);
  const loadingNextRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isMangaDex = activeChapterId?.startsWith('md:') || activeMangaId?.startsWith('md:');

  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    }
  };

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
        const initialTitle =
          chList.find((c) => c.id === activeChapterId)?.title || activeChapterTitle || 'Chapter';
        setLoadedChapters([
          {
            chapterId: activeChapterId!,
            chapterTitle: initialTitle,
            images: imgList,
          },
        ]);
        setCurrentDisplayTitle(initialTitle);
        setCurrentPage(1);
        setLoadingInitial(false);

        // Update history & status
        updateHistory({
          mangaId: activeMangaId!,
          mangaTitle: activeMangaTitle || 'Unknown Chronicle',
          mangaCover: activeMangaCover || imgList[0] || '',
          chapterId: activeChapterId!,
          chapterTitle: initialTitle,
          pageIndex: 1,
          totalImages: imgList.length,
        });
        markChapterRead(activeChapterId!, true, 1);
      }
    }
    load();

    return () => {
      mounted = false;
      if (autoScrollRaf.current) cancelAnimationFrame(autoScrollRaf.current);
    };
  }, [activeChapterId, activeMangaId]);

  // Current primary chapter block for Paged mode
  const currentBlock = loadedChapters[0] || {
    chapterId: activeChapterId || '',
    chapterTitle: currentDisplayTitle,
    images: [],
  };
  const currentImages = currentBlock.images;
  const totalPagesInCurrentChapter = currentImages.length;

  // Total pages across all loaded chapters (for continuous mode)
  const totalLoadedImages = loadedChapters.reduce((acc, ch) => acc + ch.images.length, 0);

  // Seamless next chapter loader for Continuous mode
  const loadNextChapterSeamlessly = useCallback(async () => {
    if (loadingNextRef.current || loadedChapters.length === 0 || chapters.length === 0) return;

    const lastLoaded = loadedChapters[loadedChapters.length - 1];
    const lastIdx = chapters.findIndex((c) => c.id === lastLoaded.chapterId);

    // Reading order: next chapter is lastIdx - 1
    if (lastIdx <= 0) return;

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
        markChapterRead(nextChapterMeta.id, true, 1);
      }
    } catch (err) {
      console.error('Failed to append next chapter:', err);
    } finally {
      loadingNextRef.current = false;
      setLoadingNext(false);
    }
  }, [loadedChapters, chapters, markChapterRead]);

  // Track scroll position in Continuous Mode
  useEffect(() => {
    if (readerSettings.readingMode !== 'vertical') return;

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(100, Math.round((currentScroll / docHeight) * 100)) : 0;
      setScrollProgress(progress);

      // Auto-hide HUD on downward scroll, reveal on upward scroll
      if (currentScroll > lastScrollY.current + 40 && currentScroll > 150) {
        setShowHud(false);
      } else if (currentScroll < lastScrollY.current - 20) {
        setShowHud(true);
      }
      lastScrollY.current = currentScroll;

      // Infinite Chapter Trigger
      if (docHeight > 0 && docHeight - currentScroll < 1600 && !loadingNextRef.current) {
        loadNextChapterSeamlessly();
      }

      // Track active chapter block in viewport
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
                  mangaTitle: activeMangaTitle || 'Unknown Chronicle',
                  mangaCover: activeMangaCover || block.images[0] || '',
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
  }, [readerSettings.readingMode, loadedChapters, currentDisplayTitle, activeMangaId, updateHistory, loadNextChapterSeamlessly]);

  // Auto-scroll loop
  useEffect(() => {
    if (!autoScrollActive || readerSettings.readingMode !== 'vertical') {
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
  }, [autoScrollActive, readerSettings.readingMode, readerSettings.autoScrollSpeed]);

  // Jump to Next / Previous Chapter in Paged Mode
  const goToNextChapter = useCallback(() => {
    const currentIdx = chapters.findIndex((c) => c.id === activeChapterId);
    if (currentIdx > 0) {
      const nextCh = chapters[currentIdx - 1];
      openChapter(activeMangaId!, nextCh.id, nextCh.title, activeMangaTitle || undefined, activeMangaCover || undefined);
    }
  }, [chapters, activeChapterId, activeMangaId, openChapter, activeMangaTitle, activeMangaCover]);

  const goToPrevChapter = useCallback(() => {
    const currentIdx = chapters.findIndex((c) => c.id === activeChapterId);
    if (currentIdx < chapters.length - 1 && currentIdx >= 0) {
      const prevCh = chapters[currentIdx + 1];
      openChapter(activeMangaId!, prevCh.id, prevCh.title, activeMangaTitle || undefined, activeMangaCover || undefined);
    }
  }, [chapters, activeChapterId, activeMangaId, openChapter, activeMangaTitle, activeMangaCover]);

  // Paged Mode Page Navigators
  const isRtl =
    readerSettings.readingMode === 'paged-rtl' ||
    readerSettings.readingMode === 'double-rtl';

  const isDouble =
    readerSettings.readingMode === 'double-rtl' ||
    readerSettings.readingMode === 'double-ltr' ||
    readerSettings.readingMode === 'double';

  const stepPages = isDouble ? 2 : 1;

  const nextPage = useCallback(() => {
    if (currentPage + stepPages <= totalPagesInCurrentChapter) {
      const nextP = currentPage + stepPages;
      setCurrentPage(nextP);
      window.scrollTo({ top: 0 });
      if (activeMangaId && activeChapterId) {
        updateHistory({
          mangaId: activeMangaId,
          mangaTitle: activeMangaTitle || 'Unknown Chronicle',
          mangaCover: activeMangaCover || currentImages[0] || '',
          chapterId: activeChapterId,
          chapterTitle: currentDisplayTitle,
          pageIndex: nextP,
          totalImages: totalPagesInCurrentChapter,
        });
      }
    } else {
      goToNextChapter();
    }
  }, [currentPage, stepPages, totalPagesInCurrentChapter, activeMangaId, activeChapterId, activeMangaTitle, activeMangaCover, currentImages, currentDisplayTitle, updateHistory, goToNextChapter]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      const prevP = Math.max(1, currentPage - stepPages);
      setCurrentPage(prevP);
      window.scrollTo({ top: 0 });
    } else {
      goToPrevChapter();
    }
  }, [currentPage, stepPages, goToPrevChapter]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowHud((prev) => !prev);
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        updateReaderSettings({ zenMode: !readerSettings.zenMode });
      } else if (e.key === 'Escape') {
        setShowSettings(false);
        setShowChapterDrawer(false);
      }

      if (readerSettings.readingMode !== 'vertical') {
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          if (isRtl) prevPage();
          else nextPage();
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          if (isRtl) nextPage();
          else prevPage();
        } else if (e.key === ' ') {
          e.preventDefault();
          nextPage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readerSettings.readingMode, readerSettings.zenMode, isRtl, nextPage, prevPage, updateReaderSettings]);

  const filteredChapters = chapters.filter((c) =>
    c.title.toLowerCase().includes(chapterSearch.toLowerCase())
  );

  const getThemeClass = () => {
    switch (readerSettings.visualTheme) {
      case 'graphite':
        return 'theme-graphite';
      case 'parchment':
        return 'theme-parchment';
      case 'amethyst':
        return 'theme-amethyst';
      case 'void':
      default:
        return 'theme-void';
    }
  };

  const getImageFitClass = () => {
    switch (readerSettings.imageFit) {
      case 'fit-height':
        return 'h-[90vh] w-auto max-w-full object-contain mx-auto';
      case 'original':
        return 'max-w-none w-auto mx-auto';
      case 'smart-stretch':
        return 'w-full h-auto object-cover';
      case 'fit-width':
      default:
        return 'w-full h-auto object-contain';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-screen relative select-none transition-colors duration-500 overflow-x-hidden ${getThemeClass()} ${
        readerSettings.invertColors ? 'invert-manga' : ''
      }`}
    >
      {/* Dynamic Ambient Glow Layer */}
      {readerSettings.ambientGlow && <div className="ambient-glow-layer opacity-40" />}

      {/* Floating Satin Ribbon Bookmark Indicator (Continuous mode) */}
      {readerSettings.readingMode === 'vertical' && !readerSettings.zenMode && (
        <div
          className="fixed top-0 right-4 sm:right-8 z-30 flex flex-col items-center pointer-events-none transition-all duration-300"
          style={{
            transform: `translateY(${Math.min(14, scrollProgress * 0.15)}px)`,
          }}
        >
          <div className="w-8 sm:w-10 pt-2 pb-4 bg-gradient-to-b from-telemetry-crimson via-red-900 to-red-950 rounded-b-md shadow-2xl border-x border-b border-red-500/40 flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-solar-400 mb-1 shadow-inner" />
            <span className="text-[10px] sm:text-xs font-serif font-black text-amber-200">
              {scrollProgress}%
            </span>
            <span className="text-[8px] font-mono text-amber-300/80">
              {loadedChapters.length} ch
            </span>
          </div>
        </div>
      )}

      {/* Zenith Floating Island HUD (Top Bar) */}
      <nav
        className={`fixed top-0 inset-x-0 z-40 backdrop-blur-2xl bg-void-950/85 border-b border-void-700/60 px-3 sm:px-6 py-2.5 transition-transform duration-300 ${
          showHud && !readerSettings.zenMode ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Back & Chapter Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setView('details')}
              className="p-2 rounded-xl bg-void-900 hover:bg-void-850 text-slate-300 hover:text-solar-400 border border-void-700/60 transition-all shadow-sm"
              title="Return to Details"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-serif font-bold text-slate-100 truncate">
                  {currentDisplayTitle}
                </h2>
                {isMangaDex ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-telemetry-cyan/15 text-telemetry-cyan border border-telemetry-cyan/40 font-mono font-bold flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                    <span>MD Safe</span>
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-solar-500/15 text-solar-400 border border-solar-500/30 font-mono hidden md:inline">
                    {readerSettings.readingMode === 'vertical' ? 'Continuous Webtoon' : isRtl ? 'Manga RTL' : 'Paged LTR'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight truncate">
                {readerSettings.readingMode === 'vertical'
                  ? `${totalLoadedImages} Panels in Stream • Endless Scroll`
                  : `Page ${currentPage}${isDouble && currentPage + 1 <= totalPagesInCurrentChapter ? `-${currentPage + 1}` : ''} of ${totalPagesInCurrentChapter}`}
              </p>
            </div>
          </div>

          {/* Right: Controls & Ambience */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Audio Ambience Synthesizer Pill */}
            <button
              onClick={() => {
                const nextMode: AudioAmbience =
                  readerSettings.audioAmbience === 'off'
                    ? 'rain'
                    : readerSettings.audioAmbience === 'rain'
                    ? 'lofi'
                    : readerSettings.audioAmbience === 'lofi'
                    ? 'void'
                    : 'off';
                updateReaderSettings({ audioAmbience: nextMode });
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all ${
                readerSettings.audioAmbience !== 'off'
                  ? 'bg-solar-500/20 text-solar-400 border-solar-500/60 shadow-sm'
                  : 'bg-void-900 border-void-750 text-slate-400 hover:text-slate-200'
              }`}
              title={`Audio Ambience: ${readerSettings.audioAmbience.toUpperCase()}`}
            >
              {readerSettings.audioAmbience !== 'off' ? (
                <div className="flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-solar-400" />
                  <span className="hidden sm:inline font-bold uppercase text-[10px]">
                    {readerSettings.audioAmbience === 'rain' ? '🌧️ Rain' : readerSettings.audioAmbience === 'lofi' ? '☕ Lo-Fi' : '🌌 Void'}
                  </span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <span className="w-0.5 h-2 bg-solar-400 animate-pulse" />
                    <span className="w-0.5 h-3 bg-solar-400 animate-pulse delay-75" />
                    <span className="w-0.5 h-1.5 bg-solar-400 animate-pulse delay-150" />
                  </div>
                </div>
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Continuous Mode: 3D Holo-Scroll Toggle (Direct HUD Access) */}
            {readerSettings.readingMode === 'vertical' && (
              <button
                onClick={() => updateReaderSettings({ scroll3D: !readerSettings.scroll3D })}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                  readerSettings.scroll3D
                    ? 'bg-[#C69A45] text-[#090A0C] border-[#C69A45] shadow-md shadow-[#C69A45]/20 font-bold'
                    : 'bg-[#111318] border-[#292A2D] text-[#AAA69D] hover:text-[#C69A45]'
                }`}
                title="Toggle 3D Cylinder Scroll Depth"
              >
                <Box className={`w-3.5 h-3.5 ${readerSettings.scroll3D ? 'stroke-[2.5]' : ''}`} />
                <span className="hidden sm:inline">3D Scroll</span>
              </button>
            )}

            {/* Continuous Mode: Auto Scroll Button */}
            {readerSettings.readingMode === 'vertical' && (
              <button
                onClick={() => setAutoScrollActive(!autoScrollActive)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                  autoScrollActive
                    ? 'bg-[#C69A45] text-[#090A0C] border-[#C69A45] shadow-md shadow-[#C69A45]/30 font-bold'
                    : 'bg-[#111318] border-[#292A2D] text-[#AAA69D] hover:text-[#C69A45]'
                }`}
                title="Toggle Auto-Scroll"
              >
                {autoScrollActive ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Auto</span>
              </button>
            )}

            {/* Chapter Jumper Drawer Trigger */}
            <button
              onClick={() => {
                setShowChapterDrawer(!showChapterDrawer);
                setShowSettings(false);
              }}
              className={`p-2 rounded-xl border transition-all text-xs flex items-center gap-1.5 ${
                showChapterDrawer
                  ? 'bg-solar-500/20 text-solar-400 border-solar-500/50'
                  : 'bg-void-900 border-void-750 text-slate-300 hover:text-solar-400'
              }`}
              title="Chapter Quick-Jump"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline font-mono text-[11px]">Chapters</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-void-900 hover:bg-void-850 border border-void-750 text-slate-300 hover:text-solar-400 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Immersive Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Reader Settings Toggle */}
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                setShowChapterDrawer(false);
              }}
              className={`p-2 rounded-xl border transition-colors ${
                showSettings
                  ? 'bg-solar-500/20 text-solar-400 border-solar-500'
                  : 'bg-void-900 border-void-750 text-slate-400 hover:text-slate-200'
              }`}
              title="Reading Console"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Chapter Jumper Slide-Out Drawer */}
      {showChapterDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-void-950/70 backdrop-blur-sm animate-fade-in flex justify-start">
          <div className="absolute inset-0" onClick={() => setShowChapterDrawer(false)} />
          <div className="relative w-80 max-w-[85vw] h-full bg-void-900 border-r border-void-700/60 shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-void-700/60 flex items-center justify-between bg-void-950/80">
              <span className="font-serif text-sm font-bold text-solar-400 flex items-center gap-1.5">
                <Scroll className="w-4 h-4" />
                Select Chapter
              </span>
              <button
                onClick={() => setShowChapterDrawer(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 border-b border-void-750">
              <input
                type="text"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="Find chapter (e.g. 120)..."
                className="w-full px-3 py-1.5 rounded-xl bg-void-950 border border-void-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-solar-500/60 font-mono"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredChapters.map((ch) => {
                const isCurrent = ch.id === activeChapterId;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setShowChapterDrawer(false);
                      openChapter(activeMangaId!, ch.id, ch.title);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-solar-500 text-void-950 font-bold shadow-md shadow-solar-500/20'
                        : 'text-slate-300 hover:bg-void-850 hover:text-solar-400'
                    }`}
                  >
                    <span className="truncate">{ch.title}</span>
                    {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reader Settings Modal Console */}
      {showSettings && (
        <div className="fixed top-14 right-3 sm:right-6 z-50 w-84 max-w-[92vw] p-4 rounded-2xl bg-void-900/95 backdrop-blur-2xl border border-solar-500/40 shadow-2xl shadow-solar-500/10 space-y-4 animate-fade-in text-xs max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-void-750 pb-2.5">
            <span className="font-serif font-bold text-solar-400 flex items-center gap-1.5 text-xs">
              <Sliders className="w-3.5 h-3.5" />
              Tactical Reading Console
            </span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-200 font-mono"
            >
              ✕
            </button>
          </div>

          {/* Reading Engine / Mode */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Reading Engine</span>
              <span className="text-solar-400 font-bold uppercase">{readerSettings.readingMode}</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => updateReaderSettings({ readingMode: 'vertical' })}
                className={`py-2 px-2.5 rounded-xl border text-[11px] font-mono flex items-center justify-center gap-1.5 transition-all ${
                  readerSettings.readingMode === 'vertical'
                    ? 'bg-solar-500/20 border-solar-500 text-solar-400 font-bold'
                    : 'bg-void-950 border-void-750 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Scroll className="w-3 h-3" />
                <span>Webtoon Strip</span>
              </button>
              <button
                onClick={() => updateReaderSettings({ readingMode: 'paged-rtl' })}
                className={`py-2 px-2.5 rounded-xl border text-[11px] font-mono flex items-center justify-center gap-1.5 transition-all ${
                  readerSettings.readingMode === 'paged-rtl'
                    ? 'bg-solar-500/20 border-solar-500 text-solar-400 font-bold'
                    : 'bg-void-950 border-void-750 text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Manga (RTL)</span>
              </button>
              <button
                onClick={() => updateReaderSettings({ readingMode: 'paged-ltr' })}
                className={`py-2 px-2.5 rounded-xl border text-[11px] font-mono flex items-center justify-center gap-1.5 transition-all ${
                  readerSettings.readingMode === 'paged-ltr'
                    ? 'bg-solar-500/20 border-solar-500 text-solar-400 font-bold'
                    : 'bg-void-950 border-void-750 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ChevronRight className="w-3 h-3" />
                <span>Paged (LTR)</span>
              </button>
              <button
                onClick={() => updateReaderSettings({ readingMode: 'double-rtl' })}
                className={`py-2 px-2.5 rounded-xl border text-[11px] font-mono flex items-center justify-center gap-1.5 transition-all ${
                  readerSettings.readingMode === 'double-rtl'
                    ? 'bg-solar-500/20 border-solar-500 text-solar-400 font-bold'
                    : 'bg-void-950 border-void-750 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Columns className="w-3 h-3" />
                <span>Double Spread</span>
              </button>
            </div>
          </div>

          {/* 3D Cylinder Scroll Toggle (2026 Gen-Z Dimension) */}
          {readerSettings.readingMode === 'vertical' && (
            <div className="p-2.5 rounded-xl bg-void-950 border border-void-750 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-solar-400" />
                <div>
                  <div className="text-[11px] font-mono text-slate-200 font-bold">3D Holo-Scroll Depth</div>
                  <div className="text-[9px] text-slate-400 font-mono">Curved cylindrical perspective</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={readerSettings.scroll3D}
                onChange={(e) => updateReaderSettings({ scroll3D: e.target.checked })}
                className="w-4 h-4 accent-solar-500 cursor-pointer"
              />
            </div>
          )}

          {/* Procedural Audio Ambience Synthesizer */}
          <div className="space-y-2 p-2.5 rounded-xl bg-void-950 border border-void-750">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-solar-400" />
                <div>
                  <div className="text-[11px] font-mono text-slate-200 font-bold">Reading Soundscape</div>
                  <div className="text-[9px] text-slate-400 font-mono">Web Audio procedural synth</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-solar-400 uppercase font-bold">
                {readerSettings.audioAmbience}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {(['off', 'rain', 'lofi', 'void'] as AudioAmbience[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateReaderSettings({ audioAmbience: mode })}
                  className={`py-1.5 rounded-lg text-[10px] font-mono border transition-all ${
                    readerSettings.audioAmbience === mode
                      ? 'bg-solar-500 text-void-950 border-solar-500 font-bold shadow-sm'
                      : 'bg-void-900 border-void-750 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode === 'off' ? 'Off' : mode === 'rain' ? '🌧️ Rain' : mode === 'lofi' ? '☕ Lo-Fi' : '🌌 Void'}
                </button>
              ))}
            </div>

            {readerSettings.audioAmbience !== 'off' && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Volume</span>
                  <span>{Math.round(readerSettings.audioVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={readerSettings.audioVolume}
                  onChange={(e) => updateReaderSettings({ audioVolume: Number(e.target.value) })}
                  className="w-full accent-solar-500 cursor-pointer h-1.5 bg-void-900 rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Visual Aesthetic / Theme */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400">Visual Surface</label>
            <div className="grid grid-cols-4 gap-1">
              {(['void', 'graphite', 'parchment', 'amethyst'] as VisualTheme[]).map((thm) => (
                <button
                  key={thm}
                  onClick={() => updateReaderSettings({ visualTheme: thm })}
                  className={`py-1.5 rounded-lg text-[10px] font-mono border uppercase ${
                    readerSettings.visualTheme === thm
                      ? 'bg-solar-500/20 border-solar-500 text-solar-400 font-bold'
                      : 'bg-void-950 border-void-750 text-slate-400'
                  }`}
                >
                  {thm}
                </button>
              ))}
            </div>
          </div>

          {/* Image Fit */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-slate-400">Image Fit Scale</label>
            <div className="grid grid-cols-3 gap-1">
              {(['fit-width', 'fit-height', 'original'] as ImageFitMode[]).map((fit) => (
                <button
                  key={fit}
                  onClick={() => updateReaderSettings({ imageFit: fit })}
                  className={`py-1.5 rounded-lg text-[10px] font-mono border ${
                    readerSettings.imageFit === fit
                      ? 'bg-solar-500/20 border-solar-500 text-solar-400 font-bold'
                      : 'bg-void-950 border-void-750 text-slate-400'
                  }`}
                >
                  {fit === 'fit-width' ? 'Fit Width' : fit === 'fit-height' ? 'Fit Height' : 'Original'}
                </button>
              ))}
            </div>
          </div>

          {/* High-Contrast Inversion & Zen Mode toggles */}
          <div className="pt-2 border-t border-void-750 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-300">Night High-Contrast Invert</span>
              <input
                type="checkbox"
                checked={readerSettings.invertColors}
                onChange={(e) => updateReaderSettings({ invertColors: e.target.checked })}
                className="w-4 h-4 accent-solar-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-300">Zen Focus Cinema Mode (Z)</span>
              <input
                type="checkbox"
                checked={readerSettings.zenMode}
                onChange={(e) => updateReaderSettings({ zenMode: e.target.checked })}
                className="w-4 h-4 accent-solar-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Auto-Scroll Velocity (Continuous mode) */}
          {readerSettings.readingMode === 'vertical' && (
            <div className="space-y-1.5 pt-2 border-t border-void-750">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Auto-Scroll Velocity</span>
                <span className="text-solar-400 font-bold">{readerSettings.autoScrollSpeed}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={readerSettings.autoScrollSpeed}
                onChange={(e) => updateReaderSettings({ autoScrollSpeed: Number(e.target.value) })}
                className="w-full accent-solar-500 cursor-pointer h-1.5 bg-void-950 rounded-lg"
              />
            </div>
          )}
        </div>
      )}

      {/* Main Reading Container */}
      <main
        className="mx-auto transition-all duration-300 relative"
        style={{
          maxWidth: `${readerSettings.maxWidth}px`,
          perspective: readerSettings.scroll3D ? '1200px' : 'none',
        }}
      >
        {loadingInitial ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-solar-500 animate-spin" />
            <p className="font-serif text-sm font-bold text-amber-200/90 tracking-wider">
              Deciphering Ancient Panels...
            </p>
            <p className="text-xs text-slate-500 font-mono">
              {isMangaDex ? 'MangaDex Safe Network Active' : 'KuroStream Engine Active'}
            </p>
          </div>
        ) : (
          <>
            {/* ======================================================== */}
            {/* ENGINE 1: CONTINUOUS WEBTOON SCROLL (WITH 3D CYLINDER)   */}
            {/* ======================================================== */}
            {readerSettings.readingMode === 'vertical' && (
              <div
                className={`flex flex-col items-center transition-all ${
                  readerSettings.scroll3D ? 'space-y-3' : ''
                }`}
                style={{ gap: `${readerSettings.stripGap}px` }}
                onClick={() => setShowHud((prev) => !prev)}
              >
                {loadedChapters.map((block, chIdx) => (
                  <div
                    key={block.chapterId}
                    id={`chapter-block-${block.chapterId}`}
                    className="w-full flex flex-col items-center"
                  >
                    {/* Chapter Header Card with Wax Seal */}
                    <div className="w-full py-8 sm:py-12 px-4 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="wax-seal w-12 h-12 rounded-full flex items-center justify-center text-amber-100 font-serif font-black text-sm shadow-xl">
                        {chIdx + 1}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-solar-400">
                          {isMangaDex ? 'MangaDex Safe Chapter' : 'Chronicle Chapter'}
                        </span>
                        <h2 className="font-serif text-lg sm:text-2xl font-bold text-slate-100">
                          {block.chapterTitle}
                        </h2>
                      </div>
                      <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-solar-500/50 to-transparent" />
                    </div>

                    {/* Image Stream (with 3D cylinder curve if enabled) */}
                    {block.images.map((imgUrl, pageIdx) => (
                      <HoloPanel3D
                        key={`${block.chapterId}-p-${pageIdx}`}
                        imgUrl={imgUrl}
                        pageIdx={pageIdx}
                        total={block.images.length}
                        scroll3D={!!readerSettings.scroll3D}
                        imageFitClass={getImageFitClass()}
                      />
                    ))}

                    {/* Chapter Conclusion Milestone Divider */}
                    <div className="w-full py-12 px-4 flex flex-col items-center justify-center text-center space-y-3 bg-void-950/60 border-y border-void-800/80 my-4">
                      <div className="w-8 h-8 rounded-full bg-void-900 border border-solar-500/40 flex items-center justify-center text-solar-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <h4 className="font-serif text-sm font-bold text-slate-200">
                        End of {block.chapterTitle}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Scroll further to decipher subsequent chronicle...
                      </p>
                    </div>
                  </div>
                ))}

                {/* Infinite Next Chapter Loading Skeleton */}
                {loadingNext && (
                  <div className="w-full py-16 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-6 h-6 text-solar-400 animate-spin" />
                    <span className="text-xs font-serif font-bold text-slate-300">
                      Deciphering Next Chronicle...
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* ENGINE 2: PAGED MANGA MODE (SINGLE / DOUBLE / RTL / LTR) */}
            {/* ======================================================== */}
            {readerSettings.readingMode !== 'vertical' && (
              <div className="min-h-screen pt-16 pb-24 flex flex-col justify-center relative">
                {/* Click Zone Overlay */}
                <div className="relative w-full flex items-center justify-center min-h-[75vh]">
                  {/* Left Touch Zone (35%) */}
                  <div
                    onClick={isRtl ? nextPage : prevPage}
                    className="absolute inset-y-0 left-0 w-[35%] z-20 cursor-w-resize group flex items-center justify-start pl-4"
                    title={isRtl ? 'Next Page' : 'Previous Page'}
                  >
                    <div className="w-9 h-9 rounded-full bg-void-950/80 backdrop-blur-md border border-void-700 text-slate-400 group-hover:text-solar-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronLeft className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Middle Touch Zone (30% - toggles HUD) */}
                  <div
                    onClick={() => setShowHud((prev) => !prev)}
                    className="absolute inset-y-0 left-[35%] w-[30%] z-20 cursor-pointer"
                  />

                  {/* Right Touch Zone (35%) */}
                  <div
                    onClick={isRtl ? prevPage : nextPage}
                    className="absolute inset-y-0 right-0 w-[35%] z-20 cursor-e-resize group flex items-center justify-end pr-4"
                    title={isRtl ? 'Previous Page' : 'Next Page'}
                  >
                    <div className="w-9 h-9 rounded-full bg-void-950/80 backdrop-blur-md border border-void-700 text-slate-400 group-hover:text-solar-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Pages Artwork Display */}
                  <div className={`w-full flex items-center justify-center ${isDouble ? 'flex-row gap-2' : ''}`}>
                    {/* Primary Page */}
                    {currentImages[currentPage - 1] && (
                      <div className="relative max-w-full flex justify-center shadow-2xl">
                        <img
                          src={getProxyImageUrl(currentImages[currentPage - 1])}
                          alt={`Page ${currentPage}`}
                          className={`select-none transition-all duration-300 ${getImageFitClass()}`}
                        />
                      </div>
                    )}

                    {/* Secondary Page (for Double Spread) */}
                    {isDouble && currentImages[currentPage] && (
                      <div className="relative max-w-full flex justify-center shadow-2xl">
                        <img
                          src={getProxyImageUrl(currentImages[currentPage])}
                          alt={`Page ${currentPage + 1}`}
                          className={`select-none transition-all duration-300 ${getImageFitClass()}`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Paged Navigation Dock (HUD) */}
                <div
                  className={`fixed bottom-0 inset-x-0 z-40 backdrop-blur-2xl bg-void-950/90 border-t border-void-700/60 px-4 py-3 transition-transform duration-300 ${
                    showHud && !readerSettings.zenMode ? 'translate-y-0' : 'translate-y-full'
                  }`}
                >
                  <div className="max-w-2xl mx-auto flex flex-col gap-2">
                    {/* Interactive Page Scrubber Slider */}
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        p.{currentPage}
                      </span>
                      <input
                        type="range"
                        min="1"
                        max={totalPagesInCurrentChapter}
                        value={currentPage}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          setCurrentPage(p);
                        }}
                        className="flex-1 accent-solar-500 cursor-pointer h-1.5 bg-void-850 rounded-lg"
                      />
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        /{totalPagesInCurrentChapter}
                      </span>
                    </div>

                    {/* Step Controls */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={prevPage}
                        className="px-3.5 py-1.5 rounded-xl bg-void-900 hover:bg-void-850 border border-void-750 text-slate-300 hover:text-solar-400 font-mono text-xs flex items-center gap-1.5 transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={goToPrevChapter}
                          className="px-2.5 py-1 rounded-lg bg-void-900 border border-void-800 text-[10px] font-mono text-slate-400 hover:text-slate-200"
                        >
                          Prev Ch
                        </button>
                        <span className="text-[11px] font-mono text-solar-400 font-bold">
                          {Math.round((currentPage / totalPagesInCurrentChapter) * 100)}%
                        </span>
                        <button
                          onClick={goToNextChapter}
                          className="px-2.5 py-1 rounded-lg bg-void-900 border border-void-800 text-[10px] font-mono text-slate-400 hover:text-slate-200"
                        >
                          Next Ch
                        </button>
                      </div>

                      <button
                        onClick={nextPage}
                        className="px-3.5 py-1.5 rounded-xl bg-solar-500 hover:bg-solar-400 text-void-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-solar-500/20"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

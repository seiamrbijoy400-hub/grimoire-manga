import React, { useEffect, useRef, useState } from 'react';
import { useStore } from './store/useStore.ts';
import { Navbar } from './components/Navbar.tsx';
import { BentoGrid } from './components/BentoGrid.tsx';
import { MangaDetailsView } from './components/MangaDetailsView.tsx';
import { ReaderView } from './components/ReaderView.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { SearchPage } from './pages/SearchPage.tsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { IntroSplash } from './components/IntroSplash.tsx';
import { ScrollProgress } from './components/ScrollProgress.tsx';
import { BrandLogo, WordMark } from './components/BrandMark.tsx';

const INTRO_KEY = 'kurso:intro-seen:v2';

const GENRES = [
  'Action', 'Fantasy', 'Romance', 'Manhwa', 'Seinen', 'Isekai',
  'Horror', 'Slice of Life', 'Shounen', 'Sci-Fi', 'Historical', 'Martial Arts',
];

const MarqueeBand: React.FC = () => {
  const row = [...GENRES, ...GENRES];
  return (
    <div className="relative overflow-hidden border-y border-[#1D1E23] bg-[#0B0C10] py-3">
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0B0C10] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0B0C10] to-transparent z-10 pointer-events-none" />
      <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap">
        {row.map((genre, i) => (
          <span
            key={`${genre}-${i}`}
            className="flex items-center gap-8 font-mono text-[10px] uppercase tracking-[0.3em] text-[#6E6A62]"
          >
            <span className={i % 4 === 0 ? 'text-[#C69A45]/80' : undefined}>{genre}</span>
            <span className="w-1 h-1 rounded-full bg-[#C69A45]/25" />
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * App-wide film layer: CRT scanlines, a soft vignette and a gold spotlight
 * that trails the pointer on desktop. Pure transforms, no layout work.
 */
const AmbientFX: React.FC = () => {
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 3;

    const paint = () => {
      raf = 0;
      if (spotRef.current) {
        spotRef.current.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`;
      }
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[45] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-scanlines opacity-40 mix-blend-soft-light" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.55)_100%)]" />
      <div
        ref={spotRef}
        className="absolute left-0 top-0 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(198,154,69,0.10),rgba(198,154,69,0)_62%)] will-change-transform"
      />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentView } = useStore();
  const [showIntro, setShowIntro] = useState(() => {
    try {
      // ?intro=1 replays the boot sequence on demand.
      if (new URLSearchParams(window.location.search).has('intro')) return true;
      return !sessionStorage.getItem(INTRO_KEY);
    } catch {
      return true;
    }
  });

  const dismissIntro = () => {
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* private mode — show it again next load */
    }
    setShowIntro(false);
  };

  // Keep the splash from flashing on internal back/forward navigations.
  useEffect(() => {
    if (!showIntro) return;
    document.documentElement.classList.add('intro-active');
    return () => document.documentElement.classList.remove('intro-active');
  }, [showIntro]);

  let content: React.ReactNode;

  // 1. Reading view takes absolute precedence (zen/immersive reader mode)
  if (currentView === 'reader') {
    content = <ReaderView />;
  } else if (currentView === 'details') {
    // 2. Manga details view takes precedence over main views
    content = (
      <div className="min-h-screen bg-[#090A0C] text-[#F0E9DC]">
        <SearchModal />
        <MangaDetailsView />
      </div>
    );
  } else {
    // 3. Main Route views
    content = (
      <div className="relative min-h-screen bg-[#090A0C] text-[#F0E9DC] flex flex-col overflow-x-hidden">
        {/* Ambient brand light field */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="aurora-blob aurora-blob--gold w-[520px] h-[520px] -top-40 -left-32 opacity-[0.16]" />
          <div className="aurora-blob aurora-blob--teal w-[420px] h-[420px] top-1/3 -right-32 opacity-[0.10]" />
          <div className="absolute inset-0 bg-grid-lines opacity-[0.35] [mask-image:radial-gradient(circle_at_50%_0%,black,transparent_65%)]" />
        </div>

        {/* Global Search Modal (Ctrl+K or trigger) */}
        <SearchModal />

        <AmbientFX />
        <div className="relative z-10 flex flex-col flex-1 view-enter">
          <Routes>
            {/* Dedicated standalone Search Page */}
            <Route path="/search" element={<SearchPage />} />

            {/* Home / Archive Catalog View */}
            <Route
              path="*"
              element={
                <>
                  <Navbar />
                  <main className="flex-1">
                    <BentoGrid />
                  </main>

                  <MarqueeBand />

                  {/* Archive Footer */}
                  <footer className="relative border-t border-[#292A2D] bg-[#090A0C] pt-12 pb-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
                    <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[240px] bg-[#C69A45]/10 blur-[100px] rounded-full" />

                    <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                        <BrandLogo className="w-16 h-16 sm:w-[68px] sm:h-[68px] shrink-0" glow />
                        <div className="space-y-1.5">
                          <WordMark size="text-base" showEdition />
                          <p className="text-xs text-[#AAA69D] max-w-md leading-relaxed">
                            Manga, curated for the scroll generation. A digital archive for
                            graphic storytelling from Japan, Korea, China and beyond.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#AAA69D]">
                        <span className="font-mono text-[11px] text-[#AAA69D]/70">Tokyo • Seoul • Shanghai</span>
                        <span className="hidden sm:inline text-[#292A2D]">|</span>
                        <span className="hover:text-[#F0E9DC] cursor-default transition-colors">Continuous &amp; Tankōbon RTL</span>
                        <span className="hidden sm:inline text-[#292A2D]">|</span>
                        <span className="hover:text-[#F0E9DC] cursor-default transition-colors">Press ⌘K to Search</span>
                      </div>
                    </div>

                    <div className="relative max-w-7xl mx-auto mt-8 pt-6 border-t border-[#1D1E23] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#55524C]">
                      <span>© 2026 Kurso Scroll — Neo-Editorial Archive</span>
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#42B8A8]" />
                        All engines operational
                      </span>
                    </div>
                  </footer>
                </>
              }
            />
          </Routes>
        </div>
      </div>
    );
  }

  return (
    <>
      {showIntro && <IntroSplash onDone={dismissIntro} />}
      <ScrollProgress />
      {content}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;

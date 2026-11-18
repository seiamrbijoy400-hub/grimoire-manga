import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from './store/useStore.ts';
import { Navbar, MobileTabBar } from './components/Navbar.tsx';
import { BentoGrid } from './components/BentoGrid.tsx';
import { MangaDetailsView } from './components/MangaDetailsView.tsx';
import { ReaderView } from './components/ReaderView.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { SearchPage } from './pages/SearchPage.tsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { IntroSplash } from './components/IntroSplash.tsx';
import { ScrollProgress } from './components/ScrollProgress.tsx';
import { BrandLogo, WordMark } from './components/BrandMark.tsx';

const INTRO_KEY = 'kurso:intro-seen:v3';

const GENRES = [
  'Action', 'Fantasy', 'Romance', 'Manhwa', 'Seinen', 'Isekai',
  'Horror', 'Slice of Life', 'Shounen', 'Sci-Fi', 'Historical', 'Martial Arts',
];

/** Slow index ticker — printed matter, not a neon scroll. */
const IndexStrip: React.FC = () => {
  const row = [...GENRES, ...GENRES];
  return (
    <div className="relative overflow-hidden border-y border-ink-700 bg-ink-900">
      <div className="marquee-track flex w-max items-center whitespace-nowrap py-2.5">
        {row.map((genre, i) => (
          <span
            key={`${genre}-${i}`}
            className="flex items-center font-mono text-[10px] uppercase tracking-[0.18em] text-paper-dim"
          >
            <span className="px-4 tabular-nums text-ink-600">{String((i % GENRES.length) + 1).padStart(2, '0')}</span>
            <span>{genre}</span>
            <span className="px-4 text-stamp/60">·</span>
          </span>
        ))}
      </div>
    </div>
  );
};

/** Fine print footer with the real privacy story, no marketing fog. */
const Footer: React.FC = () => {
  const year = useMemo(() => new Date().getFullYear(), []);
  return (
    <footer className="border-t border-ink-700 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:pb-10 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex items-start gap-4">
            <BrandLogo className="h-14 w-14 shrink-0" />
            <div>
              <WordMark size="text-[15px]" showEdition />
              <p className="mt-2 max-w-xs text-[12.5px] leading-relaxed text-paper-dim">
                An independent index of manga, manhwa and manhua. No account, no feed
                algorithm — just the archive and your own shelf.
              </p>
            </div>
          </div>

          <div>
            <p className="eyebrow">The fine print</p>
            <ul className="mt-3 space-y-2 text-[12.5px] text-paper-dim">
              <li>Library and history stay on this device.</li>
              <li>Adult titles are blocked at the source.</li>
              <li>Continuous, paged RTL and double-page reading.</li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">Sources</p>
            <ul className="mt-3 space-y-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper-dim">
              <li className="flex items-center justify-between border-b border-ink-700 pb-2">
                <span>WeebCentral</span>
                <span className="text-teal-400">Live</span>
              </li>
              <li className="flex items-center justify-between border-b border-ink-700 pb-2">
                <span>MangaDex</span>
                <span className="text-teal-400">Safe</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Tokyo · Seoul · Shanghai</span>
                <span>{year}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-ink-700 pt-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper-dim/70 sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} Kurso Scroll</span>
          <span>Press ⌘K to search · Safe archive</span>
        </div>
      </div>
    </footer>
  );
};

const AppContent: React.FC = () => {
  const { currentView } = useStore();
  const [showIntro, setShowIntro] = useState(() => {
    try {
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

  useEffect(() => {
    if (!showIntro) return;
    document.documentElement.classList.add('intro-active');
    return () => document.documentElement.classList.remove('intro-active');
  }, [showIntro]);

  let content: React.ReactNode;

  if (currentView === 'reader') {
    content = <ReaderView />;
  } else if (currentView === 'details') {
    content = (
      <div className="min-h-screen bg-ink-950 text-paper">
        <SearchModal />
        <MangaDetailsView />
      </div>
    );
  } else {
    content = (
      <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-ink-950 text-paper">
        <SearchModal />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-paper focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-ink-950"
        >
          Skip to content
        </a>

        <div className="view-enter relative z-10 flex flex-1 flex-col">
          <Routes>
            <Route path="/search" element={<SearchPage />} />

            <Route
              path="*"
              element={
                <>
                  <Navbar />
                  <main id="main" className="flex-1">
                    <BentoGrid />
                  </main>
                  <IndexStrip />
                  <Footer />
                  <MobileTabBar />
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

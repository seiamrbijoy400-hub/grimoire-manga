import React from 'react';
import { useStore } from './store/useStore.ts';
import { Navbar } from './components/Navbar.tsx';
import { BentoGrid } from './components/BentoGrid.tsx';
import { MangaDetailsView } from './components/MangaDetailsView.tsx';
import { ReaderView } from './components/ReaderView.tsx';
import { SearchModal } from './components/SearchModal.tsx';

export const App: React.FC = () => {
  const { currentView } = useStore();

  return (
    <div className="min-h-screen bg-void-950 text-slate-100 flex flex-col font-sans selection:bg-solar-500/30 selection:text-solar-400">
      {/* Search Modal (global overlay Ctrl+K) */}
      <SearchModal />

      {/* Conditional Navbar (hidden during reader immersion) */}
      {currentView !== 'reader' && <Navbar />}

      {/* Main Views */}
      <div className="flex-1">
        {currentView === 'home' && <BentoGrid />}
        {currentView === 'details' && <MangaDetailsView />}
        {currentView === 'reader' && <ReaderView />}
      </div>

      {/* Editorial Archive Footer on Home & Details */}
      {currentView === 'home' && (
        <footer className="border-t border-[#292A2D] bg-[#090A0C] py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <img
                src="/logo.png"
                alt="KUROSCROLL"
                className="w-14 h-14 object-contain shrink-0 drop-shadow-[0_0_16px_rgba(200,30,30,0.4)]"
              />
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2.5">
                  <span className="font-serif text-base font-bold tracking-wider text-[#F0E9DC]">
                    KURO<span className="text-[#C69A45]">SCROLL</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#191A1F] text-[#AAA69D] border border-[#292A2D] font-mono">
                    Archive Ed. 2026
                  </span>
                </div>
                <p className="text-xs text-[#AAA69D] max-w-md leading-relaxed">
                  A curated digital archive dedicated to the appreciation and preservation of graphic storytelling from Japan, Korea, China, and across the globe.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#AAA69D]">
              <span className="font-mono text-[11px] text-[#AAA69D]/70">Tokyo • Seoul • Shanghai</span>
              <span className="hidden sm:inline text-[#292A2D]">|</span>
              <span className="hover:text-[#F0E9DC] cursor-default transition-colors">Continuous & Tankōbon RTL</span>
              <span className="hidden sm:inline text-[#292A2D]">|</span>
              <span className="hover:text-[#F0E9DC] cursor-default transition-colors">Press ⌘K to Search</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;

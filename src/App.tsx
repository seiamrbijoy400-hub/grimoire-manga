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

      {/* Footer on Home & Details */}
      {currentView === 'home' && (
        <footer className="border-t border-void-700/60 bg-void-950 py-8 px-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="font-serif text-sm font-black text-solar-400 tracking-wider">
              KUROSCROLL // NEO-ARCHIVE
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-solar-500/15 text-solar-400 border border-solar-500/30 font-mono font-bold">
              2026 Core
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Dual-Engine Continuous Webtoon & Tankōbon RTL Reader • WeebCentral Synchronized
          </p>
        </footer>
      )}
    </div>
  );
};

export default App;

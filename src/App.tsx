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
    <div className="min-h-screen bg-void-950 text-slate-100 flex flex-col font-sans selection:bg-victorian-gold/30 selection:text-victorian-gold">
      {/* Search Modal (global overlay) */}
      <SearchModal />

      {/* Conditional Navbar (hide in pure reader immersion if desired, or keep sticky) */}
      {currentView !== 'reader' && <Navbar />}

      {/* Main Views */}
      <div className="flex-1">
        {currentView === 'home' && <BentoGrid />}
        {currentView === 'details' && <MangaDetailsView />}
        {currentView === 'reader' && <ReaderView />}
      </div>

      {/* Footer on Home & Details */}
      {currentView === 'home' && (
        <footer className="border-t border-void-800/80 bg-void-950 py-8 px-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="font-serif text-sm font-bold text-amber-200/90 tracking-wider">
              GRIMOIREX • KUROSCROLL
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-victorian-gold/15 text-victorian-gold border border-victorian-gold/30">
              2026 Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Victorian Continuous Scroll Reading Platform • Synchronized with WeebCentral
          </p>
        </footer>
      )}
    </div>
  );
};

export default App;

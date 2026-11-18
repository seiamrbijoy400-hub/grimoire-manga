import React from 'react';
import { BookOpen, Search, Bookmark, History, ChevronLeft, Compass, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore.ts';

export const Navbar: React.FC = () => {
  const { currentView, activeTab, setView, setActiveTab, setSearchOpen, bookmarks, history } = useStore();
  const bookmarkCount = bookmarks.length;
  const historyCount = Object.keys(history).length;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-void-950/85 border-b border-void-700/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          {currentView !== 'home' && (
            <button
              onClick={() => setView('home')}
              className="p-2 rounded-xl bg-void-900 hover:bg-void-850 border border-void-750 text-slate-300 hover:text-solar-400 transition-all"
              title="Return to Grimoire Hub"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => {
              setView('home');
              setActiveTab('catalog');
            }}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solar-400 via-amber-600 to-void-950 p-[1.5px] shadow-lg shadow-solar-500/15 group-hover:shadow-solar-500/30 transition-all">
              <div className="w-full h-full bg-void-950 rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-solar-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-lg font-black tracking-wider bg-gradient-to-r from-solar-400 via-amber-200 to-solar-500 bg-clip-text text-transparent">
                  KURO<span className="text-slate-100 font-sans">SCROLL</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-solar-500/15 text-solar-400 border border-solar-500/30 font-mono font-bold">
                  2026
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight hidden sm:block">
                Neo-Archive Victorian Core
              </p>
            </div>
          </div>
        </div>

        {/* Center Search Pill (Tactical Futuristic Pill) */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-void-900 hover:bg-void-850 border border-void-750 text-slate-400 hover:text-slate-200 text-xs font-mono transition-all shadow-inner group"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-solar-400 group-hover:scale-105 transition-transform" />
              <span>Search WeebCentral titles, authors, genres...</span>
            </div>
            <kbd className="px-2 py-0.5 text-[10px] rounded bg-void-800 text-slate-400 border border-void-700 font-mono">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Navigation Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-xl bg-void-900 hover:bg-void-850 border border-void-750 text-slate-300 hover:text-solar-400 transition-colors"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Catalog Tab */}
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all ${
              currentView === 'home' && activeTab === 'catalog'
                ? 'bg-solar-500 text-void-950 border-solar-500 shadow-md shadow-solar-500/20 font-bold'
                : 'bg-void-900 hover:bg-void-850 border-void-750 text-slate-300 hover:text-solar-400'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Codex</span>
          </button>

          {/* Library Shelves Pill */}
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all ${
              currentView === 'home' && activeTab === 'bookmarks'
                ? 'bg-solar-500 text-void-950 border-solar-500 shadow-md shadow-solar-500/20 font-bold'
                : 'bg-void-900 hover:bg-void-850 border-void-750 text-slate-300 hover:text-solar-400'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shelves</span>
            {bookmarkCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  currentView === 'home' && activeTab === 'bookmarks'
                    ? 'bg-void-950 text-solar-400'
                    : 'bg-solar-500/20 text-solar-400'
                }`}
              >
                {bookmarkCount}
              </span>
            )}
          </button>

          {/* History Pill */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all ${
              currentView === 'home' && activeTab === 'history'
                ? 'bg-solar-500 text-void-950 border-solar-500 shadow-md shadow-solar-500/20 font-bold'
                : 'bg-void-900 hover:bg-void-850 border-void-750 text-slate-300 hover:text-solar-400'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chronicles</span>
            {historyCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  currentView === 'home' && activeTab === 'history'
                    ? 'bg-void-950 text-solar-400'
                    : 'bg-solar-500/20 text-solar-400'
                }`}
              >
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

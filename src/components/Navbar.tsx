import React from 'react';
import { BookOpen, Search, Bookmark, History, Sparkles, ChevronLeft } from 'lucide-react';
import { useStore } from '../store/useStore.ts';

export const Navbar: React.FC = () => {
  const { currentView, setView, setSearchOpen, bookmarks, history } = useStore();
  const bookmarkCount = bookmarks.length;
  const historyCount = Object.keys(history).length;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-void-950/80 border-b border-void-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          {currentView !== 'home' && (
            <button
              onClick={() => setView('home')}
              className="p-2 rounded-xl bg-void-850 hover:bg-void-800 border border-void-700/60 text-slate-300 hover:text-victorian-gold transition-all"
              title="Return to Grimoire Hub"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => setView('home')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-victorian-gold via-genz-amethyst to-void-950 p-[1.5px] shadow-lg shadow-victorian-gold/15 group-hover:shadow-victorian-gold/30 transition-all">
              <div className="w-full h-full bg-void-950 rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-victorian-gold group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-lg font-bold tracking-wider bg-gradient-to-r from-victorian-gold via-amber-200 to-victorian-gold bg-clip-text text-transparent">
                  GRIMOIRE<span className="text-genz-amethyst font-sans">X</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-victorian-gold/10 text-victorian-gold border border-victorian-gold/30 font-medium">
                  2026
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight hidden sm:block">
                Victorian Scroll Edition
              </p>
            </div>
          </div>
        </div>

        {/* Center Search Pill (Gen-Z style) */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-full bg-void-900 hover:bg-void-850 border border-void-700/60 text-slate-400 hover:text-slate-200 text-sm transition-all shadow-inner"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-victorian-gold" />
              <span>Search WeebCentral manga, manhwa...</span>
            </div>
            <kbd className="px-2 py-0.5 text-[11px] rounded bg-void-800 text-slate-400 border border-void-700 font-mono">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2.5 rounded-xl bg-void-900 hover:bg-void-850 border border-void-800 text-slate-300 hover:text-victorian-gold transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Bookmarks Pill */}
          <button
            onClick={() => setView('home')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-void-900 hover:bg-void-850 border border-void-800 text-slate-300 hover:text-victorian-gold transition-colors text-xs font-medium"
          >
            <Bookmark className="w-3.5 h-3.5 text-victorian-gold" />
            <span className="hidden sm:inline">Grimoires</span>
            {bookmarkCount > 0 && (
              <span className="px-1.5 py-0.2 bg-victorian-gold/20 text-victorian-gold rounded-full text-[10px] font-bold">
                {bookmarkCount}
              </span>
            )}
          </button>

          {/* History Pill */}
          <button
            onClick={() => setView('home')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-void-900 hover:bg-void-850 border border-void-800 text-slate-300 hover:text-genz-amethyst transition-colors text-xs font-medium"
          >
            <History className="w-3.5 h-3.5 text-genz-amethyst" />
            <span className="hidden sm:inline">Chronicles</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 bg-genz-amethyst/20 text-genz-amethyst rounded-full text-[10px] font-bold">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

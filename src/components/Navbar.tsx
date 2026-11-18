import React from 'react';
import { BookOpen, Search, Bookmark, History, ChevronLeft, Compass, SlidersHorizontal } from 'lucide-react';
import { useStore } from '../store/useStore.ts';

export const Navbar: React.FC = () => {
  const { currentView, activeTab, setView, setActiveTab, setSearchOpen, bookmarks, history } = useStore();
  const bookmarkCount = bookmarks.length;
  const historyCount = Object.keys(history).length;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#090A0C]/90 border-b border-[#292A2D] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          {currentView !== 'home' && (
            <button
              onClick={() => setView('home')}
              className="p-2 rounded-lg bg-[#111318] hover:bg-[#191A1F] border border-[#292A2D] text-[#AAA69D] hover:text-[#C69A45] transition-colors"
              title="Return to Archive"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div
            onClick={() => {
              setView('home');
              setActiveTab('catalog');
            }}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            {/* Literary Archival Monogram */}
            <div className="w-8 h-8 rounded-md bg-[#111318] border border-[#292A2D] flex items-center justify-center group-hover:border-[#C69A45]/60 transition-colors shadow-sm">
              <span className="font-serif text-sm font-bold text-[#C69A45]">K</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-base sm:text-lg font-bold tracking-wider text-[#F0E9DC]">
                  KURO<span className="text-[#C69A45]">SCROLL</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#191A1F] text-[#AAA69D] border border-[#292A2D] font-mono uppercase tracking-widest hidden sm:inline">
                  Archive
                </span>
              </div>
              <p className="text-[10px] text-[#AAA69D] font-sans tracking-tight hidden md:block">
                Neo-Editorial Manga Discovery
              </p>
            </div>
          </div>
        </div>

        {/* Center Search Input (Editorial Search Bar) */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg bg-[#111318] hover:bg-[#191A1F] border border-[#292A2D] hover:border-[#C69A45]/40 text-[#AAA69D] hover:text-[#F0E9DC] text-xs transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-[#AAA69D] group-hover:text-[#C69A45] transition-colors" />
              <span className="font-sans">Search titles, authors, genres...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#191A1F] text-[#AAA69D] border border-[#292A2D] font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-lg bg-[#111318] hover:bg-[#191A1F] border border-[#292A2D] text-[#AAA69D] hover:text-[#C69A45] transition-colors"
            title="Search Archive"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Discover Tab */}
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${
              currentView === 'home' && activeTab === 'catalog'
                ? 'bg-[#191A1F] text-[#C69A45] border border-[#C69A45]/40 font-semibold'
                : 'bg-transparent text-[#AAA69D] hover:text-[#F0E9DC] hover:bg-[#111318]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discover</span>
          </button>

          {/* My Library Tab */}
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${
              currentView === 'home' && activeTab === 'bookmarks'
                ? 'bg-[#191A1F] text-[#C69A45] border border-[#C69A45]/40 font-semibold'
                : 'bg-transparent text-[#AAA69D] hover:text-[#F0E9DC] hover:bg-[#111318]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Library</span>
            {bookmarkCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#C69A45]/20 text-[#C69A45]">
                {bookmarkCount}
              </span>
            )}
          </button>

          {/* Reading History Tab */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${
              currentView === 'home' && activeTab === 'history'
                ? 'bg-[#191A1F] text-[#C69A45] border border-[#C69A45]/40 font-semibold'
                : 'bg-transparent text-[#AAA69D] hover:text-[#F0E9DC] hover:bg-[#111318]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#191A1F] text-[#AAA69D] border border-[#292A2D]">
                {historyCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};

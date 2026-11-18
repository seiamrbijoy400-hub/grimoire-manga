import React from 'react';
import { BookOpen, Search, Bookmark, History, ChevronLeft, Compass, SlidersHorizontal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore.ts';
import { BrandMark, WordMark } from './BrandMark.tsx';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { currentView, activeTab, setView, setActiveTab, setSearchOpen, bookmarks, history } = useStore();
  const bookmarkCount = bookmarks.length;
  const historyCount = Object.keys(history).length;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-[#292A2D] transition-all">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C69A45]/35 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          {currentView !== 'home' && (
            <button
              onClick={() => {
                navigate('/');
                setView('home');
              }}
              className="p-2 rounded-lg bg-[#111318] hover:bg-[#191A1F] border border-[#292A2D] text-[#AAA69D] hover:text-[#C69A45] transition-colors"
              title="Return to Archive"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div
            onClick={() => {
              navigate('/');
              setView('home');
              setActiveTab('catalog');
            }}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            {/* Kurso Scroll brand emblem */}
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-[13px] bg-[#C69A45]/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <BrandMark
                className="relative w-full h-full origin-center transition-transform duration-500 group-hover:scale-[1.08] group-hover:-rotate-3"
                glow
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <WordMark size="text-base sm:text-lg" showEdition />
              </div>
              <p className="text-[10px] text-[#AAA69D] font-sans tracking-tight hidden md:block">
                Manga for the scroll generation
              </p>
            </div>
          </div>
        </div>

        {/* Center Search Input (Editorial Search Bar) -> Direct navigation to /search */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={() => navigate('/search')}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg bg-[#111318] hover:bg-[#191A1F] border border-[#292A2D] hover:border-[#C69A45]/40 text-[#AAA69D] hover:text-[#F0E9DC] text-xs transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-[#AAA69D] group-hover:text-[#C69A45] transition-colors" />
              <span className="font-sans">Search titles, authors, genres...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#191A1F] text-[#AAA69D] border border-[#292A2D] font-mono">
              Search
            </kbd>
          </button>
        </div>

        {/* Right Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Search Button -> Direct navigation to /search */}
          <button
            onClick={() => navigate('/search')}
            className="md:hidden p-2 rounded-lg bg-[#111318] hover:bg-[#191A1F] border border-[#292A2D] text-[#AAA69D] hover:text-[#C69A45] transition-colors"
            title="Search Archive"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Discover Tab */}
          <button
            onClick={() => {
              navigate('/');
              setActiveTab('catalog');
            }}
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

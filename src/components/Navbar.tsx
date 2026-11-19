import React from 'react';
import { Search, Bookmark, Clock, Compass, ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore.ts';
import { BrandLogo, WordMark } from './BrandMark.tsx';
import { ambienceSynthesizer } from '../services/audioAmbience.ts';

const NAV_ITEMS = [
  { id: 'catalog', label: 'Index', icon: Compass },
  { id: 'bookmarks', label: 'Library', icon: Bookmark },
  { id: 'history', label: 'History', icon: Clock },
] as const;

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentView, activeTab, setView, setActiveTab, bookmarks, history } = useStore();
  const bookmarkCount = bookmarks.length;
  const historyCount = Object.keys(history).length;
  const onSearch = location.pathname === '/search';

  const goHome = (tab: 'catalog' | 'bookmarks' | 'history') => {
    ambienceSynthesizer.playHapticClick();
    navigate('/');
    setView('home');
    setActiveTab(tab);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink-700 bg-ink-950/95 backdrop-blur-md safe-top">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Masthead */}
        <div className="flex min-w-0 items-center gap-3">
          {currentView !== 'home' && (
            <button
              onClick={() => goHome('catalog')}
              className="btn-icon -ml-1"
              aria-label="Back to the index"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => goHome('catalog')}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label="Kurso Scroll home"
          >
            <BrandLogo compact className="h-9 w-9 shrink-0" />
            <span className="min-w-0">
              <WordMark size="text-[15px] sm:text-base" />
              <span className="mt-1 hidden font-mono text-[9px] uppercase tracking-[0.18em] text-paper-dim md:block">
                Manga · Manhwa · Manhua
              </span>
            </span>
          </button>
        </div>

        {/* Search trigger */}
        <button
          onClick={() => {
            ambienceSynthesizer.playHapticClick();
            navigate('/search');
          }}
          className="btn-shockwave group hidden h-10 w-full max-w-[360px] items-center justify-between gap-3 rounded-md border border-ink-700 px-3 text-left transition-colors hover:border-ink-600 lg:flex"
          aria-label="Search the archive"
        >
          <span className="flex items-center gap-2.5 text-[13px] text-paper-dim group-hover:text-paper">
            <Search className="h-3.5 w-3.5" />
            Search titles, authors, genres
          </span>
          <kbd className="rounded border border-ink-700 px-1.5 py-0.5 font-mono text-[10px] text-paper-dim">
            ⌘K
          </kbd>
        </button>

        {/* Section links */}
        <nav className="flex items-center gap-1" aria-label="Sections">
          <button
            onClick={() => {
              ambienceSynthesizer.playHapticClick();
              navigate('/search');
            }}
            className="btn-shockwave btn-icon hidden sm:flex lg:hidden"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {NAV_ITEMS.map((item, i) => {
            const active = !onSearch && currentView === 'home' && activeTab === item.id;
            const count = item.id === 'bookmarks' ? bookmarkCount : item.id === 'history' ? historyCount : 0;
            return (
              <button
                key={item.id}
                onClick={() => goHome(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative hidden h-16 items-center gap-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors sm:flex ${
                  active ? 'text-paper' : 'text-paper-dim hover:text-paper'
                }`}
              >
                <span className={`hidden lg:inline ${active ? 'text-stamp' : 'text-paper-dim/60'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{item.label}</span>
                {count > 0 && (
                  <span className="tnum text-[9px] text-paper-dim">{count}</span>
                )}
                <span
                  className={`absolute inset-x-2 bottom-0 h-[2px] transition-colors ${
                    active ? 'bg-stamp' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}

        </nav>
      </div>
    </header>
  );
};

/**
 * Thumb-reach navigation for phones. Sits above the safe area, 44px+ targets,
 * and mirrors the masthead sections so the two never disagree.
 */
export const MobileTabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentView, activeTab, setView, setActiveTab } = useStore();
  const onSearch = location.pathname === '/search';

  const go = (tab: 'catalog' | 'bookmarks' | 'history') => {
    navigate('/');
    setView('home');
    setActiveTab(tab);
  };

  const tabs = [
    {
      id: 'catalog',
      label: 'Index',
      icon: Compass,
      active: !onSearch && currentView === 'home' && activeTab === 'catalog',
      onClick: () => go('catalog'),
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      active: onSearch,
      onClick: () => navigate('/search'),
    },
    {
      id: 'bookmarks',
      label: 'Library',
      icon: Bookmark,
      active: !onSearch && currentView === 'home' && activeTab === 'bookmarks',
      onClick: () => go('bookmarks'),
    },
    {
      id: 'history',
      label: 'History',
      icon: Clock,
      active: !onSearch && currentView === 'home' && activeTab === 'history',
      onClick: () => go('history'),
    },
  ];

  const activeIndex = tabs.findIndex((t) => t.active);

  return (
    <nav
      className="tab-bar fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 sm:hidden"
      aria-label="Primary"
    >
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-[2px] w-1/4 transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      >
        <span className="mx-auto block h-full w-8 bg-stamp" />
      </span>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={tab.onClick}
            aria-current={tab.active ? 'page' : undefined}
            className={`relative flex h-[58px] flex-col items-center justify-center gap-1.5 transition-colors ${
              tab.active ? 'text-paper' : 'text-paper-dim'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={tab.active ? 2.2 : 1.8} />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em]">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  ChevronLeft,
  BookOpen,
  ArrowUpDown,
  Search,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  Share2,
  Check,
  RotateCcw,
  Globe
} from 'lucide-react';
import { useStore } from '../store/useStore.ts';
import { fetchMangaDetails, fetchChapterList, getProxyImageUrl } from '../services/api.ts';
import { MangaDetails, ChapterItem, BookmarkCategory } from '../types.ts';

const CHUNK_SIZE = 50;

const LANGUAGE_META: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  es: { label: 'Español', flag: '🇪🇸' },
  'es-la': { label: 'Español (Latam)', flag: '🇲🇽' },
  'pt-br': { label: 'Português', flag: '🇧🇷' },
  fr: { label: 'Français', flag: '🇫🇷' },
  id: { label: 'Indonesia', flag: '🇮🇩' },
  ja: { label: '日本語', flag: '🇯🇵' },
  ko: { label: '한국어', flag: '🇰🇷' },
  zh: { label: '中文', flag: '🇨🇳' },
  'zh-hk': { label: '粵語', flag: '🇭🇰' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  it: { label: 'Italiano', flag: '🇮🇹' },
  ru: { label: 'Русский', flag: '🇷🇺' },
  ar: { label: 'العربية', flag: '🇸🇦' },
  hi: { label: 'हिन्दी', flag: '🇮🇳' },
  he: { label: 'עברית', flag: '🇮🇱' },
  ka: { label: 'ქართული', flag: '🇬🇪' },
  ms: { label: 'Melayu', flag: '🇲🇾' },
  th: { label: 'ไทย', flag: '🇹🇭' },
  vi: { label: 'Tiếng Việt', flag: '🇻🇳' },
  tr: { label: 'Türkçe', flag: '🇹🇷' },
  pl: { label: 'Polski', flag: '🇵🇱' },
};

const SHELF_LABELS: Record<BookmarkCategory, { label: string; icon: string; color: string }> = {
  reading: { label: 'Reading', icon: '📖', color: 'text-solar-400' },
  plan: { label: 'Plan to Read', icon: '⏳', color: 'text-telemetry-cyan' },
  completed: { label: 'Completed', icon: '🏆', color: 'text-telemetry-emerald' },
  favorites: { label: 'Favorites', icon: '⭐', color: 'text-amber-300' },
};

export const MangaDetailsView: React.FC = () => {
  const {
    activeMangaId,
    setView,
    openChapter,
    toggleBookmark,
    isBookmarked,
    getBookmark,
    setBookmarkCategory,
    getMangaHistory,
    isChapterRead,
    markChapterRead,
    markMangaAllRead,
    setActiveMangaMeta,
  } = useStore();

  const [details, setDetails] = useState<MangaDetails | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [chapterFilter, setChapterFilter] = useState('');
  const [sortDescending, setSortDescending] = useState(true);
  const [selectedChunk, setSelectedChunk] = useState<number>(0); // 0 = first chunk, -1 = all
  const [shelfDropdownOpen, setShelfDropdownOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!activeMangaId) return;

    async function load() {
      setLoading(true);
      const [d, ch] = await Promise.all([
        fetchMangaDetails(activeMangaId!),
        fetchChapterList(activeMangaId!),
      ]);
      setDetails(d);
      if (d) {
        setActiveMangaMeta(d.title, d.coverImage);
      }
      setChapters(ch);
      setLoading(false);
    }
    load();
  }, [activeMangaId, setActiveMangaMeta]);

  if (!activeMangaId) return null;

  const bookmarked = details ? isBookmarked(details.id) : false;
  const currentBookmark = details ? getBookmark(details.id) : undefined;
  const history = getMangaHistory(activeMangaId);

  // Available Languages and chapter counts
  const availableLanguages = useMemo(() => {
    const map: Record<string, number> = {};
    chapters.forEach((ch) => {
      const lang = ch.language || 'en';
      map[lang] = (map[lang] || 0) + 1;
    });
    return map;
  }, [chapters]);

  const languageKeys = useMemo(() => Object.keys(availableLanguages), [availableLanguages]);

  // Set default language intelligently: English first, or most populous language
  useEffect(() => {
    if (languageKeys.length === 0) return;
    if (languageKeys.includes('en')) {
      setSelectedLanguage('en');
    } else if (languageKeys.length === 1) {
      setSelectedLanguage(languageKeys[0]);
    } else {
      const sorted = [...languageKeys].sort((a, b) => availableLanguages[b] - availableLanguages[a]);
      setSelectedLanguage(sorted[0] || 'all');
    }
  }, [languageKeys, availableLanguages]);

  // 1. Filter chapters by selected language
  const languageFilteredChapters = useMemo(() => {
    if (selectedLanguage === 'all') return chapters;
    return chapters.filter((ch) => (ch.language || 'en') === selectedLanguage);
  }, [chapters, selectedLanguage]);

  // 2. Filter chapters by search query
  const filteredChapters = useMemo(() => {
    return languageFilteredChapters.filter((ch) =>
      ch.title.toLowerCase().includes(chapterFilter.toLowerCase())
    );
  }, [languageFilteredChapters, chapterFilter]);

  // Order chapters
  const orderedChapters = useMemo(() => {
    // WeebCentral delivers newest first by default
    return sortDescending ? filteredChapters : [...filteredChapters].reverse();
  }, [filteredChapters, sortDescending]);

  // Chunking for performance and visual comfort if chapters > CHUNK_SIZE
  const chunksCount = Math.ceil(orderedChapters.length / CHUNK_SIZE);

  const displayChapters = useMemo(() => {
    if (selectedChunk === -1 || chunksCount <= 1 || chapterFilter) {
      return orderedChapters;
    }
    const start = selectedChunk * CHUNK_SIZE;
    return orderedChapters.slice(start, start + CHUNK_SIZE);
  }, [orderedChapters, selectedChunk, chunksCount, chapterFilter]);

  // Determine starting / resume chapter
  const oldestChapter = chapters.length > 0 ? chapters[chapters.length - 1] : undefined;
  const resumeChapter = history
    ? chapters.find((c) => c.id === history.chapterId) || oldestChapter
    : oldestChapter;

  const totalReadCount = chapters.filter((c) => isChapterRead(c.id)).length;
  const readPercentage = chapters.length > 0 ? Math.round((totalReadCount / chapters.length) * 100) : 0;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen pb-24 animate-fade-in">
      {/* Sticky Top Bar */}
      <div className="sticky top-16 z-30 backdrop-blur-md bg-[#090A0C]/90 border-b border-[#292A2D] px-4 sm:px-6 py-2.5 flex items-center justify-between">
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-1.5 text-xs text-[#AAA69D] hover:text-[#C69A45] font-sans transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Return to Archive</span>
        </button>

        {details && (
          <div className="flex items-center gap-2 truncate max-w-xs sm:max-w-md">
            <span className="text-xs text-[#F0E9DC] font-serif font-bold truncate">
              {details.title}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#191A1F] text-[#C69A45] border border-[#292A2D] font-mono shrink-0">
              {readPercentage}% Read
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-6 animate-pulse">
          <div className="h-72 rounded-xl bg-[#111318] border border-[#292A2D]" />
          <div className="h-44 rounded-xl bg-[#111318] border border-[#292A2D]" />
        </div>
      ) : details ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
          {/* Header Hero Card */}
          <div className="relative rounded-2xl overflow-hidden bg-[#111318] border border-[#292A2D] p-6 sm:p-8 shadow-2xl">
            {/* Ambient Blurred Backdrop */}
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-15 pointer-events-none"
              style={{ backgroundImage: `url(${getProxyImageUrl(details.cover)})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090A0C] via-[#090A0C]/90 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
              {/* Cover Artwork */}
              <div className="w-40 sm:w-56 aspect-[3/4] rounded-lg overflow-hidden shadow-2xl border border-[#292A2D] shrink-0 mx-auto md:mx-0 bg-[#090A0C]">
                <img
                  src={getProxyImageUrl(details.cover)}
                  alt={details.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Information Column */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-[#191A1F] border border-[#292A2D] text-xs font-mono text-[#C69A45] font-semibold">
                    {details.type || 'Manga'}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#191A1F] border border-[#292A2D] text-xs font-mono text-[#AAA69D]">
                    {details.status || 'Ongoing'}
                  </span>
                  {details.author && (
                    <span className="text-xs text-[#AAA69D] font-sans">
                      By <span className="text-[#F0E9DC] font-semibold">{details.author}</span>
                    </span>
                  )}
                  <span className="text-xs text-[#AAA69D]/70 font-mono">
                    • {chapters.length} Chapters
                  </span>
                </div>

                <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#F0E9DC] tracking-tight leading-tight">
                  {details.title}
                </h1>

                {/* Genre Badges */}
                {details.tags && details.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {details.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg bg-void-850 border border-void-700/60 text-[11px] text-slate-300 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Synopsis */}
                {details.synopsis && (
                  <div className="pt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-h-48 overflow-y-auto pr-2 border-l-2 border-solar-500/50 pl-3">
                    <p className="whitespace-pre-line">{details.synopsis}</p>
                  </div>
                )}

                {/* Call-to-Action Bar */}
                <div className="pt-4 flex flex-wrap items-center gap-3">
                  {/* Start or Resume Reading */}
                  {resumeChapter && (
                    <button
                      onClick={() => openChapter(activeMangaId, resumeChapter.id, resumeChapter.title, details.title, details.coverImage)}
                      className="px-6 py-2.5 rounded-lg bg-[#C69A45] hover:bg-[#D8AA55] text-[#090A0C] font-semibold text-sm shadow-lg shadow-[#C69A45]/15 transition-all flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{history ? `Resume ${resumeChapter.title}` : `Read Chapter 1`}</span>
                    </button>
                  )}

                  {/* Bookmark & Shelf Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShelfDropdownOpen(!shelfDropdownOpen)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-2 transition-all shadow-sm ${
                        bookmarked
                          ? 'bg-solar-500/20 text-solar-400 border-solar-500/60'
                          : 'bg-void-850 hover:bg-void-800 text-slate-300 border-void-700/70 hover:text-solar-400'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
                      <span>
                        {currentBookmark ? SHELF_LABELS[currentBookmark.category]?.label : 'Add to Shelf'}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 ml-1" />
                    </button>

                    {shelfDropdownOpen && (
                      <div className="absolute top-full mt-2 left-0 w-48 p-1.5 rounded-2xl bg-void-900 border border-void-700 shadow-2xl z-40 space-y-1 text-xs font-mono animate-fade-in">
                        {(Object.keys(SHELF_LABELS) as BookmarkCategory[]).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              if (!bookmarked) toggleBookmark(details, cat);
                              else setBookmarkCategory(details.id, cat);
                              setShelfDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-void-800 transition-colors ${
                              currentBookmark?.category === cat
                                ? 'bg-solar-500/15 text-solar-400 font-bold'
                                : 'text-slate-300'
                            }`}
                          >
                            <span>{SHELF_LABELS[cat].icon}</span>
                            <span>{SHELF_LABELS[cat].label}</span>
                            {currentBookmark?.category === cat && (
                              <Check className="w-3 h-3 ml-auto text-solar-400" />
                            )}
                          </button>
                        ))}

                        {bookmarked && (
                          <div className="pt-1 border-t border-void-750">
                            <button
                              onClick={() => {
                                toggleBookmark(details);
                                setShelfDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-1.5 rounded-xl text-telemetry-crimson hover:bg-void-800 transition-colors text-[11px]"
                            >
                              Remove from Library
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Share Link Button */}
                  <button
                    onClick={handleCopyLink}
                    className="p-2.5 rounded-xl bg-void-850 hover:bg-void-800 border border-void-700/70 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Copy Share Link"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-telemetry-emerald" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chapters Codex Header & Tooling */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-void-700/60 pb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-serif text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Scroll Chapters</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-void-800 text-slate-400 font-mono">
                    {chapters.length}
                  </span>
                </h3>
                <span className="text-xs font-mono text-solar-400">
                  {totalReadCount} / {chapters.length} Read ({readPercentage}%)
                </span>
              </div>

              {/* Utility buttons: Mark All Read & Reverse sort */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    markMangaAllRead(
                      details.id,
                      chapters.map((c) => c.id)
                    )
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-void-900 hover:bg-void-850 border border-void-750 text-slate-400 hover:text-telemetry-emerald text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                  title="Mark all chapters as read"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>

                <button
                  onClick={() => setSortDescending(!sortDescending)}
                  className="px-2.5 py-1.5 rounded-xl bg-void-900 hover:bg-void-850 border border-void-750 text-slate-400 hover:text-solar-400 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                  title="Toggle Sorting"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{sortDescending ? 'Newest First' : 'Oldest First'}</span>
                </button>
              </div>
            </div>

            {/* Language Selector Bar — always shown when chapters are available */}
            {languageKeys.length >= 1 && (
              <div className="p-3 rounded-xl bg-[#111318] border border-[#292A2D] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans font-semibold text-[#F0E9DC] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#C69A45]" />
                    <span>Translation Editions</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-[#191A1F] border border-[#292A2D] text-[10px] font-mono text-[#AAA69D]">
                      {languageKeys.length} language{languageKeys.length !== 1 ? 's' : ''}
                    </span>
                  </span>
                  <span className="text-[11px] font-sans text-[#AAA69D]">
                    Showing: <strong className="text-[#C69A45]">
                      {selectedLanguage === 'all'
                        ? 'All Editions'
                        : LANGUAGE_META[selectedLanguage]?.label || selectedLanguage.toUpperCase()}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-wrap">
                  {/* "All" pill only shown when there are multiple languages */}
                  {languageKeys.length > 1 && (
                    <button
                      onClick={() => setSelectedLanguage('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-sans shrink-0 transition-all flex items-center gap-1.5 ${
                        selectedLanguage === 'all'
                          ? 'bg-[#C69A45] text-[#090A0C] font-semibold shadow-md'
                          : 'bg-[#191A1F] text-[#AAA69D] hover:text-[#F0E9DC] border border-[#292A2D]'
                      }`}
                    >
                      <span>🌐</span>
                      <span>All</span>
                      <span className={`text-[10px] font-mono px-1.5 rounded-full ${
                        selectedLanguage === 'all' ? 'bg-[#090A0C]/30 text-[#090A0C] font-bold' : 'bg-[#111318] text-[#AAA69D]'
                      }`}>
                        {chapters.length}
                      </span>
                    </button>
                  )}

                  {languageKeys.map((lang) => {
                    const meta = LANGUAGE_META[lang] || { label: lang.toUpperCase(), flag: '🌐' };
                    const count = availableLanguages[lang];
                    const isSelected = selectedLanguage === lang || (languageKeys.length === 1 && selectedLanguage === 'all');

                    return (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-sans shrink-0 flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-[#C69A45] text-[#090A0C] font-semibold shadow-md'
                            : 'bg-[#191A1F] text-[#AAA69D] hover:text-[#F0E9DC] border border-[#292A2D]'
                        }`}
                      >
                        <span>{meta.flag}</span>
                        <span>{meta.label}</span>
                        <span className={`text-[10px] font-mono px-1.5 rounded-full ${
                          isSelected ? 'bg-[#090A0C]/30 text-[#090A0C] font-bold' : 'bg-[#111318] text-[#AAA69D]'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chapter Search & Chunk Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative max-w-sm flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chapterFilter}
                  onChange={(e) => setChapterFilter(e.target.value)}
                  placeholder="Filter chapters (e.g. 15, Extra)..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-void-900 border border-void-750 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-solar-500/60 font-mono"
                />
              </div>

              {/* Chunk Selector Tabs if chapters > CHUNK_SIZE */}
              {chunksCount > 1 && !chapterFilter && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {Array.from({ length: chunksCount }).map((_, i) => {
                    const start = i * CHUNK_SIZE + 1;
                    const end = Math.min((i + 1) * CHUNK_SIZE, orderedChapters.length);
                    const isSelected = selectedChunk === i;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedChunk(i)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono shrink-0 transition-all ${
                          isSelected
                            ? 'bg-solar-500 text-void-950 font-bold shadow-sm'
                            : 'bg-void-900 text-slate-400 hover:text-slate-200 border border-void-750'
                        }`}
                      >
                        {start}–{end}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setSelectedChunk(-1)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono shrink-0 transition-all ${
                      selectedChunk === -1
                        ? 'bg-solar-500 text-void-950 font-bold shadow-sm'
                        : 'bg-void-900 text-slate-400 hover:text-slate-200 border border-void-750'
                    }`}
                  >
                    All ({orderedChapters.length})
                  </button>
                </div>
              )}
            </div>

            {/* Chapters Grid / List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
              {displayChapters.map((ch) => {
                const isRead = isChapterRead(ch.id);
                const isResume = history?.chapterId === ch.id;

                return (
                  <div
                    key={ch.id}
                    onClick={() => openChapter(activeMangaId, ch.id, ch.title, details?.title, details?.coverImage)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isResume
                        ? 'bg-void-850 border-solar-500/70 shadow-md shadow-solar-500/10'
                        : isRead
                        ? 'bg-void-950/60 border-void-800 text-slate-400 hover:bg-void-900 hover:border-void-700'
                        : 'bg-void-900/90 border-void-750 hover:border-solar-500/50 hover:bg-void-850'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        {isRead ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-telemetry-emerald shrink-0" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-solar-400 shrink-0 transition-colors" />
                        )}
                        <h4
                          className={`font-serif text-xs font-bold truncate transition-colors ${
                            isResume
                              ? 'text-solar-400'
                              : isRead
                              ? 'text-slate-400 line-through decoration-slate-600'
                              : 'text-slate-200 group-hover:text-solar-400'
                          }`}
                        >
                          {ch.title}
                        </h4>
                        {ch.language && selectedLanguage === 'all' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-void-950 text-slate-400 border border-void-750 font-mono shrink-0 ml-1">
                            {LANGUAGE_META[ch.language]?.flag || '🌐'} {ch.language.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {ch.date && (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 ml-3.5">
                          {ch.date}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isResume && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-solar-500/20 text-solar-400 font-mono font-bold">
                          Current
                        </span>
                      )}
                      <span className="text-slate-500 group-hover:text-solar-400 text-xs font-mono transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <p className="text-sm font-serif text-slate-400">Failed to decipher grimoire metadata.</p>
          <button
            onClick={() => setView('home')}
            className="px-4 py-2 rounded-xl bg-void-900 border border-void-750 text-xs font-mono text-solar-400 hover:bg-void-850"
          >
            Return to Library
          </button>
        </div>
      )}
    </div>
  );
};

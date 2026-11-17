import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  ChevronLeft,
  BookOpen,
  ArrowUpDown,
  Search,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useStore } from '../store/useStore.ts';
import { fetchMangaDetails, fetchChapterList, getProxyImageUrl } from '../services/api.ts';
import { MangaDetails, ChapterItem } from '../types.ts';

export const MangaDetailsView: React.FC = () => {
  const { activeMangaId, setView, openChapter, toggleBookmark, isBookmarked, getMangaHistory } = useStore();
  const [details, setDetails] = useState<MangaDetails | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapterFilter, setChapterFilter] = useState('');
  const [sortDescending, setSortDescending] = useState(true);

  useEffect(() => {
    if (!activeMangaId) return;

    async function load() {
      setLoading(true);
      const [d, ch] = await Promise.all([
        fetchMangaDetails(activeMangaId!),
        fetchChapterList(activeMangaId!),
      ]);
      setDetails(d);
      setChapters(ch);
      setLoading(false);
    }
    load();
  }, [activeMangaId]);

  if (!activeMangaId) return null;

  const bookmarked = details ? isBookmarked(details.id) : false;
  const history = getMangaHistory(activeMangaId);

  // Filter & sort chapters
  const filteredChapters = chapters
    .filter((ch) => ch.title.toLowerCase().includes(chapterFilter.toLowerCase()))
    .sort((a, b) => (sortDescending ? 0 : -1)); // WeebCentral returns newest first by default

  const displayChapters = sortDescending ? filteredChapters : [...filteredChapters].reverse();

  // Determine starting chapter
  const firstChapter = chapters[chapters.length - 1]; // oldest
  const resumeChapter = history
    ? chapters.find((c) => c.id === history.chapterId) || firstChapter
    : firstChapter;

  return (
    <div className="min-h-screen pb-20 animate-fade-in">
      {/* Sticky Top Bar */}
      <div className="sticky top-16 z-30 backdrop-blur-md bg-void-950/80 border-b border-void-800 px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-victorian-gold font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>
        {details && (
          <span className="text-xs text-slate-300 font-serif font-bold truncate max-w-xs">
            {details.title}
          </span>
        )}
      </div>

      {loading ? (
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-6 animate-pulse">
          <div className="h-64 rounded-3xl bg-void-900 border border-void-800" />
          <div className="h-40 rounded-2xl bg-void-900 border border-void-800" />
        </div>
      ) : details ? (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
          {/* Header Hero Card */}
          <div className="relative rounded-3xl overflow-hidden bg-void-900 border border-victorian-gold/30 p-6 sm:p-8 shadow-2xl shadow-victorian-gold/5">
            {/* Ambient Blurred Backdrop */}
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-25"
              style={{ backgroundImage: `url(${details.cover})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void-950 via-void-950/90 to-transparent" />

            <div className="relative z-10 flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
              {/* Cover Artwork */}
              <div className="w-40 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-victorian-gold/40 shrink-0 mx-auto md:mx-0">
                <img
                  src={getProxyImageUrl(details.cover)}
                  alt={details.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Information Column */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-victorian-gold/20 text-victorian-gold border border-victorian-gold/40 text-xs font-serif font-bold">
                    {details.type || 'Manga'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-void-800 text-slate-300 text-xs font-mono">
                    {details.status || 'Ongoing'}
                  </span>
                  {details.author && (
                    <span className="text-xs text-slate-400 font-mono">
                      By <span className="text-slate-200">{details.author}</span>
                    </span>
                  )}
                </div>

                <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
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
                  <div className="pt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-h-48 overflow-y-auto pr-2 border-l-2 border-victorian-gold/40 pl-3">
                    <p className="whitespace-pre-line">{details.synopsis}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 flex flex-wrap items-center gap-3">
                  {resumeChapter && (
                    <button
                      onClick={() => openChapter(details.id, resumeChapter.id, resumeChapter.title)}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-victorian-gold to-amber-500 hover:from-amber-400 hover:to-victorian-gold text-void-950 font-serif font-bold text-sm shadow-lg shadow-victorian-gold/25 hover:shadow-victorian-gold/40 transition-all flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{history ? `Resume ${resumeChapter.title}` : `Start Reading`}</span>
                    </button>
                  )}

                  <button
                    onClick={() => toggleBookmark(details)}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      bookmarked
                        ? 'bg-victorian-gold/20 text-victorian-gold border-victorian-gold shadow-md shadow-victorian-gold/20'
                        : 'bg-void-850 hover:bg-void-800 border-void-700 text-slate-300 hover:text-slate-100'
                    }`}
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                    <span>{bookmarked ? 'Preserved in Grimoire' : 'Bookmark'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chapters Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-void-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-victorian-gold" />
                <h3 className="font-serif text-lg font-bold text-slate-100">
                  Chapters Archive ({chapters.length})
                </h3>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={chapterFilter}
                    onChange={(e) => setChapterFilter(e.target.value)}
                    placeholder="Find chapter..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-void-900 border border-void-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-victorian-gold/60 w-36 sm:w-48 font-mono"
                  />
                </div>

                <button
                  onClick={() => setSortDescending(!sortDescending)}
                  className="px-3 py-1.5 rounded-xl bg-void-900 hover:bg-void-850 border border-void-800 text-xs text-slate-300 hover:text-victorian-gold flex items-center gap-1.5 transition-colors font-mono"
                  title="Toggle Order"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{sortDescending ? 'Newest' : 'Oldest'}</span>
                </button>
              </div>
            </div>

            {/* Chapter Items List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {displayChapters.map((ch) => {
                const isCurrentRead = history?.chapterId === ch.id;

                return (
                  <div
                    key={ch.id}
                    onClick={() => openChapter(details.id, ch.id, ch.title)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isCurrentRead
                        ? 'bg-victorian-gold/15 border-victorian-gold text-victorian-gold font-bold shadow-sm shadow-victorian-gold/20'
                        : 'bg-void-900 hover:bg-void-850 border-void-800/80 text-slate-300 hover:text-slate-100 hover:border-void-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isCurrentRead ? (
                        <CheckCircle2 className="w-4 h-4 text-victorian-gold shrink-0" />
                      ) : (
                        <BookOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span className="text-xs font-serif truncate">{ch.title}</span>
                    </div>

                    {ch.date && (
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                        {ch.date.split('T')[0]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-sm text-slate-500">Manga details not found.</p>
        </div>
      )}
    </div>
  );
};

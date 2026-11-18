import React, { useState } from 'react';
import {
  X,
  Filter,
  RotateCcw,
  Sparkles,
  Check,
  Ban,
  ArrowUpDown,
  Compass,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import { FilterState, TypeOption, MangaSource } from '../types.ts';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  totalResultsCount?: number;
}

export const ALL_TAGS = [
  "Action", "Adult", "Adventure", "Comedy", "Doujinshi", "Drama", "Ecchi",
  "Fantasy", "Gender Bender", "Harem", "Historical", "Horror",
  "Isekai", "Josei", "Martial Arts", "Mature", "Mecha",
  "Mystery", "Psychological", "Romance", "School Life", "Sci-fi",
  "Seinen", "Shoujo", "Shounen", "Slice of Life", "Smut", "Sports",
  "Supernatural", "Tragedy", "Yaoi", "Yuri"
];

export const TYPE_OPTIONS: TypeOption[] = [
  { id: 'Manga', label: 'Manga', flag: '🇯🇵', desc: 'Japanese Tanks' },
  { id: 'Manhwa', label: 'Manhwa', flag: '🇰🇷', desc: 'Korean Webtoons' },
  { id: 'Manhua', label: 'Manhua', flag: '🇨🇳', desc: 'Chinese Scrolls' },
  { id: 'OEL', label: 'OEL', flag: '🌐', desc: 'Global English' },
];

export const COUNTRY_OPTIONS = [
  { id: 'JP', label: 'Japan', flag: '🇯🇵', desc: 'Manga Origin' },
  { id: 'KR', label: 'South Korea', flag: '🇰🇷', desc: 'Manhwa / Webtoon' },
  { id: 'CN', label: 'China', flag: '🇨🇳', desc: 'Manhua Origin' },
  { id: 'GLOBAL', label: 'Global / US', flag: '🌐', desc: 'Western & Indie' },
];

export const LANGUAGE_OPTIONS = [
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
  { id: 'pt-br', label: 'Português', flag: '🇧🇷' },
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'id', label: 'Indonesia', flag: '🇮🇩' },
  { id: 'ja', label: '日本語', flag: '🇯🇵' },
  { id: 'ko', label: '한국어', flag: '🇰🇷' },
  { id: 'zh', label: '中文', flag: '🇨🇳' },
];

export const STATUS_OPTIONS = [
  { id: 'Ongoing', label: 'Ongoing', desc: 'Active releases' },
  { id: 'Complete', label: 'Completed', desc: 'Concluded tales' },
  { id: 'Hiatus', label: 'Hiatus', desc: 'On pause' },
];

export const SORT_OPTIONS = [
  { id: 'Popularity', label: '🔥 Popularity' },
  { id: 'Latest Updates', label: '⚡ Latest Updates' },
  { id: 'Alphabet', label: '🔤 Alphabetical' },
  { id: 'Subscribers', label: '⭐ Most Subscribed' },
  { id: 'Recently Added', label: '✨ Recently Added' },
];

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset,
  totalResultsCount
}) => {
  const [tagSearch, setTagSearch] = useState('');

  if (!isOpen) return null;

  // Toggle tag: Neutral -> Included (green) -> Excluded (red) -> Neutral
  const cycleTagState = (tag: string) => {
    const isIncluded = filters.includedTags.includes(tag);
    const isExcluded = filters.excludedTags.includes(tag);

    if (!isIncluded && !isExcluded) {
      onChange({
        ...filters,
        includedTags: [...filters.includedTags, tag]
      });
    } else if (isIncluded) {
      onChange({
        ...filters,
        includedTags: filters.includedTags.filter(t => t !== tag),
        excludedTags: [...filters.excludedTags, tag]
      });
    } else {
      onChange({
        ...filters,
        excludedTags: filters.excludedTags.filter(t => t !== tag)
      });
    }
  };

  const filteredTags = ALL_TAGS.filter(t =>
    t.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const activeFiltersCount =
    (filters.selectedSource !== 'all' ? 1 : 0) +
    (filters.selectedType ? 1 : 0) +
    (filters.selectedStatus ? 1 : 0) +
    filters.includedTags.length +
    filters.excludedTags.length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#090A0C]/80 backdrop-blur-sm animate-fade-in flex justify-end">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-[#111318] border-l border-[#292A2D] shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#292A2D] flex items-center justify-between bg-[#090A0C]/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#191A1F] border border-[#292A2D] flex items-center justify-center text-[#C69A45]">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-[#F0E9DC] flex items-center gap-2">
                <span>Archive Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C69A45]/20 text-[#C69A45] font-mono font-bold">
                    {activeFiltersCount} active
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-[#AAA69D] font-sans">
                Refine by Origin, Language, Genre & Status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onReset}
              className="p-2 rounded-lg text-[#AAA69D] hover:text-[#C69A45] hover:bg-[#191A1F] transition-colors text-xs flex items-center gap-1 font-mono"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#AAA69D] hover:text-[#F0E9DC] hover:bg-[#191A1F] transition-colors"
              aria-label="Close filters"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Filter Controls */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* 1. Data Stream Source (WeebCentral vs MangaDex Safe) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-serif font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>Stream Engine</span>
              </label>
              <span className="text-[10px] text-solar-400 font-mono uppercase font-bold">
                {filters.selectedSource === 'all' ? 'Unified Matrix' : filters.selectedSource}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onChange({ ...filters, selectedSource: 'all' })}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                  filters.selectedSource === 'all'
                    ? 'bg-solar-500 text-void-950 font-bold shadow-sm'
                    : 'bg-void-950 border-void-750 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-[11px] font-mono font-bold flex items-center justify-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span>Unified</span>
                </div>
              </button>

              <button
                onClick={() => onChange({ ...filters, selectedSource: 'weebcentral' })}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                  filters.selectedSource === 'weebcentral'
                    ? 'bg-solar-500 text-void-950 font-bold shadow-sm'
                    : 'bg-void-950 border-void-750 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-[11px] font-mono font-bold flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>WeebCentral</span>
                </div>
              </button>

              <button
                onClick={() => onChange({ ...filters, selectedSource: 'mangadex' })}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                  filters.selectedSource === 'mangadex'
                    ? 'bg-telemetry-cyan text-void-950 font-bold shadow-sm'
                    : 'bg-void-950 border-void-750 text-slate-400 hover:text-telemetry-cyan'
                }`}
              >
                <div className="text-[11px] font-mono font-bold flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>MangaDex</span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Origin / Series Type */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-serif font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>Origin & Medium</span>
              </label>
              <span className="text-[10px] text-solar-400 font-mono">
                {filters.selectedType || 'All Origins'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChange({ ...filters, selectedType: null })}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  filters.selectedType === null
                    ? 'bg-solar-500/20 border-solar-500 text-solar-400 font-bold shadow-sm'
                    : 'bg-void-950/70 border-void-750 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-serif font-bold">🌐 All Origins</div>
                <div className="text-[10px] text-slate-500 font-mono">Global Archive</div>
              </button>

              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onChange({ ...filters, selectedType: filters.selectedType === t.id ? null : t.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    filters.selectedType === t.id
                      ? 'bg-solar-500 text-void-950 border-solar-500 font-bold shadow-md shadow-solar-500/20'
                      : 'bg-void-950/70 border-void-750 text-slate-300 hover:text-solar-400 hover:border-void-700'
                  }`}
                >
                  <div className="text-xs font-serif font-bold flex items-center gap-1.5">
                    <span>{t.flag}</span>
                    <span>{t.label}</span>
                  </div>
                  <div className={`text-[10px] font-mono ${filters.selectedType === t.id ? 'text-void-950/80 font-medium' : 'text-slate-500'}`}>
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Country of Origin Filter */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-serif font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-solar-400" />
                <span>Country of Origin</span>
              </label>
              <span className="text-[10px] text-solar-400 font-mono">
                {COUNTRY_OPTIONS.find(c => c.id === filters.selectedCountry)?.label || 'All Regions'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChange({ ...filters, selectedCountry: null })}
                className={`p-2 rounded-xl border text-left transition-all ${
                  !filters.selectedCountry
                    ? 'bg-solar-500/20 border-solar-500 text-solar-400 font-bold shadow-sm'
                    : 'bg-void-950/70 border-void-750 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-mono font-bold">🌍 All Countries</div>
              </button>

              {COUNTRY_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onChange({ ...filters, selectedCountry: filters.selectedCountry === c.id ? null : c.id })}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    filters.selectedCountry === c.id
                      ? 'bg-solar-500 text-void-950 border-solar-500 font-bold shadow-sm'
                      : 'bg-void-950/70 border-void-750 text-slate-300 hover:text-solar-400'
                  }`}
                >
                  <div className="text-xs font-mono font-bold flex items-center gap-1.5">
                    <span>{c.flag}</span>
                    <span>{c.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Preferred Language Edition Filter */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-serif font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-solar-400" />
                <span>Language Edition</span>
              </label>
              <span className="text-[10px] text-solar-400 font-mono">
                {LANGUAGE_OPTIONS.find(l => l.id === filters.selectedLanguage)?.label || 'All Languages'}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              <button
                onClick={() => onChange({ ...filters, selectedLanguage: null })}
                className={`py-1.5 px-2 rounded-xl border text-center transition-all ${
                  !filters.selectedLanguage
                    ? 'bg-solar-500/20 border-solar-500 text-solar-400 font-bold shadow-sm'
                    : 'bg-void-950/70 border-void-750 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-xs font-mono font-medium">All</span>
              </button>

              {LANGUAGE_OPTIONS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onChange({ ...filters, selectedLanguage: filters.selectedLanguage === l.id ? null : l.id })}
                  className={`py-1.5 px-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1 ${
                    filters.selectedLanguage === l.id
                      ? 'bg-solar-500 text-void-950 border-solar-500 font-bold shadow-sm'
                      : 'bg-void-950/70 border-void-750 text-slate-300 hover:text-solar-400'
                  }`}
                >
                  <span className="text-xs">{l.flag}</span>
                  <span className="text-xs font-mono font-medium truncate">{l.id.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Publication Status */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-serif font-bold text-slate-200 uppercase tracking-wider">
                Release Status
              </label>
              <span className="text-[10px] text-solar-400 font-mono">
                {filters.selectedStatus || 'Any Status'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st.id}
                  onClick={() => onChange({ ...filters, selectedStatus: filters.selectedStatus === st.id ? null : st.id })}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                    filters.selectedStatus === st.id
                      ? 'bg-solar-500/20 border-solar-500 text-solar-400 font-bold shadow-sm'
                      : 'bg-void-950/70 border-void-750 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-mono font-medium">{st.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Sort Sequence */}
          <div className="space-y-2.5">
            <label className="text-xs font-serif font-bold text-slate-200 uppercase tracking-wider">
              Sort Sequence
            </label>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.sort}
                onChange={(e) => onChange({ ...filters, sort: e.target.value })}
                className="w-full bg-void-950 border border-void-750 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-solar-500/60"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-void-900 text-slate-200">
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onChange({ ...filters, order: filters.order === 'Ascending' ? 'Descending' : 'Ascending' })}
                className="px-3 py-2 bg-void-950 hover:bg-void-850 border border-void-750 rounded-xl text-xs text-slate-300 font-mono flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-solar-400" />
                <span>{filters.order}</span>
              </button>
            </div>
          </div>

          {/* 5. Multi-Select Genre Tags (3-State) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-serif font-bold text-slate-200 uppercase tracking-wider block">
                  Genres & Themes (3-State)
                </label>
                <p className="text-[10px] text-slate-500 font-mono">
                  Tap once for <span className="text-emerald-400 font-bold">Include (+)</span>, twice for <span className="text-rose-400 font-bold">Exclude (-)</span>
                </p>
              </div>

              {(filters.includedTags.length > 0 || filters.excludedTags.length > 0) && (
                <button
                  onClick={() => onChange({ ...filters, includedTags: [], excludedTags: [] })}
                  className="text-[10px] font-mono text-solar-400 hover:underline"
                >
                  Clear Tags
                </button>
              )}
            </div>

            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Filter 32+ genres (Action, Romance, Isekai...)"
              className="w-full bg-void-950 border border-void-750 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-solar-500/60"
            />

            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
              {filteredTags.map((tag) => {
                const isIncluded = filters.includedTags.includes(tag);
                const isExcluded = filters.excludedTags.includes(tag);

                return (
                  <button
                    key={tag}
                    onClick={() => cycleTagState(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1 ${
                      isIncluded
                        ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-bold shadow-sm'
                        : isExcluded
                        ? 'bg-rose-950/80 border border-rose-500 text-rose-300 font-bold shadow-sm'
                        : 'bg-void-950 border border-void-750 text-slate-400 hover:text-slate-200 hover:border-void-700'
                    }`}
                  >
                    {isIncluded && <Check className="w-3 h-3 text-emerald-400" />}
                    {isExcluded && <Ban className="w-3 h-3 text-rose-400" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-void-750 bg-void-950/90 flex items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-400">
            {activeFiltersCount === 0 ? 'No active filters' : `${activeFiltersCount} active filter(s)`}
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-solar-500 to-amber-500 hover:from-amber-400 hover:to-solar-500 text-void-950 font-serif font-bold text-xs tracking-wide shadow-lg shadow-solar-500/25 hover:scale-105 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Apply Codex Filter</span>
          </button>
        </div>
      </div>
    </div>
  );
};

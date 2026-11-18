import React, { useEffect, useState } from 'react';
import {
  X,
  Filter,
  RotateCcw,
  Check,
  Ban,
  ArrowUpDown,
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

import { isAdultTag } from '../lib/contentSafety.ts';
import { lockBodyScroll } from '../lib/ui.ts';

/** Adult genres never reach the UI (policy mirrored on the server). */
export const ALL_TAGS = [
  "Action", "Adventure", "Comedy", "Doujinshi", "Drama",
  "Fantasy", "Gender Bender", "Harem", "Historical", "Horror",
  "Isekai", "Josei", "Martial Arts", "Mecha",
  "Mystery", "Psychological", "Romance", "School Life", "Sci-fi",
  "Seinen", "Shoujo", "Shounen", "Slice of Life", "Sports",
  "Supernatural", "Tragedy", "Yaoi", "Yuri"
].filter((tag) => !isAdultTag(tag));

export const TYPE_OPTIONS: TypeOption[] = [
  { id: 'Manga', label: 'Manga', desc: 'Japanese' },
  { id: 'Manhwa', label: 'Manhwa', desc: 'Korean' },
  { id: 'Manhua', label: 'Manhua', desc: 'Chinese' },
  { id: 'OEL', label: 'OEL', desc: 'English' },
];

export const COUNTRY_OPTIONS = [
  { id: 'JP', label: 'Japan', desc: 'Manga Origin' },
  { id: 'KR', label: 'South Korea', desc: 'Manhwa / Webtoon' },
  { id: 'CN', label: 'China', desc: 'Manhua Origin' },
  { id: 'GLOBAL', label: 'Global / US', desc: 'Western & Indie' },
];

export const LANGUAGE_OPTIONS = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'bn', label: 'বাংলা (Bangla)', short: 'বাংলা' },
  { id: 'banglish', label: 'Banglish (Bangla romanised)', short: 'Banglish' },
  { id: 'hi', label: 'हिन्दी (Hindi)', short: 'हिन्दी' },
  { id: 'hinglish', label: 'Hinglish (Hindi romanised)', short: 'Hinglish' },
  { id: 'ur', label: 'اردو (Urdu)', short: 'اردو' },
  { id: 'urdlish', label: 'Urdlish (Urdu romanised)', short: 'Urdlish' },
  { id: 'es', label: 'Español', short: 'ES' },
  { id: 'pt-br', label: 'Português', short: 'PT-BR' },
  { id: 'fr', label: 'Français', short: 'FR' },
  { id: 'id', label: 'Indonesia', short: 'ID' },
  { id: 'ja', label: '日本語', short: '日本語' },
  { id: 'ko', label: '한국어', short: '한국어' },
  { id: 'zh', label: '中文', short: '中文' },
];

export const STATUS_OPTIONS = [
  { id: 'Ongoing', label: 'Ongoing', desc: 'Active releases' },
  { id: 'Complete', label: 'Completed', desc: 'Concluded tales' },
  { id: 'Hiatus', label: 'Hiatus', desc: 'On pause' },
];

export const SORT_OPTIONS = [
  { id: 'Popularity', label: 'Popularity' },
  { id: 'Latest Updates', label: 'Latest updates' },
  { id: 'Alphabet', label: 'Alphabetical' },
  { id: 'Subscribers', label: 'Most subscribed' },
  { id: 'Recently Added', label: 'Recently added' },
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

  useEffect(() => {
    if (!isOpen) return;
    const cleanup = lockBodyScroll(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

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

  const choice = (active: boolean) =>
    `h-9 rounded-md border px-2 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
      active
        ? 'border-paper bg-paper font-semibold text-ink-950'
        : 'border-ink-700 text-paper-dim hover:border-ink-600 hover:text-paper'
    }`;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end overflow-hidden bg-ink-950/80 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-ink-700 bg-ink-950 shadow-2xl">
        {/* Head */}
        <div className="flex items-start justify-between gap-3 border-b border-ink-700 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-stamp" />
              <h2 className="font-display text-base font-semibold text-paper">Filters</h2>
              {activeFiltersCount > 0 && (
                <span className="tnum border border-stamp/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-stamp">
                  {activeFiltersCount} on
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-paper-dim">
              Origin · language · genre · status
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onReset}
              className="flex h-9 items-center gap-1 rounded-md px-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-paper-dim transition-colors hover:text-paper"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button onClick={onClose} className="btn-icon !h-9 !w-9" aria-label="Close filters">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Source */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="eyebrow">Source</label>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-dim">
                {filters.selectedSource === 'all' ? 'Both' : filters.selectedSource}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button onClick={() => onChange({ ...filters, selectedSource: 'all' })} className={choice(filters.selectedSource === 'all')}>
                Both
              </button>
              <button onClick={() => onChange({ ...filters, selectedSource: 'weebcentral' })} className={choice(filters.selectedSource === 'weebcentral')}>
                Weeb
              </button>
              <button onClick={() => onChange({ ...filters, selectedSource: 'mangadex' })} className={choice(filters.selectedSource === 'mangadex')}>
                Dex
              </button>
            </div>
          </section>

          {/* Format */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="eyebrow">Format</label>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-dim">
                {filters.selectedType || 'Any'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => onChange({ ...filters, selectedType: null })} className={choice(filters.selectedType === null)}>
                All formats
              </button>
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onChange({ ...filters, selectedType: filters.selectedType === t.id ? null : t.id })}
                  className={choice(filters.selectedType === t.id)}
                >
                  {t.label} · {t.desc}
                </button>
              ))}
            </div>
          </section>

          {/* Country */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="eyebrow">Country</label>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-dim">
                {COUNTRY_OPTIONS.find((c) => c.id === filters.selectedCountry)?.label || 'Any'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => onChange({ ...filters, selectedCountry: null })} className={choice(!filters.selectedCountry)}>
                All regions
              </button>
              {COUNTRY_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onChange({ ...filters, selectedCountry: filters.selectedCountry === c.id ? null : c.id })}
                  className={choice(filters.selectedCountry === c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>

          {/* Language */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="eyebrow">Language edition</label>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-dim">
                {LANGUAGE_OPTIONS.find((l) => l.id === filters.selectedLanguage)?.label || 'Any'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              <button onClick={() => onChange({ ...filters, selectedLanguage: null })} className={choice(!filters.selectedLanguage)}>
                All
              </button>
              {LANGUAGE_OPTIONS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onChange({ ...filters, selectedLanguage: filters.selectedLanguage === l.id ? null : l.id })}
                  className={choice(filters.selectedLanguage === l.id)}
                  title={l.label}
                >
                  {l.short}
                </button>
              ))}
            </div>
          </section>

          {/* Status */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="eyebrow">Status</label>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-dim">
                {filters.selectedStatus || 'Any'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st.id}
                  onClick={() => onChange({ ...filters, selectedStatus: filters.selectedStatus === st.id ? null : st.id })}
                  className={choice(filters.selectedStatus === st.id)}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </section>

          {/* Sort */}
          <section className="space-y-2">
            <label className="eyebrow">Sort</label>
            <div className="grid grid-cols-[1fr_auto] gap-1.5">
              <select
                value={filters.sort}
                onChange={(e) => onChange({ ...filters, sort: e.target.value })}
                className="h-9 w-full rounded-md border border-ink-700 bg-transparent px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-paper focus:border-paper-dim focus:outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-ink-900 text-paper">
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onChange({ ...filters, order: filters.order === 'Ascending' ? 'Descending' : 'Ascending' })}
                className="flex h-9 items-center gap-1.5 rounded-md border border-ink-700 px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-paper-dim transition-colors hover:text-paper"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {filters.order === 'Ascending' ? 'Asc' : 'Desc'}
              </button>
            </div>
          </section>

          {/* Tags */}
          <section className="space-y-2">
            <div className="flex items-end justify-between">
              <div>
                <label className="eyebrow block">Genres & themes</label>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-paper-dim/80">
                  Once to include · twice to exclude
                </p>
              </div>
              {(filters.includedTags.length > 0 || filters.excludedTags.length > 0) && (
                <button
                  onClick={() => onChange({ ...filters, includedTags: [], excludedTags: [] })}
                  className="font-mono text-[9px] uppercase tracking-[0.12em] text-stamp underline underline-offset-4"
                >
                  Clear tags
                </button>
              )}
            </div>

            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Filter genres"
              aria-label="Filter genres"
              className="h-9 w-full rounded-md border border-ink-700 bg-transparent px-2.5 text-[12px] text-paper placeholder:text-paper-dim/60 focus:border-paper-dim focus:outline-none"
            />

            <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto pr-1">
              {filteredTags.map((tag) => {
                const isIncluded = filters.includedTags.includes(tag);
                const isExcluded = filters.excludedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => cycleTagState(tag)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.04em] transition-colors ${
                      isIncluded
                        ? 'border-paper bg-paper font-semibold text-ink-950'
                        : isExcluded
                          ? 'border-stamp/70 bg-stamp/10 text-stamp'
                          : 'border-ink-700 text-paper-dim hover:border-ink-600 hover:text-paper'
                    }`}
                  >
                    {isIncluded && <Check className="h-3 w-3" />}
                    {isExcluded && <Ban className="h-3 w-3" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Foot */}
        <div className="flex items-center justify-between gap-3 border-t border-ink-700 bg-ink-950 px-4 py-3">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper-dim">
            {totalResultsCount !== undefined ? `${totalResultsCount} loaded` : 'Ready'}
          </span>
          <button onClick={onClose} className="btn btn-stamp">
            Show results
          </button>
        </div>
      </div>
    </div>
  );
};
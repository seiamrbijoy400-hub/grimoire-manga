export type MangaSource = 'all' | 'weebcentral' | 'mangadex';

export interface MangaItem {
  id: string;
  title: string;
  slug?: string;
  cover: string;
  description?: string;
  latestChapter?: string;
  status?: string;
  type?: string;
  tags?: string[];
  source?: 'weebcentral' | 'mangadex';
}

export interface MangaDetails extends MangaItem {
  author?: string;
  artist?: string;
  synopsis: string;
  chaptersCount?: number;
}

export interface ChapterItem {
  id: string;
  title: string;
  chapterNumber?: string;
  date?: string;
  pages?: number;
}

export interface ReadingHistoryItem {
  mangaId: string;
  mangaTitle: string;
  mangaCover: string;
  chapterId: string;
  chapterTitle: string;
  pageIndex: number;
  totalImages: number;
  updatedAt: number;
}

export type ReadingMode = 'vertical' | 'paged-rtl' | 'paged-ltr' | 'double-rtl' | 'double-ltr' | 'single' | 'double';
export type VisualTheme = 'void' | 'graphite' | 'parchment' | 'amethyst';
export type ImageFitMode = 'fit-width' | 'fit-height' | 'original' | 'smart-stretch';
export type AudioAmbience = 'off' | 'rain' | 'lofi' | 'void';

export interface ReaderSettings {
  readingMode: ReadingMode;
  visualTheme: VisualTheme;
  imageFit: ImageFitMode;
  autoScroll: boolean;
  autoScrollSpeed: number; // 1 - 10
  ambientGlow: boolean;
  stripGap: number; // 0, 4, 8, 16px
  maxWidth: number; // 700 to 1400px
  invertColors: boolean; // night high-contrast
  scroll3D: boolean; // 2026 Gen-Z 3D Cylinder Scroll
  audioAmbience: AudioAmbience; // Web Audio procedural ambience
  audioVolume: number; // 0 to 1
  zenMode: boolean; // distraction-free cinema mode
}

export type BookmarkCategory = 'reading' | 'plan' | 'completed' | 'favorites';

export interface BookmarkItem extends MangaItem {
  category: BookmarkCategory;
  addedAt: number;
}

export interface ChapterReadStatus {
  read: boolean;
  lastPage?: number;
  readAt?: number;
}

export interface FilterState {
  query: string;
  selectedSource: MangaSource; // 'all' | 'weebcentral' | 'mangadex'
  selectedType: string | null; // null = All, 'Manga' | 'Manhwa' | 'Manhua' | 'OEL'
  selectedStatus: string | null; // null = All, 'Ongoing' | 'Complete' | 'Hiatus'
  includedTags: string[];
  excludedTags: string[];
  sort: string;
  order: 'Ascending' | 'Descending';
}

export interface TypeOption {
  id: string;
  label: string;
  flag: string;
  desc: string;
}

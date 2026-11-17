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
  date?: string;
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

export interface ReaderSettings {
  readingMode: 'vertical' | 'single' | 'double';
  visualTheme: 'void' | 'parchment' | 'amethyst';
  autoScroll: boolean;
  autoScrollSpeed: number; // 1 - 10
  ambientGlow: boolean;
  stripGap: number; // 0, 4, 8, 16px
  maxWidth: number; // 700 to 1200px
}

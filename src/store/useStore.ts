import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ReaderSettings, ReadingHistoryItem, MangaItem } from '../types.ts';

interface AppState {
  // Navigation / View state
  currentView: 'home' | 'details' | 'reader';
  activeMangaId: string | null;
  activeChapterId: string | null;
  activeChapterTitle: string | null;
  searchOpen: boolean;

  // Bookmarks & History
  bookmarks: MangaItem[];
  history: Record<string, ReadingHistoryItem>; // mangaId -> history

  // Reader Preferences
  readerSettings: ReaderSettings;

  // Actions
  setView: (view: 'home' | 'details' | 'reader') => void;
  openManga: (mangaId: string) => void;
  openChapter: (mangaId: string, chapterId: string, chapterTitle: string) => void;
  setSearchOpen: (open: boolean) => void;

  toggleBookmark: (manga: MangaItem) => void;
  isBookmarked: (mangaId: string) => boolean;

  updateHistory: (item: Omit<ReadingHistoryItem, 'updatedAt'>) => void;
  getMangaHistory: (mangaId: string) => ReadingHistoryItem | undefined;

  updateReaderSettings: (settings: Partial<ReaderSettings>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentView: 'home',
      activeMangaId: null,
      activeChapterId: null,
      activeChapterTitle: null,
      searchOpen: false,

      bookmarks: [],
      history: {},

      readerSettings: {
        readingMode: 'vertical',
        visualTheme: 'void',
        autoScroll: false,
        autoScrollSpeed: 3,
        ambientGlow: true,
        stripGap: 0,
        maxWidth: 820,
      },

      setView: (view) => set({ currentView: view }),

      openManga: (mangaId) => set({
        currentView: 'details',
        activeMangaId: mangaId
      }),

      openChapter: (mangaId, chapterId, chapterTitle) => set({
        currentView: 'reader',
        activeMangaId: mangaId,
        activeChapterId: chapterId,
        activeChapterTitle: chapterTitle
      }),

      setSearchOpen: (open) => set({ searchOpen: open }),

      toggleBookmark: (manga) => {
        const { bookmarks } = get();
        const exists = bookmarks.some((b) => b.id === manga.id);
        if (exists) {
          set({ bookmarks: bookmarks.filter((b) => b.id !== manga.id) });
        } else {
          set({ bookmarks: [manga, ...bookmarks] });
        }
      },

      isBookmarked: (mangaId) => {
        return get().bookmarks.some((b) => b.id === mangaId);
      },

      updateHistory: (item) => {
        set((state) => ({
          history: {
            ...state.history,
            [item.mangaId]: {
              ...item,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      getMangaHistory: (mangaId) => {
        return get().history[mangaId];
      },

      updateReaderSettings: (newSettings) => {
        set((state) => ({
          readerSettings: {
            ...state.readerSettings,
            ...newSettings,
          },
        }));
      },
    }),
    {
      name: 'grimoire-manga-storage',
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        history: state.history,
        readerSettings: state.readerSettings,
      }),
    }
  )
);

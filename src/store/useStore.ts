import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ReaderSettings,
  ReadingHistoryItem,
  MangaItem,
  BookmarkItem,
  BookmarkCategory,
  ChapterReadStatus
} from '../types.ts';
import { ambienceSynthesizer } from '../services/audioAmbience.ts';

interface AppState {
  // Navigation / View state
  currentView: 'home' | 'details' | 'reader';
  activeTab: 'catalog' | 'bookmarks' | 'history';
  activeMangaId: string | null;
  activeMangaTitle: string | null;
  activeMangaCover: string | null;
  activeChapterId: string | null;
  activeChapterTitle: string | null;
  searchOpen: boolean;

  // Bookmarks & Shelves
  bookmarks: BookmarkItem[];
  history: Record<string, ReadingHistoryItem>; // mangaId -> history
  readStatus: Record<string, ChapterReadStatus>; // chapterId -> ChapterReadStatus

  // Reader Preferences
  readerSettings: ReaderSettings;

  // Actions
  setView: (view: 'home' | 'details' | 'reader') => void;
  setActiveTab: (tab: 'catalog' | 'bookmarks' | 'history') => void;
  openManga: (mangaId: string, mangaTitle?: string, mangaCover?: string) => void;
  openChapter: (mangaId: string, chapterId: string, chapterTitle: string, mangaTitle?: string, mangaCover?: string) => void;
  setActiveMangaMeta: (title: string, cover?: string) => void;
  setSearchOpen: (open: boolean) => void;

  toggleBookmark: (manga: MangaItem, category?: BookmarkCategory) => void;
  setBookmarkCategory: (mangaId: string, category: BookmarkCategory) => void;
  isBookmarked: (mangaId: string) => boolean;
  getBookmark: (mangaId: string) => BookmarkItem | undefined;

  updateHistory: (item: Omit<ReadingHistoryItem, 'updatedAt'>) => void;
  getMangaHistory: (mangaId: string) => ReadingHistoryItem | undefined;
  clearHistory: () => void;

  markChapterRead: (chapterId: string, read?: boolean, lastPage?: number) => void;
  markMangaAllRead: (mangaId: string, chapterIds: string[]) => void;
  isChapterRead: (chapterId: string) => boolean;

  updateReaderSettings: (settings: Partial<ReaderSettings>) => void;

  exportUserData: () => string;
  importUserData: (jsonString: string) => boolean;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentView: 'home',
      activeTab: 'catalog',
      activeMangaId: null,
      activeMangaTitle: null,
      activeMangaCover: null,
      activeChapterId: null,
      activeChapterTitle: null,
      searchOpen: false,

      bookmarks: [],
      history: {},
      readStatus: {},

      readerSettings: {
        readingMode: 'vertical',
        visualTheme: 'void',
        imageFit: 'fit-width',
        autoScroll: false,
        autoScrollSpeed: 3,
        ambientGlow: true,
        stripGap: 0,
        maxWidth: 860,
        invertColors: false,
        scroll3D: false,
        audioAmbience: 'off',
        audioVolume: 0.35,
        zenMode: false,
      },

      setView: (view) => set({ currentView: view }),

      setActiveTab: (tab) => set({ activeTab: tab, currentView: 'home' }),

      openManga: (mangaId, mangaTitle, mangaCover) => set((state) => ({
        currentView: 'details',
        activeMangaId: mangaId,
        activeMangaTitle: mangaTitle || state.bookmarks.find((b) => b.id === mangaId)?.title || state.history[mangaId]?.mangaTitle || state.activeMangaTitle,
        activeMangaCover: mangaCover || state.bookmarks.find((b) => b.id === mangaId)?.coverImage || state.history[mangaId]?.mangaCover || state.activeMangaCover,
      })),

      openChapter: (mangaId, chapterId, chapterTitle, mangaTitle, mangaCover) => set((state) => ({
        currentView: 'reader',
        activeMangaId: mangaId,
        activeMangaTitle: mangaTitle || state.activeMangaTitle || state.bookmarks.find((b) => b.id === mangaId)?.title || state.history[mangaId]?.mangaTitle,
        activeMangaCover: mangaCover || state.activeMangaCover || state.bookmarks.find((b) => b.id === mangaId)?.coverImage || state.history[mangaId]?.mangaCover,
        activeChapterId: chapterId,
        activeChapterTitle: chapterTitle
      })),

      setActiveMangaMeta: (title, cover) => set((state) => ({
        activeMangaTitle: title || state.activeMangaTitle,
        activeMangaCover: cover || state.activeMangaCover,
      })),

      setSearchOpen: (open) => set({ searchOpen: open }),

      toggleBookmark: (manga, category = 'reading') => {
        const { bookmarks } = get();
        const exists = bookmarks.some((b) => b.id === manga.id);
        if (exists) {
          set({ bookmarks: bookmarks.filter((b) => b.id !== manga.id) });
        } else {
          const newBookmark: BookmarkItem = {
            ...manga,
            category,
            addedAt: Date.now(),
          };
          set({ bookmarks: [newBookmark, ...bookmarks] });
        }
      },

      setBookmarkCategory: (mangaId, category) => {
        set((state) => ({
          bookmarks: state.bookmarks.map((b) =>
            b.id === mangaId ? { ...b, category } : b
          ),
        }));
      },

      isBookmarked: (mangaId) => {
        return get().bookmarks.some((b) => b.id === mangaId);
      },

      getBookmark: (mangaId) => {
        return get().bookmarks.find((b) => b.id === mangaId);
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
          readStatus: {
            ...state.readStatus,
            [item.chapterId]: {
              read: true,
              lastPage: item.pageIndex,
              readAt: Date.now(),
            },
          },
        }));
      },

      getMangaHistory: (mangaId) => {
        return get().history[mangaId];
      },

      clearHistory: () => {
        set({ history: {} });
      },

      markChapterRead: (chapterId, read = true, lastPage = 1) => {
        set((state) => ({
          readStatus: {
            ...state.readStatus,
            [chapterId]: {
              read,
              lastPage,
              readAt: Date.now(),
            },
          },
        }));
      },

      markMangaAllRead: (mangaId, chapterIds) => {
        set((state) => {
          const updated = { ...state.readStatus };
          const now = Date.now();
          chapterIds.forEach((id) => {
            updated[id] = { read: true, lastPage: 1, readAt: now };
          });
          return { readStatus: updated };
        });
      },

      isChapterRead: (chapterId) => {
        return !!get().readStatus[chapterId]?.read;
      },

      updateReaderSettings: (newSettings) => {
        if (newSettings.audioAmbience !== undefined) {
          ambienceSynthesizer.setMode(newSettings.audioAmbience);
        }
        if (newSettings.audioVolume !== undefined) {
          ambienceSynthesizer.setVolume(newSettings.audioVolume);
        }
        set((state) => ({
          readerSettings: {
            ...state.readerSettings,
            ...newSettings,
          },
        }));
      },

      exportUserData: () => {
        const state = get();
        const exportObj = {
          version: '2026.2',
          exportedAt: new Date().toISOString(),
          bookmarks: state.bookmarks,
          history: state.history,
          readStatus: state.readStatus,
          readerSettings: state.readerSettings,
        };
        return JSON.stringify(exportObj, null, 2);
      },

      importUserData: (jsonString) => {
        try {
          const parsed = JSON.parse(jsonString);
          if (parsed && typeof parsed === 'object') {
            set((state) => ({
              bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : state.bookmarks,
              history: parsed.history && typeof parsed.history === 'object' ? parsed.history : state.history,
              readStatus: parsed.readStatus && typeof parsed.readStatus === 'object' ? parsed.readStatus : state.readStatus,
              readerSettings: parsed.readerSettings && typeof parsed.readerSettings === 'object'
                ? { ...state.readerSettings, ...parsed.readerSettings }
                : state.readerSettings,
            }));
            return true;
          }
          return false;
        } catch (e) {
          console.error('Failed to parse import data:', e);
          return false;
        }
      },
    }),
    {
      name: 'grimoire-manga-storage',
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        history: state.history,
        readStatus: state.readStatus,
        readerSettings: state.readerSettings,
      }),
    }
  )
);

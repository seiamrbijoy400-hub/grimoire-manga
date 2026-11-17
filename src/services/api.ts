import { MangaItem, MangaDetails, ChapterItem } from '../types.ts';

const API_BASE = '/api';

export async function fetchTrending(offset: number = 0): Promise<MangaItem[]> {
  try {
    const res = await fetch(`${API_BASE}/trending?offset=${offset}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch trending:', err);
    return [];
  }
}

export async function fetchLatest(offset: number = 0): Promise<MangaItem[]> {
  try {
    const res = await fetch(`${API_BASE}/latest?offset=${offset}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch latest:', err);
    return [];
  }
}

export async function searchMangaApi(query: string, quick: boolean = false, offset: number = 0): Promise<MangaItem[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      quick: quick ? 'true' : 'false',
      offset: String(offset)
    });
    const res = await fetch(`${API_BASE}/search?${params.toString()}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to search manga:', err);
    return [];
  }
}

export async function fetchMangaDetails(mangaId: string): Promise<MangaDetails | null> {
  try {
    const res = await fetch(`${API_BASE}/manga/${mangaId}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error(`Failed to fetch manga ${mangaId}:`, err);
    return null;
  }
}

export async function fetchChapterList(mangaId: string): Promise<ChapterItem[]> {
  try {
    const res = await fetch(`${API_BASE}/manga/${mangaId}/chapters`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error(`Failed to fetch chapters for ${mangaId}:`, err);
    return [];
  }
}

export async function fetchChapterImages(chapterId: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/chapter/${chapterId}`);
    const json = await res.json();
    return json.data?.images || [];
  } catch (err) {
    console.error(`Failed to fetch images for chapter ${chapterId}:`, err);
    return [];
  }
}

export function getProxyImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('/')) return rawUrl;
  return `${API_BASE}/proxy/image?url=${encodeURIComponent(rawUrl)}`;
}

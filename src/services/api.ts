import { MangaItem, MangaDetails, ChapterItem, FilterState, MangaSource } from '../types.ts';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export async function fetchTrending(offset: number = 0, type?: string, source: MangaSource = 'all'): Promise<MangaItem[]> {
  try {
    const params = new URLSearchParams({
      offset: String(offset),
      source,
    });
    if (type) params.append('type', type);
    const res = await fetch(`${API_BASE}/trending?${params.toString()}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch trending:', err);
    return [];
  }
}

export async function fetchLatest(offset: number = 0, type?: string, source: MangaSource = 'all'): Promise<MangaItem[]> {
  try {
    const params = new URLSearchParams({
      offset: String(offset),
      source,
    });
    if (type) params.append('type', type);
    const res = await fetch(`${API_BASE}/latest?${params.toString()}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch latest:', err);
    return [];
  }
}

export async function searchMangaApi(query: string, quick: boolean = false, offset: number = 0, source: MangaSource = 'all'): Promise<MangaItem[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      quick: quick ? 'true' : 'false',
      offset: String(offset),
      source,
    });
    const res = await fetch(`${API_BASE}/search?${params.toString()}`);
    if (!res.ok) {
      console.error('Search failed with status', res.status);
      return [];
    }
    const json = await res.json();
    if (!json || !Array.isArray(json.data)) {
      console.error('Unexpected search response:', json);
      return [];
    }
    return json.data;
  } catch (err) {
    console.error('Failed to search manga:', err);
    return [];
  }
}

export async function fetchAdvancedSearch(filter: Partial<FilterState>, offset: number = 0): Promise<MangaItem[]> {
  try {
    const params = new URLSearchParams();

    if (filter.query) params.append('q', filter.query);
    if (filter.sort) params.append('sort', filter.sort);
    if (filter.order) params.append('order', filter.order);
    if (filter.selectedSource) params.append('source', filter.selectedSource);
    params.append('offset', String(offset));

    if (filter.selectedType) {
      params.append('type', filter.selectedType);
    }
    if (filter.selectedCountry) {
      params.append('country', filter.selectedCountry);
    }
    if (filter.selectedLanguage) {
      params.append('lang', filter.selectedLanguage);
    }
    if (filter.selectedStatus) {
      params.append('status', filter.selectedStatus);
    }

    if (filter.includedTags && filter.includedTags.length > 0) {
      filter.includedTags.forEach(t => params.append('tag', t));
    }
    if (filter.excludedTags && filter.excludedTags.length > 0) {
      filter.excludedTags.forEach(t => params.append('excluded_tag', t));
    }

    const res = await fetch(`${API_BASE}/search?${params.toString()}`);

    // The API reports filter problems as `error` on a 200 body (for example a
    // tag MangaDex does not have). Both must surface, otherwise a failed genre
    // looks exactly like a genre with no titles.
    let json: { data?: MangaItem[]; error?: string } | null = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (!res.ok) {
      throw new Error(json?.error || `Search failed (${res.status})`);
    }
    if (json?.error) {
      throw new Error(json.error);
    }
    if (!json || !Array.isArray(json.data)) {
      throw new Error('Unexpected search response');
    }
    return json.data;
  } catch (err) {
    console.error('Failed advanced search:', err);
    throw err instanceof Error ? err : new Error('Search failed. Please try again.');
  }
}

export async function fetchMangaDetails(mangaId: string): Promise<MangaDetails | null> {
  try {
    const res = await fetch(`${API_BASE}/manga/${encodeURIComponent(mangaId)}`);
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
    const res = await fetch(`${API_BASE}/manga/${encodeURIComponent(mangaId)}/chapters`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error(`Failed to fetch chapters for ${mangaId}:`, err);
    return [];
  }
}

export async function fetchChapterImages(chapterId: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/chapter/${encodeURIComponent(chapterId)}`);
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

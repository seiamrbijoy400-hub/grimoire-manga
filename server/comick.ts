import { filterSafe } from './safety.ts';

const COMICK_RELAY = 'https://comick-live.translate.goog';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Global in-memory cursor cache across pages
const cursorCache = new Map<string, string>();

export interface ComicKItem {
  id: string; // Formatted with 'ck:' prefix
  rawId: string; // slug
  title: string;
  cover: string;
  description?: string;
  latestChapter?: string;
  status?: string;
  type?: string;
  tags?: string[];
  country?: string;
  source: 'comick';
}

export interface ComicKDetails extends ComicKItem {
  author?: string;
  artist?: string;
  synopsis: string;
  chaptersCount?: number;
}

export interface ComicKChapter {
  id: string; // Formatted with 'ck:' prefix: 'ck:<slug>:<hid>:<chap>:<lang>'
  rawId: string;
  title: string;
  chapterNumber?: string;
  date?: string;
  language?: string;
}

function resolveCoverUrl(item: any): string {
  if (item.default_thumbnail) return item.default_thumbnail;
  if (item.cover_url) return item.cover_url;
  if (item.md_covers && item.md_covers.length > 0) {
    const b2key = item.md_covers[0].b2key;
    if (b2key) return `https://meo.comick.pictures/${b2key}`;
  }
  return '';
}

function resolveType(country?: string): string {
  if (!country) return 'Manga';
  const c = country.toLowerCase();
  if (c === 'kr' || c === 'ko') return 'Manhwa';
  if (c === 'zh' || c === 'zh-hk' || c === 'cn') return 'Manhua';
  if (c === 'jp' || c === 'ja') return 'Manga';
  return 'Manga';
}

export async function searchComicK(query: string = '', type?: string, page: number = 1): Promise<ComicKItem[]> {
  try {
    const params = new URLSearchParams({
      _x_tr_sl: 'auto',
      _x_tr_tl: 'en',
      _x_tr_hl: 'en',
    });

    const cacheKey = `${query.trim()}:${page - 1}`;
    const previousCursor = page > 1 ? cursorCache.get(cacheKey) : undefined;

    if (query.trim()) {
      params.append('q', query.trim());
      if (previousCursor) {
        params.append('cursor', previousCursor);
      } else if (page > 1) {
        params.append('page', String(page));
      }
    } else {
      params.append('order_by', 'user_follow_count');
      params.append('order_direction', 'desc');
      if (previousCursor) {
        params.append('cursor', previousCursor);
      } else {
        params.append('page', String(page));
      }
    }

    const url = `${COMICK_RELAY}/api/search?${params.toString()}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return [];
    const json = await res.json();

    if (json.next_cursor) {
      cursorCache.set(`${query.trim()}:${page}`, json.next_cursor);
    }

    const items = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    const results: ComicKItem[] = [];

    for (const item of items) {
      const slug = item.slug || item.hid;
      if (!slug) continue;

      const detectedType = resolveType(item.country);
      if (type && type !== 'Manga' && !detectedType.toLowerCase().includes(type.toLowerCase())) {
        continue;
      }

      results.push({
        id: `ck:${slug}`,
        rawId: slug,
        title: item.title || item.name || slug,
        cover: resolveCoverUrl(item),
        description: item.description || item.parsed_description || item.desc || '',
        status: item.status === 2 ? 'Completed' : 'Ongoing',
        type: detectedType,
        country: item.country ? item.country.toUpperCase() : undefined,
        tags: Array.isArray(item.titles) ? item.titles : [],
        source: 'comick',
      });
    }

    return filterSafe(results);
  } catch (err) {
    console.error('searchComicK error:', err);
    return [];
  }
}

export async function getComicKDetails(slug: string): Promise<ComicKDetails | null> {
  try {
    const cleanSlug = slug.replace(/^ck:/, '');
    const url = `${COMICK_RELAY}/comic/${cleanSlug}?_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/id="comic-data"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return null;

    const data = JSON.parse(match[1]);

    const authors = Array.isArray(data.authors)
      ? data.authors.map((a: any) => a.name || a).join(', ')
      : undefined;
    const artists = Array.isArray(data.artists)
      ? data.artists.map((a: any) => a.name || a).join(', ')
      : undefined;

    const tags: string[] = [];
    if (Array.isArray(data.md_comic_md_genres)) {
      data.md_comic_md_genres.forEach((g: any) => {
        const name = g.md_genres?.name || g.name;
        if (name && !tags.includes(name)) tags.push(name);
      });
    }

    return {
      id: `ck:${cleanSlug}`,
      rawId: cleanSlug,
      title: data.title || cleanSlug,
      cover: resolveCoverUrl(data),
      synopsis: data.desc || data.parsed || '',
      author: authors,
      artist: artists,
      type: resolveType(data.country),
      status: data.status === 2 ? 'Completed' : 'Ongoing',
      country: data.country ? data.country.toUpperCase() : undefined,
      chaptersCount: data.chapter_count || undefined,
      tags,
      source: 'comick',
    };
  } catch (err) {
    console.error('getComicKDetails error:', err);
    return null;
  }
}

export async function getComicKChapters(slug: string, lang = 'en'): Promise<ComicKChapter[]> {
  try {
    const cleanSlug = slug.replace(/^ck:/, '');
    const url = `${COMICK_RELAY}/api/comics/${cleanSlug}/chapter-list?lang=${lang}&_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return [];
    const json = await res.json();
    const items = Array.isArray(json?.data) ? json.data : [];
    const chapters: ComicKChapter[] = [];

    for (const item of items) {
      if (!item.hid) continue;
      const chapterCode = `${cleanSlug}:${item.hid}:${item.chap || '0'}:${item.lang || lang}`;
      const title = item.title
        ? `Ch. ${item.chap}: ${item.title}`
        : `Chapter ${item.chap}`;

      chapters.push({
        id: `ck:${chapterCode}`,
        rawId: chapterCode,
        title,
        chapterNumber: item.chap ? String(item.chap) : undefined,
        date: item.created_at || undefined,
        language: item.lang || lang,
      });
    }

    return chapters;
  } catch (err) {
    console.error('getComicKChapters error:', err);
    return [];
  }
}

export async function getComicKChapterImages(chapterCode: string): Promise<string[]> {
  try {
    const clean = chapterCode.replace(/^ck:/, '');
    const parts = clean.split(':');
    const slug = parts[0];
    const hid = parts[1];
    const chap = parts[2] || '0';
    const lang = parts[3] || 'en';

    // Page URL: /comic/<slug>/<hid>-chapter-<chap>-<lang>
    const url = `${COMICK_RELAY}/comic/${slug}/${hid}-chapter-${chap}-${lang}?_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(18_000),
    });

    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/id="sv-data"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return [];

    const json = JSON.parse(match[1]);
    const images: any[] = json.chapter?.images || [];

    return images
      .map((img: any) => img.url)
      .filter((u: string) => typeof u === 'string' && u.length > 0);
  } catch (err) {
    console.error('getComicKChapterImages error:', err);
    return [];
  }
}

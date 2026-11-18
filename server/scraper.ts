import * as cheerio from 'cheerio';

const WEEB_BASE = 'https://weebcentral.com';

// Realistic 2026 Chrome/Edge Browser Headers to maximize bypass
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

// Optional upstream proxy support (e.g. Cloudflare Worker or residential proxy)
const UPSTREAM_PROXY_URL = process.env.UPSTREAM_PROXY_URL || '';

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

export interface AdvancedSearchFilter {
  query?: string;
  sort?: string;
  order?: 'Ascending' | 'Descending';
  types?: string[]; // Manga, Manhwa, Manhua, OEL
  status?: string[]; // Ongoing, Complete, Hiatus, Canceled
  includedTags?: string[];
  excludedTags?: string[];
  official?: 'Any' | 'True' | 'False';
  anime?: 'Any' | 'True' | 'False';
  adult?: 'Any' | 'True' | 'False';
  offset?: number;
  limit?: number;
}

export const ALL_AVAILABLE_TAGS = [
  "Action", "Adult", "Adventure", "Comedy", "Doujinshi", "Drama", "Ecchi",
  "Fantasy", "Gender Bender", "Harem", "Hentai", "Historical", "Horror",
  "Isekai", "Josei", "Lolicon", "Martial Arts", "Mature", "Mecha",
  "Mystery", "Psychological", "Romance", "School Life", "Sci-fi",
  "Seinen", "Shotacon", "Shoujo", "Shoujo Ai", "Shounen", "Shounen Ai",
  "Slice of Life", "Smut", "Sports", "Supernatural", "Tragedy", "Yaoi",
  "Yuri", "Other"
] as const;

export const ALL_AVAILABLE_TYPES = [
  { id: 'Manga', label: 'Manga', flag: '🇯🇵', desc: 'Japanese Comics' },
  { id: 'Manhwa', label: 'Manhwa', flag: '🇰🇷', desc: 'Korean Webtoons' },
  { id: 'Manhua', label: 'Manhua', flag: '🇨🇳', desc: 'Chinese Comics' },
  { id: 'OEL', label: 'OEL', flag: '🌐', desc: 'Original English' },
] as const;

export const ALL_AVAILABLE_STATUSES = [
  "Ongoing", "Complete", "Hiatus", "Canceled"
] as const;

async function doFetch(targetUrl: string, initHeaders?: Record<string, string>): Promise<Response> {
  const urlToFetch = UPSTREAM_PROXY_URL
    ? `${UPSTREAM_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`
    : targetUrl;

  return fetch(urlToFetch, {
    headers: {
      ...BROWSER_HEADERS,
      ...initHeaders,
    },
  });
}

export async function searchMangaAdvanced(filter: AdvancedSearchFilter): Promise<MangaItem[]> {
  try {
    const params = new URLSearchParams();

    params.append('text', filter.query || '');
    params.append('sort', filter.sort || 'Popularity');
    params.append('order', filter.order || 'Descending');
    params.append('display_mode', 'Full Display');
    params.append('limit', String(filter.limit || 32));
    params.append('offset', String(filter.offset || 0));
    params.append('official', filter.official || 'Any');
    params.append('anime', filter.anime || 'Any');
    params.append('adult', filter.adult || 'Any');

    // Types
    if (filter.types && filter.types.length > 0) {
      filter.types.forEach(t => params.append('included_type', t));
    }

    // Statuses
    if (filter.status && filter.status.length > 0) {
      filter.status.forEach(s => params.append('included_status', s));
    }

    // Included & Excluded Tags
    if (filter.includedTags && filter.includedTags.length > 0) {
      filter.includedTags.forEach(t => params.append('included_tag', t));
    }
    if (filter.excludedTags && filter.excludedTags.length > 0) {
      filter.excludedTags.forEach(t => params.append('excluded_tag', t));
    }

    const res = await doFetch(`${WEEB_BASE}/search/data?${params.toString()}`, {
      'HX-Request': 'true'
    });

    if (!res.ok) {
      console.error(`Search error status: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: MangaItem[] = [];

    $('article.bg-base-300').each((_, el) => {
      const card = $(el);
      const link = card.find('a[href*="/series/"]').first();
      const href = link.attr('href') || '';
      
      const match = href.match(/\/series\/([^/]+)(?:\/([^/]+))?/);
      if (!match) return;

      const id = match[1];
      const slug = match[2] || '';

      const coverWebp = card.find('picture source[type="image/webp"]').first().attr('srcset');
      const coverImg = card.find('picture img').first().attr('src');
      const cover = coverWebp || coverImg || '';

      // The second series anchor has the clean title; fallback to slug
      const titleEl = card.find('a[href*="/series/"]').eq(1);
      const rawTitle = titleEl.text().trim();
      const title = rawTitle && !rawTitle.startsWith('Official') ? rawTitle : slug.replace(/-/g, ' ');
      
      // Description / snippet
      const description = card.find('div.line-clamp-3, p, span.opacity-70').first().text().trim();

      // Extract clean metadata from WeebCentral card
      const statusFromCard = card.find('strong:contains("Status:")').parent().find('span').first().text().trim();
      const status = statusFromCard || 'Ongoing';

      const typeFromCard = card.find('strong:contains("Type:")').parent().find('span').first().text().trim();
      let type = typeFromCard || 'Manga';

      const tags: string[] = card.find('strong:contains("Tag(s):")').parent().find('span')
        .map((_, s) => $(s).text().replace(/,/g, '').trim())
        .get()
        .filter(Boolean);

      if (!typeFromCard) {
        if (tags.includes('Manhwa')) type = 'Manhwa';
        else if (tags.includes('Manhua')) type = 'Manhua';
      }

      results.push({
        id,
        title,
        slug,
        cover,
        description,
        type,
        status,
        tags
      });
    });

    // Fallback to quick search if advanced search returned 0 items and query exists and no complex filters
    if (results.length === 0 && filter.query?.trim() && !filter.offset && (!filter.types || filter.types.length === 0)) {
      return await quickSearch(filter.query);
    }

    return results;
  } catch (err) {
    console.error('Search error:', err);
    return [];
  }
}

export async function quickSearch(query: string): Promise<MangaItem[]> {
  try {
    const body = new URLSearchParams();
    body.append('text', query);

    const res = await doFetch(`${WEEB_BASE}/search/simple?location=main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'HX-Request': 'true'
      },
      body: body.toString()
    });

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: MangaItem[] = [];

    $('a[href*="/series/"]').each((_, el) => {
      const a = $(el);
      const href = a.attr('href') || '';
      const match = href.match(/\/series\/([^/]+)(?:\/([^/]+))?/);
      if (!match) return;

      const id = match[1];
      const slug = match[2] || '';
      const cover = a.find('picture source').first().attr('srcset') || a.find('img').first().attr('src') || '';
      const title = a.find('div.flex-1').text().trim() || slug.replace(/-/g, ' ');

      results.push({
        id,
        title,
        slug,
        cover,
        type: 'Manga',
        status: 'Ongoing',
        tags: []
      });
    });

    return results;
  } catch (err) {
    console.error('Quick search error:', err);
    return [];
  }
}

export async function getMangaDetails(id: string): Promise<MangaDetails | null> {
  try {
    const res = await doFetch(`${WEEB_BASE}/series/${id}`);

    if (!res.ok) {
      console.error(`Manga details error status: ${res.status}`);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Title
    const title = $('h1').first().text().trim() || $('title').text().replace(/ - Weeb Central/i, '').trim();

    // Cover
    const coverSource = $('picture source[type="image/webp"]').first().attr('srcset');
    const coverImg = $('picture img').first().attr('src');
    const cover = coverSource || coverImg || '';

    // Synopsis / Description
    const synopsis = $('p.leading-relaxed, [x-data*="showMore"] p, div.whitespace-pre-line').first().text().trim() ||
      $('meta[name="description"]').attr('content') || '';

    // Tags & Badges
    const tags: string[] = [];
    $('a[href*="/search?tag="], a[href*="/search?genre="], .badge').each((_, el) => {
      const t = $(el).text().trim();
      if (t && !tags.includes(t)) tags.push(t);
    });

    // Author & Artist
    let author = '';
    let artist = '';
    $('section, div').each((_, el) => {
      const text = $(el).text();
      if (text.includes('Author:') && !author) {
        author = $(el).find('a, span').last().text().trim();
      }
      if (text.includes('Artist:') && !artist) {
        artist = $(el).find('a, span').last().text().trim();
      }
    });

    // Status & Type
    let status = 'Ongoing';
    let type = 'Manga';
    if (html.includes('Complete') || html.includes('Completed')) status = 'Completed';
    if (html.includes('Manhwa') || tags.includes('Manhwa')) type = 'Manhwa';
    else if (html.includes('Manhua') || tags.includes('Manhua')) type = 'Manhua';

    return {
      id,
      title,
      cover,
      synopsis,
      author,
      artist,
      status,
      type,
      tags
    };
  } catch (err) {
    console.error(`Error fetching manga ${id}:`, err);
    return null;
  }
}

export async function getChapterList(seriesId: string): Promise<ChapterItem[]> {
  try {
    const res = await doFetch(`${WEEB_BASE}/series/${seriesId}/full-chapter-list`, {
      'HX-Request': 'true'
    });

    if (!res.ok) {
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const chapters: ChapterItem[] = [];

    $('a[href*="/chapters/"]').each((_, el) => {
      const a = $(el);
      const href = a.attr('href') || '';
      const match = href.match(/\/chapters\/([^/]+)/);
      if (!match) return;

      const id = match[1];
      const title = a.find('span.grow span').first().text().trim() || a.text().trim();
      const date = a.find('time').attr('datetime') || a.find('time').text().trim();

      chapters.push({
        id,
        title,
        date
      });
    });

    return chapters;
  } catch (err) {
    console.error(`Error fetching chapters for ${seriesId}:`, err);
    return [];
  }
}

export async function getChapterImages(chapterId: string): Promise<string[]> {
  try {
    const res = await doFetch(`${WEEB_BASE}/chapters/${chapterId}/images?reading_style=long_strip`, {
      'HX-Request': 'true'
    });

    if (!res.ok) {
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const images: string[] = [];

    $('section#chapter-images img').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.includes('broken_image') && !src.includes('chapter-badge')) {
        images.push(src);
      }
    });

    return images;
  } catch (err) {
    console.error(`Error fetching images for chapter ${chapterId}:`, err);
    return [];
  }
}

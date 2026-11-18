import * as cheerio from 'cheerio';
import {
  fetchWeebHtml,
  UpstreamError,
  weebPath,
  pickImageUrl,
  WEEB_ORIGIN,
} from './upstream.ts';

const WEEB_BASE = WEEB_ORIGIN;

const SEARCH_TTL = 3 * 60_000;
const DETAILS_TTL = 30 * 60_000;
const CHAPTERS_TTL = 30 * 60_000;
const IMAGES_TTL = 15 * 60_000;

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

async function doFetch(
  targetUrl: string,
  init: { method?: string; body?: BodyInit | null; headers?: Record<string, string> } = {},
  ttl = SEARCH_TTL,
  expect?: RegExp,
): Promise<string> {
  return fetchWeebHtml(targetUrl, {
    method: init.method,
    body: init.body,
    headers: init.headers,
    ttl,
    expect,
  });
}

function parseSeriesHref(href: string): { id: string; slug: string } | null {
  const path = weebPath(href);
  const match = path.match(/\/series\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return null;
  return { id: match[1], slug: match[2] || '' };
}

export async function searchMangaAdvanced(filter: AdvancedSearchFilter): Promise<MangaItem[]> {
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

  const html = await doFetch(`${WEEB_BASE}/search/data?${params.toString()}`, {
    headers: { 'HX-Request': 'true' },
  }, SEARCH_TTL);

  const $ = cheerio.load(html);
  const results: MangaItem[] = [];

  $('article.bg-base-300').each((_, el) => {
    const card = $(el);
    const link = card.find('a[href*="/series/"]').first();
    const parsed = parseSeriesHref(link.attr('href') || '');
    if (!parsed) return;

    const { id, slug } = parsed;

    const cover = pickImageUrl(
      card.find('picture source[type="image/webp"]').first().attr('srcset') ||
      card.find('picture img').first().attr('src') ||
      card.find('img').first().attr('src'),
    );

    // The second series anchor has the clean title; fallback to slug
    const titleEl = card.find('a[href*="/series/"]').eq(1);
    const rawTitle = titleEl.text().trim();
    const title = rawTitle && !rawTitle.startsWith('Official')
      ? rawTitle
      : slug.replace(/-/g, ' ');

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
}

export async function quickSearch(query: string): Promise<MangaItem[]> {
  try {
    const body = new URLSearchParams();
    body.append('text', query);

    const html = await doFetch(`${WEEB_BASE}/search/simple?location=main`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'HX-Request': 'true'
      },
      body: body.toString()
    }, SEARCH_TTL);

    const $ = cheerio.load(html);
    const results: MangaItem[] = [];

    $('a[href*="/series/"]').each((_, el) => {
      const a = $(el);
      const parsed = parseSeriesHref(a.attr('href') || '');
      if (!parsed) return;

      const { id, slug } = parsed;
      const cover = pickImageUrl(
        a.find('picture source').first().attr('srcset') || a.find('img').first().attr('src'),
      );
      const title = a.find('div.flex-1').text().trim() || slug.replace(/-/g, ' ');

      if (results.some((r) => r.id === id)) return;

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

function isNotFound(err: unknown): boolean {
  return (
    err instanceof UpstreamError &&
    err.attempts.some((a) => a.reason.startsWith('HTTP 404'))
  );
}

export async function getMangaDetails(id: string): Promise<MangaDetails | null> {
  let html: string;
  try {
    html = await doFetch(`${WEEB_BASE}/series/${id}`, {}, DETAILS_TTL);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }

  const $ = cheerio.load(html);

  // Title
  const title = $('h1').first().text().trim() || $('title').text().replace(/ - Weeb Central/i, '').trim();

  // Cover
  const cover = pickImageUrl(
    $('picture source[type="image/webp"]').first().attr('srcset') ||
    $('picture img').first().attr('src'),
  );

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
}

export async function getChapterList(seriesId: string): Promise<ChapterItem[]> {
  let html: string;
  try {
    html = await doFetch(`${WEEB_BASE}/series/${seriesId}/full-chapter-list`, {
      headers: { 'HX-Request': 'true' },
    }, CHAPTERS_TTL);
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }

  const $ = cheerio.load(html);
  const chapters: ChapterItem[] = [];

  $('a[href*="/chapters/"]').each((_, el) => {
    const a = $(el);
    const path = weebPath(a.attr('href') || '');
    const match = path.match(/\/chapters\/([^/]+)/);
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
}

export async function getChapterImages(chapterId: string): Promise<string[]> {
  let html: string;
  try {
    html = await doFetch(
      `${WEEB_BASE}/chapters/${chapterId}/images?reading_style=long_strip`,
      { headers: { 'HX-Request': 'true' } },
      IMAGES_TTL,
    );
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }

  const $ = cheerio.load(html);
  const images: string[] = [];

  $('section#chapter-images img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !src.includes('broken_image') && !src.includes('chapter-badge')) {
      images.push(pickImageUrl(src));
    }
  });

  return images;
}

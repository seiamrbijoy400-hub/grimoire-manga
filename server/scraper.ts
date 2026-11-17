import * as cheerio from 'cheerio';

const WEEB_BASE = 'https://weebcentral.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

export async function searchManga(
  query: string,
  sort: string = 'Popularity',
  offset: number = 0,
  limit: number = 32
): Promise<MangaItem[]> {
  try {
    const params = new URLSearchParams({
      text: query,
      sort: sort,
      order: 'Descending',
      display_mode: 'Full Display',
      limit: String(limit),
      offset: String(offset),
      official: 'Any',
      anime: 'Any',
      adult: 'Any'
    });

    const res = await fetch(`${WEEB_BASE}/search/data?${params.toString()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'HX-Request': 'true'
      }
    });

    if (!res.status.toString().startsWith('2')) {
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

      // Badges / tags
      const tags: string[] = [];
      card.find('.badge, a[href*="/search?tag="]').each((_, t) => {
        const tagText = $(t).text().trim();
        if (tagText && !tags.includes(tagText) && tagText !== 'Official') tags.push(tagText);
      });

      results.push({
        id,
        title,
        slug,
        cover,
        description,
        tags
      });
    });

    // Fallback to quick search if advanced search returned 0 items and query exists and offset === 0
    if (results.length === 0 && query.trim() && offset === 0) {
      return await quickSearch(query);
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

    const res = await fetch(`${WEEB_BASE}/search/simple?location=main`, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
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
        cover
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
    const res = await fetch(`${WEEB_BASE}/series/${id}`, {
      headers: {
        'User-Agent': USER_AGENT
      }
    });

    if (!res.status.toString().startsWith('2')) {
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
    if (html.includes('Manhwa')) type = 'Manhwa';
    else if (html.includes('Manhua')) type = 'Manhua';

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
    const res = await fetch(`${WEEB_BASE}/series/${seriesId}/full-chapter-list`, {
      headers: {
        'User-Agent': USER_AGENT,
        'HX-Request': 'true'
      }
    });

    if (!res.status.toString().startsWith('2')) {
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
    const res = await fetch(`${WEEB_BASE}/chapters/${chapterId}/images?reading_style=long_strip`, {
      headers: {
        'User-Agent': USER_AGENT,
        'HX-Request': 'true'
      }
    });

    if (!res.status.toString().startsWith('2')) {
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

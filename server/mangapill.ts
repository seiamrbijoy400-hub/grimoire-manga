import { filterSafe } from './safety.ts';

const MANGAPILL_BASE = 'https://mangapill.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export interface MangaPillItem {
  id: string; // Formatted with 'mp:' prefix
  rawId: string;
  title: string;
  cover: string;
  description?: string;
  latestChapter?: string;
  status?: string;
  type?: string;
  tags?: string[];
  source: 'mangapill';
}

export interface MangaPillDetails extends MangaPillItem {
  author?: string;
  artist?: string;
  synopsis: string;
  chaptersCount?: number;
}

export interface MangaPillChapter {
  id: string; // Formatted with 'mp:' prefix
  rawId: string;
  title: string;
  chapterNumber?: string;
  date?: string;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': `${MANGAPILL_BASE}/`,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`MangaPill request failed: ${res.status} for ${url}`);
  }

  return res.text();
}

export async function searchMangaPill(
  query: string = '',
  type?: string,
  status?: string,
  page: number = 1,
): Promise<MangaPillItem[]> {
  try {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.append('q', query.trim());
    } else {
      // Empty query browsing: status publishing provides high-quality continuous index
      params.append('status', 'publishing');
    }

    if (type) {
      const lower = type.toLowerCase();
      if (lower.includes('manhua')) params.append('type', 'manhua');
      else if (lower.includes('manga')) params.append('type', 'manga');
    }
    if (status) {
      const lower = status.toLowerCase();
      if (lower.includes('ongoing')) params.set('status', 'publishing');
      else if (lower.includes('complete')) params.set('status', 'finished');
    }

    if (page > 1) {
      params.append('page', String(page));
    }

    const targetUrl = `${MANGAPILL_BASE}/search?${params.toString()}`;
    const html = await fetchHtml(targetUrl);
    const results: MangaPillItem[] = [];

    let cheerioLoaded: any = null;
    try {
      const cheerio = await import('cheerio');
      cheerioLoaded = cheerio.load(html);
    } catch {}

    if (cheerioLoaded) {
      const $ = cheerioLoaded;
      $('div.container div.grid > div').each((_: any, el: any) => {
        const card = $(el);
        const link = card.find('a[href^="/manga/"]').first();
        const href = link.attr('href');
        if (!href) return;

        const rawId = href.replace(/^\/manga\//, '').replace(/\/$/, '');
        const title = card.find('.font-black').text().trim() || link.text().trim();
        const cover = (card.find('img').attr('data-src') || card.find('img').attr('src') || '').trim();
        const description = card.find('.line-clamp-2.text-xs').text().trim();
        const typeBadge = card.find('div.text-xs.text-secondary').text().trim();

        let detectedType = 'Manga';
        if (/manhwa/i.test(typeBadge) || /manhwa/i.test(description) || /korean/i.test(description)) {
          detectedType = 'Manhwa';
        } else if (/manhua/i.test(typeBadge) || /manhua/i.test(description) || /chinese/i.test(description)) {
          detectedType = 'Manhua';
        }

        if (rawId && title && !results.some((r) => r.rawId === rawId)) {
          results.push({
            id: `mp:${rawId}`,
            rawId,
            title,
            cover,
            description,
            type: detectedType,
            status: 'Ongoing',
            tags: [],
            source: 'mangapill',
          });
        }
      });
    } else {
      const cardRegex = /<a\s+href="(\/manga\/[^"]+)"[^>]*>[\s\S]*?<img\s+(?:data-src|src)="([^"]+)"[\s\S]*?<div\s+class="mt-3 font-black[^"]*">([^<]+)<\/div>/g;
      let match: RegExpExecArray | null;
      while ((match = cardRegex.exec(html)) !== null) {
        const rawId = match[1].replace(/^\/manga\//, '').replace(/\/$/, '');
        const cover = match[2].trim();
        const title = match[3].trim();
        if (rawId && title && !results.some((r) => r.rawId === rawId)) {
          results.push({
            id: `mp:${rawId}`,
            rawId,
            title,
            cover,
            type: /manhwa/i.test(title) ? 'Manhwa' : 'Manga',
            status: 'Ongoing',
            tags: [],
            source: 'mangapill',
          });
        }
      }
    }

    return filterSafe(results);
  } catch (err) {
    console.error('searchMangaPill error:', err);
    return [];
  }
}

export async function getMangaPillDetails(rawId: string): Promise<MangaPillDetails | null> {
  try {
    const cleanId = rawId.replace(/^mp:/, '');
    const url = `${MANGAPILL_BASE}/manga/${cleanId}`;
    const html = await fetchHtml(url);

    let cheerioLoaded: any = null;
    try {
      const cheerio = await import('cheerio');
      cheerioLoaded = cheerio.load(html);
    } catch {}

    if (cheerioLoaded) {
      const $ = cheerioLoaded;
      const title = $('h1').first().text().trim();
      if (!title) return null;

      const cover = ($('img.lazy').attr('data-src') || $('img').first().attr('src') || '').trim();
      const synopsis =
        $('p.text-sm.text--secondary').text().trim() ||
        $('meta[name="description"]').attr('content') ||
        '';

      const tags: string[] = [];
      $('a[href*="/search?genre="]').each((_: any, el: any) => {
        const g = $(el).text().trim();
        if (g && !tags.includes(g)) tags.push(g);
      });

      let type = 'Manga';
      let status = 'Ongoing';

      $('div.grid.grid-cols-2 > div, div.grid.grid-cols-3 > div').each((_: any, el: any) => {
        const text = $(el).text();
        if (/Type/i.test(text)) {
          const val = text.replace(/Type/i, '').trim();
          if (/manhwa/i.test(val)) type = 'Manhwa';
          else if (/manhua/i.test(val)) type = 'Manhua';
        }
        if (/Status/i.test(text)) {
          const val = text.replace(/Status/i, '').trim();
          if (/finished|complete/i.test(val)) status = 'Completed';
          else if (/hiatus/i.test(val)) status = 'Hiatus';
        }
      });

      const chaptersCount = $('div[data-filter-list] a, div#chapters a').length;

      return {
        id: `mp:${cleanId}`,
        rawId: cleanId,
        title,
        cover,
        synopsis,
        type,
        status,
        tags,
        chaptersCount,
        source: 'mangapill',
      };
    } else {
      const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.trim() || cleanId;
      const cover = (html.match(/<img[^>]*data-src="([^"]+)"/)?.[1] || '').trim();
      const synopsis = html.match(/<p class="text-sm text--secondary">([\s\S]*?)<\/p>/)?.[1]?.trim() || '';
      const chaptersCount = (html.match(/href="\/chapters\/[^"]+"/g) || []).length;

      return {
        id: `mp:${cleanId}`,
        rawId: cleanId,
        title,
        cover,
        synopsis,
        type: 'Manga',
        status: 'Ongoing',
        tags: [],
        chaptersCount,
        source: 'mangapill',
      };
    }
  } catch (err) {
    console.error('getMangaPillDetails error:', err);
    return null;
  }
}

export async function getMangaPillChapters(rawId: string): Promise<MangaPillChapter[]> {
  try {
    const cleanId = rawId.replace(/^mp:/, '');
    const url = `${MANGAPILL_BASE}/manga/${cleanId}`;
    const html = await fetchHtml(url);
    const chapters: MangaPillChapter[] = [];

    const chapRegex = /<a\s+class="[^"]*border[^"]*"[^>]*href="(\/chapters\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match: RegExpExecArray | null;
    while ((match = chapRegex.exec(html)) !== null) {
      const rawChapterId = match[1].replace(/^\/chapters\//, '').replace(/\/$/, '');
      const title = match[2].trim();
      const numMatch = title.match(/Chapter\s+([\d.]+)/i);

      chapters.push({
        id: `mp:${rawChapterId}`,
        rawId: rawChapterId,
        title,
        chapterNumber: numMatch ? numMatch[1] : undefined,
      });
    }

    return chapters;
  } catch (err) {
    console.error('getMangaPillChapters error:', err);
    return [];
  }
}

export async function getMangaPillChapterImages(rawChapterId: string): Promise<string[]> {
  try {
    const cleanChapterId = rawChapterId.replace(/^mp:/, '');
    const url = `${MANGAPILL_BASE}/chapters/${cleanChapterId}`;
    const html = await fetchHtml(url);
    const images: string[] = [];

    const imgRegex = /<img\s+class="js-page"[^>]*?(?:data-src|src)="([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1].trim();
      if (src && !images.includes(src)) {
        images.push(src);
      }
    }

    return images;
  } catch (err) {
    console.error('getMangaPillChapterImages error:', err);
    return [];
  }
}

export async function getMangaPillLatest(page: number = 1): Promise<MangaPillItem[]> {
  return searchMangaPill('', undefined, 'publishing', page);
}

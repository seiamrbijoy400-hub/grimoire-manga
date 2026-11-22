import { filterSafe } from './safety.ts';

const MANGAREAD_BASE = 'https://www.mangaread.org';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export interface MangaReadItem {
  id: string; // Formatted with 'mr:' prefix
  rawId: string;
  title: string;
  cover: string;
  description?: string;
  latestChapter?: string;
  status?: string;
  type?: string;
  tags?: string[];
  source: 'mangaread';
}

export interface MangaReadDetails extends MangaReadItem {
  author?: string;
  artist?: string;
  synopsis: string;
  chaptersCount?: number;
}

export interface MangaReadChapter {
  id: string; // Formatted with 'mr:' prefix: 'mr:<slug>:<chapterSlug>'
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
      'Referer': `${MANGAREAD_BASE}/`,
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`MangaRead request failed: ${res.status} for ${url}`);
  }

  return res.text();
}

export async function searchMangaRead(query: string = '', type?: string, page: number = 1): Promise<MangaReadItem[]> {
  try {
    const url = query.trim()
      ? `${MANGAREAD_BASE}/page/${page}/?s=${encodeURIComponent(query.trim())}&post_type=wp-manga`
      : `${MANGAREAD_BASE}/manga/page/${page}/`;

    const html = await fetchHtml(url);
    const results: MangaReadItem[] = [];

    let cheerioLoaded: any = null;
    try {
      const cheerio = await import('cheerio');
      cheerioLoaded = cheerio.load(html);
    } catch {}

    if (cheerioLoaded) {
      const $ = cheerioLoaded;

      // Match both search results (.c-tabs-item__content) and browse listing (.page-item-detail)
      $('.c-tabs-item__content, .search-wrap .row, .page-item-detail').each((_: any, el: any) => {
        const card = $(el);
        const titleLink = card.find('.post-title a').first();
        const href = titleLink.attr('href') || card.find('a[href*="/manga/"]').first().attr('href');
        if (!href) return;

        const match = href.match(/\/manga\/([^/]+)/);
        if (!match) return;
        const rawId = match[1];
        if (rawId === 'page' || rawId === 'feed') return;

        const title = titleLink.text().trim() || card.find('.post-title').text().trim();
        const cover = (card.find('.tab-thumb img, .item-thumb img, img').attr('data-src') ||
                      card.find('.tab-thumb img, .item-thumb img, img').attr('src') || '').trim();
        const description = card.find('.post-content_item, .summary__content').text().trim();

        let detectedType = 'Manhwa';
        if (/manga/i.test(description) && !/manhwa/i.test(description)) {
          detectedType = 'Manga';
        } else if (/manhua/i.test(description)) {
          detectedType = 'Manhua';
        }

        if (rawId && title && !results.some((r) => r.rawId === rawId)) {
          results.push({
            id: `mr:${rawId}`,
            rawId,
            title,
            cover,
            description,
            type: detectedType,
            status: 'Ongoing',
            tags: [],
            source: 'mangaread',
          });
        }
      });
    } else {
      // Regex parsing for search results
      const searchRegex = /<div class="row c-tabs-item__content">[\s\S]*?<a\s+href="https:\/\/www\.mangaread\.org\/manga\/([^/"]+)\/"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<h3 class="h4"><a[^>]*>([^<]+)<\/a><\/h3>/g;
      let match: RegExpExecArray | null;
      while ((match = searchRegex.exec(html)) !== null) {
        const rawId = match[1];
        const cover = match[2].trim();
        const title = match[3].trim();
        if (rawId && rawId !== 'page' && title && !results.some((r) => r.rawId === rawId)) {
          results.push({
            id: `mr:${rawId}`,
            rawId,
            title,
            cover,
            type: 'Manhwa',
            status: 'Ongoing',
            tags: [],
            source: 'mangaread',
          });
        }
      }

      // Regex parsing for browse listings
      const browseRegex = /<div class="page-item-detail manga[\s\S]*?<a\s+href="https:\/\/www\.mangaread\.org\/manga\/([^/"]+)\/"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<h3 class="h5">[\s\S]*?<a[^>]*>([^<]+)<\/a><\/h3>/g;
      while ((match = browseRegex.exec(html)) !== null) {
        const rawId = match[1];
        const cover = match[2].trim();
        const title = match[3].trim();
        if (rawId && rawId !== 'page' && title && !results.some((r) => r.rawId === rawId)) {
          results.push({
            id: `mr:${rawId}`,
            rawId,
            title,
            cover,
            type: 'Manhwa',
            status: 'Ongoing',
            tags: [],
            source: 'mangaread',
          });
        }
      }
    }

    return filterSafe(results);
  } catch (err) {
    console.error('searchMangaRead error:', err);
    return [];
  }
}

export async function getMangaReadDetails(rawId: string): Promise<MangaReadDetails | null> {
  try {
    const cleanId = rawId.replace(/^mr:/, '');
    const url = `${MANGAREAD_BASE}/manga/${cleanId}/`;
    const html = await fetchHtml(url);

    let cheerioLoaded: any = null;
    try {
      const cheerio = await import('cheerio');
      cheerioLoaded = cheerio.load(html);
    } catch {}

    if (cheerioLoaded) {
      const $ = cheerioLoaded;
      const title = $('.post-title h1').text().trim();
      if (!title) return null;

      const cover = ($('.summary_image img').attr('data-src') ||
                    $('.summary_image img').attr('src') || '').trim();
      const synopsis = $('.description-summary .summary__content, .manga-excerpt').text().trim();

      const tags: string[] = [];
      $('.genres-content a').each((_: any, el: any) => {
        const g = $(el).text().trim();
        if (g && !tags.includes(g)) tags.push(g);
      });

      const author = $('.author-content a').text().trim();
      const artist = $('.artist-content a').text().trim();
      const statusText = $('.post-status .summary-content').text().trim();
      const status = /complete/i.test(statusText) ? 'Completed' : 'Ongoing';

      let type = 'Manhwa';
      if (tags.some((t) => /manga/i.test(t))) type = 'Manga';
      else if (tags.some((t) => /manhua/i.test(t))) type = 'Manhua';

      const chaptersCount = $('li.wp-manga-chapter').length;

      return {
        id: `mr:${cleanId}`,
        rawId: cleanId,
        title,
        cover,
        synopsis,
        author,
        artist,
        type,
        status,
        tags,
        chaptersCount,
        source: 'mangaread',
      };
    } else {
      const title = html.match(/<div class="post-title">[\s\S]*?<h1>([\s\S]*?)<\/h1>/)?.[1]?.trim() || cleanId;
      const cover = (html.match(/<div class="summary_image">[\s\S]*?<img[^>]*src="([^"]+)"/)?.[1] || '').trim();
      const synopsis = html.match(/<div class="summary__content[^"]*">([\s\S]*?)<\/div>/)?.[1]?.replace(/<[^>]+>/g, '').trim() || '';
      const chaptersCount = (html.match(/class="wp-manga-chapter/g) || []).length;

      return {
        id: `mr:${cleanId}`,
        rawId: cleanId,
        title,
        cover,
        synopsis,
        type: 'Manhwa',
        status: 'Ongoing',
        tags: [],
        chaptersCount,
        source: 'mangaread',
      };
    }
  } catch (err) {
    console.error('getMangaReadDetails error:', err);
    return null;
  }
}

export async function getMangaReadChapters(rawId: string): Promise<MangaReadChapter[]> {
  try {
    const cleanId = rawId.replace(/^mr:/, '');
    let html = '';

    try {
      const ajaxRes = await fetch(`${MANGAREAD_BASE}/manga/${cleanId}/ajax/chapters/`, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': `${MANGAREAD_BASE}/manga/${cleanId}/`,
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (ajaxRes.ok) {
        html = await ajaxRes.text();
      }
    } catch {}

    if (!html || !html.includes('wp-manga-chapter')) {
      html = await fetchHtml(`${MANGAREAD_BASE}/manga/${cleanId}/`);
    }

    const chapters: MangaReadChapter[] = [];
    const chapRegex = /<li class="wp-manga-chapter[^"]*">[\s\S]*?<a\s+href="https:\/\/www\.mangaread\.org\/manga\/[^/"]+\/([^/"]+)\/"[^>]*>([\s\S]*?)<\/a>/g;
    let match: RegExpExecArray | null;
    while ((match = chapRegex.exec(html)) !== null) {
      const chapterSlug = match[1];
      const title = match[2].trim();
      const numMatch = title.match(/Chapter\s+([\d.]+)/i);

      chapters.push({
        id: `mr:${cleanId}:${chapterSlug}`,
        rawId: `${cleanId}:${chapterSlug}`,
        title,
        chapterNumber: numMatch ? numMatch[1] : undefined,
      });
    }

    return chapters;
  } catch (err) {
    console.error('getMangaReadChapters error:', err);
    return [];
  }
}

export async function getMangaReadChapterImages(chapterCode: string): Promise<string[]> {
  try {
    const clean = chapterCode.replace(/^mr:/, '');
    const parts = clean.split(':');
    const slug = parts[0];
    const chapterSlug = parts[1] || parts[0];

    const url = `${MANGAREAD_BASE}/manga/${slug}/${chapterSlug}/`;
    const html = await fetchHtml(url);
    const images: string[] = [];

    const imgRegex = /<img[^>]+src="\s*(https?:\/\/[^"\s]+)\s*"[^>]*class="[^"]*wp-manga-chapter-img/g;
    let match: RegExpExecArray | null;
    while ((match = imgRegex.exec(html)) !== null) {
      const cleanSrc = match[1].replace(/[\n\t\r]+/g, '').trim();
      if (cleanSrc.startsWith('http') && !images.includes(cleanSrc)) {
        images.push(cleanSrc);
      }
    }

    if (images.length === 0) {
      const fallbackRegex = /class="[^"]*wp-manga-chapter-img[^"]*"[^>]*src="\s*(https?:\/\/[^"\s]+)\s*"/g;
      while ((match = fallbackRegex.exec(html)) !== null) {
        const cleanSrc = match[1].replace(/[\n\t\r]+/g, '').trim();
        if (cleanSrc.startsWith('http') && !images.includes(cleanSrc)) {
          images.push(cleanSrc);
        }
      }
    }

    return images;
  } catch (err) {
    console.error('getMangaReadChapterImages error:', err);
    return [];
  }
}

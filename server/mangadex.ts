// MangaDex API Engine (Safe, Verified, High-Speed Manga Integration)
const MANGADEX_BASE = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';

export interface MangaDexItem {
  id: string; // Formatted with 'md:' prefix
  rawId: string;
  title: string;
  cover: string;
  description?: string;
  latestChapter?: string;
  status?: string;
  type?: string;
  tags?: string[];
  source: 'mangadex';
}

export interface MangaDexDetails extends MangaDexItem {
  author?: string;
  artist?: string;
  synopsis: string;
  chaptersCount?: number;
}

export interface MangaDexChapter {
  id: string; // Formatted with 'md:' prefix
  rawId: string;
  title: string;
  chapterNumber?: string;
  date?: string;
  pages?: number;
}

// Fetch MangaDex Popular / Safe Manga
export async function getMangaDexTrending(offset: number = 0, limit: number = 32): Promise<MangaDexItem[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      'order[followedCount]': 'desc',
    });
    params.append('includes[]', 'cover_art');
    params.append('includes[]', 'author');
    params.append('contentRating[]', 'safe');
    params.append('hasAvailableChapters', 'true');

    const res = await fetch(`${MANGADEX_BASE}/manga?${params.toString()}`, {
      headers: {
        'User-Agent': 'KuroScroll-MangaPlatform/2026.1 (Termux/Linux)',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      console.error(`MangaDex trending error: ${res.status}`);
      return [];
    }

    const json = await res.json();
    return (json.data || []).map(formatMangaDexItem);
  } catch (err) {
    console.error('Failed to fetch MangaDex trending:', err);
    return [];
  }
}

// Fetch MangaDex Latest Safe Updates
export async function getMangaDexLatest(offset: number = 0, limit: number = 32): Promise<MangaDexItem[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      'order[latestUploadedChapter]': 'desc',
    });
    params.append('includes[]', 'cover_art');
    params.append('contentRating[]', 'safe');
    params.append('hasAvailableChapters', 'true');

    const res = await fetch(`${MANGADEX_BASE}/manga?${params.toString()}`, {
      headers: {
        'User-Agent': 'KuroScroll-MangaPlatform/2026.1 (Termux/Linux)',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map(formatMangaDexItem);
  } catch (err) {
    console.error('Failed to fetch MangaDex latest:', err);
    return [];
  }
}

// Search MangaDex Safe Manga
export async function searchMangaDex(query: string, offset: number = 0, limit: number = 32): Promise<MangaDexItem[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (query) {
      params.append('title', query);
      params.append('order[relevance]', 'desc');
    } else {
      params.append('order[followedCount]', 'desc');
    }
    params.append('includes[]', 'cover_art');
    params.append('contentRating[]', 'safe');

    const res = await fetch(`${MANGADEX_BASE}/manga?${params.toString()}`, {
      headers: {
        'User-Agent': 'KuroScroll-MangaPlatform/2026.1 (Termux/Linux)',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map(formatMangaDexItem);
  } catch (err) {
    console.error('Failed to search MangaDex:', err);
    return [];
  }
}

// Fetch MangaDex Manga Details
export async function getMangaDexDetails(rawId: string): Promise<MangaDexDetails | null> {
  try {
    const params = new URLSearchParams({
      'includes[]': 'cover_art',
    });
    params.append('includes[]', 'author');
    params.append('includes[]', 'artist');

    const res = await fetch(`${MANGADEX_BASE}/manga/${rawId}?${params.toString()}`, {
      headers: {
        'User-Agent': 'KuroScroll-MangaPlatform/2026.1 (Termux/Linux)',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data;
    if (!data) return null;

    const baseItem = formatMangaDexItem(data);

    // Extract author and artist
    const authorRel = data.relationships?.find((r: any) => r.type === 'author');
    const artistRel = data.relationships?.find((r: any) => r.type === 'artist');

    const author = authorRel?.attributes?.name || undefined;
    const artist = artistRel?.attributes?.name || undefined;

    return {
      ...baseItem,
      author,
      artist,
      synopsis: baseItem.description || 'No synopsis provided by MangaDex.',
    };
  } catch (err) {
    console.error(`Failed to fetch MangaDex details for ${rawId}:`, err);
    return null;
  }
}

// Fetch MangaDex Chapter List (English translated, safe)
export async function getMangaDexChapters(rawId: string): Promise<MangaDexChapter[]> {
  try {
    const params = new URLSearchParams({
      limit: '100',
      'order[chapter]': 'desc',
    });
    params.append('translatedLanguage[]', 'en');
    params.append('contentRating[]', 'safe');

    const res = await fetch(`${MANGADEX_BASE}/manga/${rawId}/feed?${params.toString()}`, {
      headers: {
        'User-Agent': 'KuroScroll-MangaPlatform/2026.1 (Termux/Linux)',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return [];
    const json = await res.json();
    const chapters = json.data || [];

    return chapters.map((c: any) => {
      const chNum = c.attributes?.chapter;
      const chTitle = c.attributes?.title;
      const displayTitle = chNum
        ? `Chapter ${chNum}${chTitle ? `: ${chTitle}` : ''}`
        : chTitle || 'Oneshot / Extra';

      const dateStr = c.attributes?.readableAt || c.attributes?.publishAt;
      const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined;

      return {
        id: `md:${c.id}`,
        rawId: c.id,
        title: displayTitle,
        chapterNumber: chNum,
        date: formattedDate,
        pages: c.attributes?.pages,
      };
    });
  } catch (err) {
    console.error(`Failed to fetch MangaDex chapters for ${rawId}:`, err);
    return [];
  }
}

// Fetch MangaDex Chapter Page Images
export async function getMangaDexChapterImages(rawChapterId: string): Promise<string[]> {
  try {
    const res = await fetch(`${MANGADEX_BASE}/at-home/server/${rawChapterId}`, {
      headers: {
        'User-Agent': 'KuroScroll-MangaPlatform/2026.1 (Termux/Linux)',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      console.error(`Failed MangaDex at-home call: ${res.status}`);
      return [];
    }

    const json = await res.json();
    const baseUrl = json.baseUrl;
    const hash = json.chapter?.hash;
    const files = json.chapter?.data || [];

    if (!baseUrl || !hash || files.length === 0) return [];

    return files.map((fileName: string) => `${baseUrl}/data/${hash}/${fileName}`);
  } catch (err) {
    console.error(`Failed to fetch MangaDex images for chapter ${rawChapterId}:`, err);
    return [];
  }
}

// Helper to format MangaDex Manga Object into unified platform format
function formatMangaDexItem(raw: any): MangaDexItem {
  const id = raw.id;
  const attributes = raw.attributes || {};
  
  // English title or fallback to first available title
  const title =
    attributes.title?.en ||
    attributes.title?.ja ||
    attributes.title?.['ja-ro'] ||
    Object.values(attributes.title || {})[0] ||
    'Untitled Manga';

  // Description
  const description =
    attributes.description?.en ||
    Object.values(attributes.description || {})[0] ||
    '';

  // Cover image from relationships
  const coverRel = raw.relationships?.find((r: any) => r.type === 'cover_art');
  const coverFileName = coverRel?.attributes?.fileName;
  const cover = coverFileName
    ? `${COVER_BASE}/${id}/${coverFileName}.512.jpg`
    : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500';

  // Publication status
  const statusRaw = attributes.status || 'ongoing';
  const status = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);

  // Type / Demographics
  const origLang = attributes.originalLanguage;
  let type = 'Manga';
  if (origLang === 'ko') type = 'Manhwa';
  else if (origLang === 'zh' || origLang === 'zh-hk') type = 'Manhua';

  // Tags
  const tags = (attributes.tags || [])
    .map((t: any) => t.attributes?.name?.en)
    .filter(Boolean)
    .slice(0, 5);

  return {
    id: `md:${id}`,
    rawId: id,
    title,
    cover,
    description: description.replace(/\r\n/g, '\n').slice(0, 300),
    status,
    type,
    tags,
    source: 'mangadex',
  };
}

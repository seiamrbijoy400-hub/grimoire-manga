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
  country?: string;
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
  language?: string;
}

export interface MangaDexFilterOptions {
  country?: string; // JP, KR, CN, US, GLOBAL
  lang?: string; // en, es, pt-br, fr, id, ja, ko, zh
  types?: string[]; // Manga, Manhwa, Manhua, OEL
  status?: string[]; // Ongoing, Complete, Hiatus
  includedTags?: string[]; // human names, mapped below
  excludedTags?: string[];
}

/**
 * MangaDex filters tags by UUID, not by name. Only tags with a real MangaDex
 * equivalent are listed here; demographics like Seinen/Shounen simply do not
 * exist upstream and must not silently degrade into an unfiltered feed.
 */
export const MD_TAG_IDS: Record<string, string> = {
  action: '391b0423-d847-456f-aff0-8b0cfc03066b',
  adventure: '87cc87cd-a395-47af-b27a-93258283bbc6',
  comedy: '4d32cc48-9f00-4cca-9b5a-a839f0764984',
  drama: 'b9af3a63-f058-46de-a9a0-e0c13906197a',
  fantasy: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc',
  harem: 'aafb99c1-7f60-43fa-b75f-fc9502ce29c7',
  historical: '33771934-028e-4cb3-8744-691e866a923e',
  horror: 'cdad7e68-1419-41dd-bdce-27753074a640',
  isekai: 'ace04997-f6bd-436e-b261-779182193d3d',
  'martial arts': '799c202e-7daa-44eb-9cf7-8a3c0441531e',
  mecha: '50880a9d-5440-4732-9afb-8f457127e836',
  mystery: 'ee968100-4191-4968-93d3-f82d72be7e46',
  psychological: '3b60b75c-a2d7-4860-ab56-05f391bb889c',
  romance: '423e2eae-a7a2-4a8b-ac03-a8351462d71d',
  'school life': 'caaa44eb-cd40-4177-b930-79d3ef2afe87',
  'sci-fi': '256c8bd9-4904-4360-bf4f-508a76d67183',
  'slice of life': 'e5301a23-ebd9-49dd-a0cb-2add944c7fe9',
  sports: '69964a64-2f90-4d33-beeb-f3ed2875eb4c',
  supernatural: 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75',
  thriller: '07251805-a27e-4d59-b488-f0bfbec15168',
  tragedy: 'f8f62932-27da-4fe4-8ee1-6779a8c5edba',
  // MangaDex uses different names for a few WeebCentral tags.
  'gender bender': '2bd2e8d0-f146-434a-9b51-fc9ff2c5fe6b', // Genderswap
  yaoi: '5920b825-4181-4a17-beeb-9918b0ff7a30', // Boys' Love
  yuri: 'a3c67850-4684-404e-9b7f-c69850ee5da6', // Girls' Love
};

const mdTagId = (name: string) => MD_TAG_IDS[name.trim().toLowerCase()];

export const unsupportedMangaDexTags = (tags: string[] = []): string[] =>
  tags.filter((tag) => !mdTagId(tag));

function applyMangaDexFilters(params: URLSearchParams, options?: MangaDexFilterOptions) {
  if (!options) return;

  // 1. Country & Original Language
  if (options.country) {
    if (options.country === 'JP') params.append('originalLanguage[]', 'ja');
    else if (options.country === 'KR') params.append('originalLanguage[]', 'ko');
    else if (options.country === 'CN') {
      params.append('originalLanguage[]', 'zh');
      params.append('originalLanguage[]', 'zh-hk');
    } else if (options.country === 'US' || options.country === 'GLOBAL') {
      params.append('originalLanguage[]', 'en');
    }
  } else if (options.types && options.types.length > 0) {
    if (options.types.includes('Manhwa')) params.append('originalLanguage[]', 'ko');
    if (options.types.includes('Manhua')) {
      params.append('originalLanguage[]', 'zh');
      params.append('originalLanguage[]', 'zh-hk');
    }
    if (options.types.includes('Manga')) params.append('originalLanguage[]', 'ja');
    if (options.types.includes('OEL')) params.append('originalLanguage[]', 'en');
  }

  // 2. Translated Edition Language
  if (options.lang) {
    params.append('availableTranslatedLanguage[]', options.lang.toLowerCase());
  }

  // 3. Status
  if (options.status && options.status.length > 0) {
    if (options.status.includes('Ongoing')) params.append('status[]', 'ongoing');
    if (options.status.includes('Complete')) params.append('status[]', 'completed');
    if (options.status.includes('Hiatus')) params.append('status[]', 'hiatus');
  }

  // 4. Genres / themes (UUIDs, unsupported names are filtered by the caller)
  options.includedTags?.forEach((tag) => {
    const id = mdTagId(tag);
    if (id) params.append('includedTags[]', id);
  });
  options.excludedTags?.forEach((tag) => {
    const id = mdTagId(tag);
    if (id) params.append('excludedTags[]', id);
  });
}

// Fetch MangaDex Popular / Safe Manga
export async function getMangaDexTrending(offset: number = 0, limit: number = 32, options?: MangaDexFilterOptions): Promise<MangaDexItem[]> {
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
    applyMangaDexFilters(params, options);

    const res = await fetch(`${MANGADEX_BASE}/manga?${params.toString()}`, {
      headers: {
        'User-Agent': 'KursoScroll-MangaPlatform/2026.2 (Termux/Linux)',
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
export async function getMangaDexLatest(offset: number = 0, limit: number = 32, options?: MangaDexFilterOptions): Promise<MangaDexItem[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      'order[latestUploadedChapter]': 'desc',
    });
    params.append('includes[]', 'cover_art');
    params.append('contentRating[]', 'safe');
    params.append('hasAvailableChapters', 'true');
    applyMangaDexFilters(params, options);

    const res = await fetch(`${MANGADEX_BASE}/manga?${params.toString()}`, {
      headers: {
        'User-Agent': 'KursoScroll-MangaPlatform/2026.2 (Termux/Linux)',
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
export async function searchMangaDex(query: string, offset: number = 0, limit: number = 32, options?: MangaDexFilterOptions): Promise<MangaDexItem[]> {
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
    applyMangaDexFilters(params, options);

    const res = await fetch(`${MANGADEX_BASE}/manga?${params.toString()}`, {
      headers: {
        'User-Agent': 'KursoScroll-MangaPlatform/2026.2 (Termux/Linux)',
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
        'User-Agent': 'KursoScroll-MangaPlatform/2026.2 (Termux/Linux)',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data;
    if (!data) return null;

    // Never expose erotica/pornographic titles, even by direct id.
    const rating = (data.attributes?.contentRating || '').toLowerCase();
    if (rating === 'erotica' || rating === 'pornographic') return null;

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

    let res = await fetch(`${MANGADEX_BASE}/manga/${rawId}/feed?${params.toString()}`, {
      headers: {
        'User-Agent': 'KursoScroll-MangaPlatform/2026.2 (Termux/Linux)',
        'Accept': 'application/json'
      }
    });

    let json = res.ok ? await res.json() : { data: [] };
    let rawChapters = (json.data || []).filter((c: any) => !c.attributes?.externalUrl && (c.attributes?.pages === undefined || c.attributes?.pages > 0));

    // If no English internal chapters found, fallback to any available language chapters with pages
    if (rawChapters.length === 0) {
      const allLangParams = new URLSearchParams({
        limit: '100',
        'order[chapter]': 'desc',
      });
      res = await fetch(`${MANGADEX_BASE}/manga/${rawId}/feed?${allLangParams.toString()}`, {
        headers: {
          'User-Agent': 'KursoScroll-MangaPlatform/2026.2 (Termux/Linux)',
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        json = await res.json();
        rawChapters = (json.data || []).filter((c: any) => !c.attributes?.externalUrl && (c.attributes?.pages === undefined || c.attributes?.pages > 0));
      }
    }

    return rawChapters.map((c: any) => {
      const chNum = c.attributes?.chapter;
      const chTitle = c.attributes?.title;
      const lang = (c.attributes?.translatedLanguage || 'en').toLowerCase();
      const displayTitle = chNum
        ? `Chapter ${chNum}${chTitle ? `: ${chTitle}` : ''}`
        : `${chTitle || 'Chapter'}`;

      const dateStr = c.attributes?.readableAt || c.attributes?.publishAt;
      const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined;

      return {
        id: `md:${c.id}`,
        rawId: c.id,
        title: displayTitle,
        chapterNumber: chNum,
        date: formattedDate,
        pages: c.attributes?.pages,
        language: lang,
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
        'User-Agent': 'KursoScroll-MangaPlatform/2026.2 (Termux/Linux)',
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
    const isFullQuality = json.chapter?.data && json.chapter.data.length > 0;
    const files = isFullQuality ? json.chapter.data : (json.chapter?.dataSaver || []);
    const folder = isFullQuality ? 'data' : 'data-saver';

    if (!baseUrl || !hash || files.length === 0) return [];

    return files.map((fileName: string) => `${baseUrl}/${folder}/${hash}/${fileName}`);
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

  // Type / Demographics & Country
  const origLang = attributes.originalLanguage;
  let type = 'Manga';
  let country = 'JP';
  if (origLang === 'ko') {
    type = 'Manhwa';
    country = 'KR';
  } else if (origLang === 'zh' || origLang === 'zh-hk') {
    type = 'Manhua';
    country = 'CN';
  } else if (origLang === 'en') {
    type = 'OEL';
    country = 'US';
  }

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
    country,
    tags,
    source: 'mangadex',
  };
}

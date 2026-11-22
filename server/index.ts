import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import fs from 'node:fs';
import path from 'node:path';
import {
  searchMangaAdvanced,
  quickSearch,
  getMangaDetails,
  getChapterList,
  getChapterImages,
  ALL_AVAILABLE_TAGS,
  ALL_AVAILABLE_TYPES,
  ALL_AVAILABLE_STATUSES,
  AdvancedSearchFilter,
  MangaItem
} from './scraper.ts';
import {
  getMangaDexTrending,
  getMangaDexLatest,
  getMangaDexDetails,
  getMangaDexChapters,
  getMangaDexChapterImages,
  searchMangaDex,
  unsupportedMangaDexTags
} from './mangadex.ts';
import {
  searchMangaPill,
  getMangaPillDetails,
  getMangaPillChapters,
  getMangaPillChapterImages,
  getMangaPillLatest,
} from './mangapill.ts';
import {
  searchComicK,
  getComicKDetails,
  getComicKChapters,
  getComicKChapterImages,
} from './comick.ts';
import {
  searchMangaRead,
  getMangaReadDetails,
  getMangaReadChapters,
  getMangaReadChapterImages,
} from './mangaread.ts';
import {
  UpstreamError,
  probeTransports,
  getPreferredTransport,
} from './upstream.ts';
import { filterSafe, isAdultContent } from './safety.ts';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

// Health & Metadata check
app.get('/api/health', (c) => c.json({
  status: 'ok',
  service: 'KURSO SCROLL Manga Platform',
  version: '2026.3.0',
  engines: [
    'WeebCentral',
    'MangaDex Safe Vault',
    'MangaPill Global',
    'ComicK Webtoons',
    'MangaRead Vault'
  ],
  weebTransport: getPreferredTransport() ?? 'unknown'
}));

// Live connectivity report
app.get('/api/diagnostics', async (c) => {
  const transports = await probeTransports();
  return c.json({
    ok: transports.some((t) => t.ok),
    preferred: getPreferredTransport(),
    transports,
    sources: {
      mangapill: 'direct',
      comick: 'relay+direct',
      mangaread: 'direct',
      mangadex: 'direct api',
      weebcentral: transports.find((t) => t.ok)?.name || 'unreachable'
    }
  });
});

// Filter options dictionary with all 5 sources
app.get('/api/filters', (c) => {
  return c.json({
    data: {
      tags: ALL_AVAILABLE_TAGS,
      types: ALL_AVAILABLE_TYPES,
      statuses: ALL_AVAILABLE_STATUSES,
      sorts: ['Popularity', 'Latest Updates', 'Alphabet', 'Subscribers', 'Recently Added'],
      sources: [
        { id: 'all', label: '🌐 Unified Matrix', desc: 'Blended Manga, Manhwa & Manhua from all 5 sources' },
        { id: 'weebcentral', label: '⚡ WeebCentral Stream', desc: 'Raw scanlation stream' },
        { id: 'mangadex', label: '🛡️ MangaDex Vault', desc: 'Curated safe global archive' },
        { id: 'mangapill', label: '💊 MangaPill Global', desc: 'Fast universal Manga & Manhwa' },
        { id: 'comick', label: '⚔️ ComicK Webtoons', desc: 'Top Korean Manhwa & Chinese Manhua' },
        { id: 'mangaread', label: '📖 MangaRead Vault', desc: 'Madara action, romance & cultivation' },
      ]
    }
  });
});

function interleaveResults(...arrays: any[][]): any[] {
  const result: any[] = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const maxLen = Math.max(...arrays.map((a) => a.length), 0);

  for (let i = 0; i < maxLen; i++) {
    for (const arr of arrays) {
      if (i < arr.length) {
        const item = arr[i];
        const normTitle = (item.title || '').trim().toLowerCase().replace(/[^\w\s]/g, '');
        if (!seenIds.has(item.id) && !seenTitles.has(normTitle)) {
          seenIds.add(item.id);
          if (normTitle.length > 2) seenTitles.add(normTitle);
          result.push(item);
        }
      }
    }
  }
  return result;
}

// Advanced Search Endpoint (Multi-Source 5-Engine Federation)
app.get('/api/search', async (c) => {
  const query = c.req.query('q') || '';
  const sort = c.req.query('sort') || 'Popularity';
  const order = (c.req.query('order') as 'Ascending' | 'Descending') || 'Descending';
  const offset = Number(c.req.query('offset')) || 0;
  const limit = Number(c.req.query('limit')) || 32;
  const quick = c.req.query('quick') === 'true';
  const source = c.req.query('source') || 'all';

  const typesParam = c.req.queries('type') || c.req.queries('types') || [];
  const statusParam = c.req.queries('status') || [];
  const includedTagsParam = c.req.queries('tag') || c.req.queries('included_tag') || [];
  const excludedTagsParam = c.req.queries('excluded_tag') || [];
  const countryParam = c.req.query('country') || undefined;

  const typeFilter = typesParam[0];
  const statusFilter = statusParam[0];
  const page = Math.floor(offset / 32) + 1;

  // Specific Source: MangaPill
  if (source === 'mangapill') {
    const pillResults = query
      ? await searchMangaPill(query, typeFilter, statusFilter, page)
      : await getMangaPillLatest(page);
    return c.json({ data: pillResults, count: pillResults.length, offset, source: 'mangapill' });
  }

  // Specific Source: ComicK
  if (source === 'comick') {
    const ckResults = await searchComicK(query, typeFilter, page);
    return c.json({ data: ckResults, count: ckResults.length, offset, source: 'comick' });
  }

  // Specific Source: MangaRead
  if (source === 'mangaread') {
    const mrResults = await searchMangaRead(query, typeFilter, page);
    return c.json({ data: mrResults, count: mrResults.length, offset, source: 'mangaread' });
  }

  // Specific Source: MangaDex
  const LANG_ALIASES: Record<string, string> = { banglish: 'bn', hinglish: 'hi', urdlish: 'ur' };
  const rawLang = c.req.query('lang') || undefined;
  const langParam = rawLang ? LANG_ALIASES[rawLang.toLowerCase()] || rawLang.toLowerCase() : undefined;

  const mdFilterOptions = {
    country: countryParam,
    lang: langParam,
    types: typesParam.length > 0 ? typesParam : undefined,
    status: statusParam.length > 0 ? statusParam : undefined,
    includedTags: includedTagsParam.length > 0 ? includedTagsParam : undefined,
    excludedTags: excludedTagsParam.length > 0 ? excludedTagsParam : undefined,
  };

  const unsupportedTags = [
    ...unsupportedMangaDexTags(includedTagsParam),
    ...unsupportedMangaDexTags(excludedTagsParam),
  ];

  if (source === 'mangadex') {
    if (unsupportedTags.length > 0) {
      return c.json({
        data: [],
        count: 0,
        offset,
        source: 'mangadex',
        error: `MangaDex has no tag for: ${unsupportedTags.join(', ')}`,
      });
    }
    const mdResults = !query
      ? (sort === 'Latest Updates' ? await getMangaDexLatest(offset, limit, mdFilterOptions) : await getMangaDexTrending(offset, limit, mdFilterOptions))
      : await searchMangaDex(query, offset, limit, mdFilterOptions);
    const safeMd = filterSafe(mdResults);
    return c.json({ data: safeMd, count: safeMd.length, offset, source: 'mangadex' });
  }

  // Specific Source: WeebCentral
  if (source === 'weebcentral') {
    try {
      const results = quick ? await quickSearch(query) : await searchMangaAdvanced({
        query, sort, order, types: typesParam, status: statusParam, includedTags: includedTagsParam, excludedTags: excludedTagsParam, offset, limit
      });
      return c.json({ data: results, count: results.length, offset, source: 'weebcentral' });
    } catch (err) {
      const detail = err instanceof UpstreamError ? err.message : String(err);
      return c.json({ data: [], count: 0, offset, source: 'weebcentral', error: 'WeebCentral is unreachable', detail }, 502);
    }
  }

  // Unified Multi-Source Matrix: source === 'all'
  // Launch all 5 engines concurrently with resilience
  const [weebRes, mdRes, pillRes, ckRes, mrRes] = await Promise.allSettled([
    quick ? quickSearch(query) : searchMangaAdvanced({
      query, sort, order, types: typesParam, status: statusParam, includedTags: includedTagsParam, excludedTags: excludedTagsParam, offset, limit
    }),
    (!query
      ? (sort === 'Latest Updates' ? getMangaDexLatest(offset, limit, mdFilterOptions) : getMangaDexTrending(offset, limit, mdFilterOptions))
      : searchMangaDex(query, offset, limit, mdFilterOptions)),
    (query ? searchMangaPill(query, typeFilter, statusFilter, page) : getMangaPillLatest(page)),
    searchComicK(query, typeFilter, page),
    searchMangaRead(query, typeFilter, page),
  ]);

  const weebList: any[] = weebRes.status === 'fulfilled' ? filterSafe(weebRes.value) : [];
  const mdList: any[] = mdRes.status === 'fulfilled' ? filterSafe(mdRes.value) : [];
  const pillList: any[] = pillRes.status === 'fulfilled' ? filterSafe(pillRes.value) : [];
  const ckList: any[] = ckRes.status === 'fulfilled' ? filterSafe(ckRes.value) : [];
  const mrList: any[] = mrRes.status === 'fulfilled' ? filterSafe(mrRes.value) : [];

  const blended = interleaveResults(weebList, mdList, pillList, ckList, mrList);

  return c.json({
    data: blended,
    count: blended.length,
    offset,
    source: 'all',
    breakdown: {
      weebcentral: weebList.length,
      mangadex: mdList.length,
      mangapill: pillList.length,
      comick: ckList.length,
      mangaread: mrList.length,
    }
  });
});

// Trending manga shortcut (Supports source=all | mangadex | mangapill | comick | mangaread | weebcentral)
app.get('/api/trending', async (c) => {
  const offset = Number(c.req.query('offset')) || 0;
  const limit = Number(c.req.query('limit')) || 32;
  const page = Math.floor(offset / 32) + 1;
  const type = c.req.query('type');
  const source = c.req.query('source') || 'all';

  if (source === 'mangapill') {
    const list = filterSafe(await getMangaPillLatest(page));
    return c.json({ data: list, source: 'mangapill' });
  }

  if (source === 'comick') {
    const list = filterSafe(await searchComicK('', type, page));
    return c.json({ data: list, source: 'comick' });
  }

  if (source === 'mangaread') {
    const list = filterSafe(await searchMangaRead('', type, page));
    return c.json({ data: list, source: 'mangaread' });
  }

  if (source === 'mangadex') {
    const mdResults = filterSafe(await getMangaDexTrending(offset, limit));
    return c.json({ data: mdResults, source: 'mangadex' });
  }

  // All: blend
  const [weebSettled, mdSettled, pillSettled, ckSettled, mrSettled] = await Promise.allSettled([
    searchMangaAdvanced({ sort: 'Popularity', order: 'Descending', types: type ? [type] : undefined, offset, limit }),
    getMangaDexTrending(offset, limit),
    getMangaPillLatest(page),
    searchComicK('', type, page),
    searchMangaRead('', type, page),
  ]);

  const weebList = weebSettled.status === 'fulfilled' ? filterSafe(weebSettled.value) : [];
  const mdList = mdSettled.status === 'fulfilled' ? filterSafe(mdSettled.value) : [];
  const pillList = pillSettled.status === 'fulfilled' ? filterSafe(pillSettled.value) : [];
  const ckList = ckSettled.status === 'fulfilled' ? filterSafe(ckSettled.value) : [];
  const mrList = mrSettled.status === 'fulfilled' ? filterSafe(mrSettled.value) : [];

  const blended = interleaveResults(weebList, mdList, pillList, ckList, mrList);
  return c.json({ data: blended, source: 'all' });
});

// Latest updates shortcut
app.get('/api/latest', async (c) => {
  const offset = Number(c.req.query('offset')) || 0;
  const limit = Number(c.req.query('limit')) || 32;
  const page = Math.floor(offset / 32) + 1;
  const type = c.req.query('type');
  const source = c.req.query('source') || 'all';

  if (source === 'mangapill') {
    const list = filterSafe(await getMangaPillLatest(page));
    return c.json({ data: list, source: 'mangapill' });
  }

  if (source === 'comick') {
    const list = filterSafe(await searchComicK('', type, page));
    return c.json({ data: list, source: 'comick' });
  }

  if (source === 'mangaread') {
    const list = filterSafe(await searchMangaRead('', type, page));
    return c.json({ data: list, source: 'mangaread' });
  }

  if (source === 'mangadex') {
    const mdResults = filterSafe(await getMangaDexLatest(offset, limit));
    return c.json({ data: mdResults, source: 'mangadex' });
  }

  const [weebSettled, mdSettled, pillSettled, ckSettled, mrSettled] = await Promise.allSettled([
    searchMangaAdvanced({ sort: 'Latest Updates', order: 'Descending', types: type ? [type] : undefined, offset, limit }),
    getMangaDexLatest(offset, limit),
    getMangaPillLatest(page),
    searchComicK('', type, page),
    searchMangaRead('', type, page),
  ]);

  const weebList = weebSettled.status === 'fulfilled' ? filterSafe(weebSettled.value) : [];
  const mdList = mdSettled.status === 'fulfilled' ? filterSafe(mdSettled.value) : [];
  const pillList = pillSettled.status === 'fulfilled' ? filterSafe(pillSettled.value) : [];
  const ckList = ckSettled.status === 'fulfilled' ? filterSafe(ckSettled.value) : [];
  const mrList = mrSettled.status === 'fulfilled' ? filterSafe(mrSettled.value) : [];

  const blended = interleaveResults(weebList, mdList, pillList, ckList, mrList);
  return c.json({ data: blended, source: 'all' });
});

// Manga details (Multi-source prefix router)
app.get('/api/manga/:id', async (c) => {
  const id = c.req.param('id');

  // MangaPill
  if (id.startsWith('mp:')) {
    const details = await getMangaPillDetails(id);
    if (!details || isAdultContent(details)) {
      return c.json({ error: 'Manga not available' }, 404);
    }
    return c.json({ data: details });
  }

  // ComicK
  if (id.startsWith('ck:')) {
    const details = await getComicKDetails(id);
    if (!details || isAdultContent(details)) {
      return c.json({ error: 'Manga not available' }, 404);
    }
    return c.json({ data: details });
  }

  // MangaRead
  if (id.startsWith('mr:')) {
    const details = await getMangaReadDetails(id);
    if (!details || isAdultContent(details)) {
      return c.json({ error: 'Manga not available' }, 404);
    }
    return c.json({ data: details });
  }

  // MangaDex
  if (id.startsWith('md:')) {
    const rawId = id.slice(3);
    const mdDetails = await getMangaDexDetails(rawId);
    if (!mdDetails || isAdultContent(mdDetails)) {
      return c.json({ error: 'Manga not available' }, 404);
    }
    return c.json({ data: mdDetails });
  }

  // Default: WeebCentral
  try {
    const details = await getMangaDetails(id);
    if (!details || isAdultContent(details)) {
      return c.json({ error: 'Manga not available' }, 404);
    }
    return c.json({ data: details });
  } catch (err) {
    const detail = err instanceof UpstreamError ? err.message : String(err);
    return c.json({ error: 'WeebCentral is unreachable from this server', detail, data: null }, 502);
  }
});

// Chapter list (Multi-source prefix router)
app.get('/api/manga/:id/chapters', async (c) => {
  const id = c.req.param('id');

  // MangaPill
  if (id.startsWith('mp:')) {
    const chapters = await getMangaPillChapters(id);
    return c.json({ data: chapters });
  }

  // ComicK
  if (id.startsWith('ck:')) {
    const chapters = await getComicKChapters(id);
    return c.json({ data: chapters });
  }

  // MangaRead
  if (id.startsWith('mr:')) {
    const chapters = await getMangaReadChapters(id);
    return c.json({ data: chapters });
  }

  // MangaDex
  if (id.startsWith('md:')) {
    const rawId = id.slice(3);
    const mdChapters = await getMangaDexChapters(rawId);
    return c.json({ data: mdChapters });
  }

  // Default: WeebCentral
  try {
    const chapters = await getChapterList(id);
    return c.json({ data: chapters });
  } catch (err) {
    const detail = err instanceof UpstreamError ? err.message : String(err);
    return c.json({ data: [], error: 'WeebCentral is unreachable from this server', detail }, 502);
  }
});

// Chapter images (Multi-source prefix router)
app.get('/api/chapter/:id', async (c) => {
  const id = c.req.param('id');

  // MangaPill
  if (id.startsWith('mp:')) {
    const images = await getMangaPillChapterImages(id);
    return c.json({
      data: {
        chapterId: id,
        images,
        count: images.length
      }
    });
  }

  // ComicK
  if (id.startsWith('ck:')) {
    const images = await getComicKChapterImages(id);
    return c.json({
      data: {
        chapterId: id,
        images,
        count: images.length
      }
    });
  }

  // MangaRead
  if (id.startsWith('mr:')) {
    const images = await getMangaReadChapterImages(id);
    return c.json({
      data: {
        chapterId: id,
        images,
        count: images.length
      }
    });
  }

  // MangaDex
  if (id.startsWith('md:')) {
    const rawChapterId = id.slice(3);
    const images = await getMangaDexChapterImages(rawChapterId);
    return c.json({
      data: {
        chapterId: id,
        images,
        count: images.length
      }
    });
  }

  // Default: WeebCentral
  try {
    const images = await getChapterImages(id);
    return c.json({
      data: {
        chapterId: id,
        images,
        count: images.length
      }
    });
  } catch (err) {
    const detail = err instanceof UpstreamError ? err.message : String(err);
    return c.json({
      data: { chapterId: id, images: [], count: 0 },
      error: 'WeebCentral is unreachable from this server',
      detail,
    }, 502);
  }
});

// High-speed Streaming image proxy with multi-upstream anti-hotlink bypass
app.get('/api/proxy/image', async (c) => {
  const url = c.req.query('url');
  if (!url) {
    return c.text('Missing url parameter', 400);
  }

  try {
    const isMangaDex = url.includes('mangadex.org') || url.includes('mangadex.network');
    const isMangaPill = url.includes('readdetectiveconan.com') || url.includes('mangapill');
    const isComicK = url.includes('comick.pictures') || url.includes('comick');
    const isMangaRead = url.includes('mangaread.org');

    let referer = 'https://weebcentral.com/';
    if (isMangaDex) referer = 'https://mangadex.org/';
    else if (isMangaPill) referer = 'https://mangapill.com/';
    else if (isComicK) referer = 'https://comick.live/';
    else if (isMangaRead) referer = 'https://www.mangaread.org/';

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': referer,
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    const candidates = [
      url,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://translate.google.com/website?sl=auto&tl=en&hl=en&u=${encodeURIComponent(url)}`,
    ];

    let upstreamRes: Response | null = null;
    let lastStatus = 0;
    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate, {
          headers,
          signal: AbortSignal.timeout(20_000),
        });
        if (res.ok) {
          upstreamRes = res;
          break;
        }
        lastStatus = res.status;
      } catch (err) {
        console.warn('Image proxy transport failed:', candidate.slice(0, 60), err);
      }
    }

    if (!upstreamRes) {
      return c.text(`Upstream image failed: ${lastStatus || 'unreachable'}`, 502);
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const cacheControl = 'public, max-age=604800, immutable';

    c.header('Content-Type', contentType);
    c.header('Cache-Control', cacheControl);

    if (upstreamRes.body) {
      return c.body(upstreamRes.body as any);
    }

    const buffer = await upstreamRes.arrayBuffer();
    return c.body(buffer);
  } catch (err) {
    console.error('Image proxy stream error:', err);
    return c.text('Image proxy failed', 500);
  }
});

// Serve frontend static assets from dist
app.use('/*', serveStatic({ root: './dist' }));
app.get('*', (c) => {
  try {
    const indexPath = path.resolve('./dist/index.html');
    if (fs.existsSync(indexPath)) {
      return c.html(fs.readFileSync(indexPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to read dist/index.html:', e);
  }
  return c.text('KURSO SCROLL API is live. Build client with pnpm build.', 200);
});

const PORT = Number(process.env.PORT) || 3001;
console.log(`⚡ KURSO SCROLL Unified Server running on port ${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT
});

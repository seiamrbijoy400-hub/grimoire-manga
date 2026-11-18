import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import {
  searchMangaAdvanced,
  quickSearch,
  getMangaDetails,
  getChapterList,
  getChapterImages,
  ALL_AVAILABLE_TAGS,
  ALL_AVAILABLE_TYPES,
  ALL_AVAILABLE_STATUSES,
  AdvancedSearchFilter
} from './scraper.ts';
import {
  getMangaDexTrending,
  getMangaDexLatest,
  getMangaDexDetails,
  getMangaDexChapters,
  getMangaDexChapterImages,
  searchMangaDex
} from './mangadex.ts';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

// Health & Metadata check
app.get('/api/health', (c) => c.json({
  status: 'ok',
  service: 'KuroScroll Neo-Archive Manga Platform',
  version: '2026.2.0',
  engines: ['WeebCentral', 'MangaDex Safe Vault']
}));

// Filter options dictionary
app.get('/api/filters', (c) => {
  return c.json({
    data: {
      tags: ALL_AVAILABLE_TAGS,
      types: ALL_AVAILABLE_TYPES,
      statuses: ALL_AVAILABLE_STATUSES,
      sorts: ['Popularity', 'Latest Updates', 'Alphabet', 'Subscribers', 'Recently Added'],
      sources: [
        { id: 'all', label: '🌐 Unified Matrix', desc: 'Blended WeebCentral & MangaDex Safe' },
        { id: 'weebcentral', label: '⚡ WeebCentral Stream', desc: 'Raw scanlation stream' },
        { id: 'mangadex', label: '🛡️ MangaDex Safe Vault', desc: 'Curated safe global archive' },
      ]
    }
  });
});

// Advanced Search Endpoint (Multi-Source WeebCentral + MangaDex)
app.get('/api/search', async (c) => {
  const query = c.req.query('q') || '';
  const sort = c.req.query('sort') || 'Popularity';
  const order = (c.req.query('order') as 'Ascending' | 'Descending') || 'Descending';
  const offset = Number(c.req.query('offset')) || 0;
  const limit = Number(c.req.query('limit')) || 32;
  const quick = c.req.query('quick') === 'true';
  const source = c.req.query('source') || 'all';

  // Multi-value query parameters
  const typesParam = c.req.queries('type') || c.req.queries('types') || [];
  const statusParam = c.req.queries('status') || [];
  const includedTagsParam = c.req.queries('tag') || c.req.queries('included_tag') || [];
  const excludedTagsParam = c.req.queries('excluded_tag') || [];

  // 1. If explicit MangaDex source requested
  if (source === 'mangadex') {
    const mdResults = await searchMangaDex(query, offset, limit);
    return c.json({ data: mdResults, count: mdResults.length, offset, source: 'mangadex' });
  }

  // 2. WeebCentral Search
  const filter: AdvancedSearchFilter = {
    query,
    sort,
    order,
    types: typesParam.length > 0 ? typesParam : undefined,
    status: statusParam.length > 0 ? statusParam : undefined,
    includedTags: includedTagsParam.length > 0 ? includedTagsParam : undefined,
    excludedTags: excludedTagsParam.length > 0 ? excludedTagsParam : undefined,
    offset,
    limit,
  };

  try {
    const results = quick ? await quickSearch(query) : await searchMangaAdvanced(filter);
    
    // If WeebCentral returns empty and source is 'all', supplement with MangaDex Safe results
    if (results.length === 0 && source === 'all' && query) {
      const mdFallback = await searchMangaDex(query, offset, limit);
      return c.json({ data: mdFallback, count: mdFallback.length, offset, source: 'mangadex-fallback' });
    }

    return c.json({ data: results, count: results.length, offset, source: 'weebcentral' });
  } catch (err) {
    console.warn('WeebCentral search failed, falling back to MangaDex:', err);
    const mdFallback = await searchMangaDex(query, offset, limit);
    return c.json({ data: mdFallback, count: mdFallback.length, offset, source: 'mangadex-fallback' });
  }
});

// Trending manga shortcut (Supports source=mangadex | weebcentral | all)
app.get('/api/trending', async (c) => {
  const offset = Number(c.req.query('offset')) || 0;
  const limit = Number(c.req.query('limit')) || 32;
  const type = c.req.query('type');
  const source = c.req.query('source') || 'all';

  if (source === 'mangadex') {
    const mdResults = await getMangaDexTrending(offset, limit);
    return c.json({ data: mdResults, source: 'mangadex' });
  }

  try {
    const results = await searchMangaAdvanced({
      sort: 'Popularity',
      order: 'Descending',
      types: type ? [type] : undefined,
      offset,
      limit,
    });

    if (results.length === 0 && source === 'all') {
      const mdResults = await getMangaDexTrending(offset, limit);
      return c.json({ data: mdResults, source: 'mangadex-fallback' });
    }

    return c.json({ data: results, source: 'weebcentral' });
  } catch (err) {
    console.warn('Trending fallback to MangaDex:', err);
    const mdResults = await getMangaDexTrending(offset, limit);
    return c.json({ data: mdResults, source: 'mangadex-fallback' });
  }
});

// Latest updates shortcut
app.get('/api/latest', async (c) => {
  const offset = Number(c.req.query('offset')) || 0;
  const limit = Number(c.req.query('limit')) || 32;
  const type = c.req.query('type');
  const source = c.req.query('source') || 'all';

  if (source === 'mangadex') {
    const mdResults = await getMangaDexLatest(offset, limit);
    return c.json({ data: mdResults, source: 'mangadex' });
  }

  try {
    const results = await searchMangaAdvanced({
      sort: 'Latest Updates',
      order: 'Descending',
      types: type ? [type] : undefined,
      offset,
      limit,
    });
    return c.json({ data: results, source: 'weebcentral' });
  } catch (err) {
    console.warn('Latest fallback to MangaDex:', err);
    const mdResults = await getMangaDexLatest(offset, limit);
    return c.json({ data: mdResults, source: 'mangadex-fallback' });
  }
});

// Manga details (Automatically routes md: prefix to MangaDex)
app.get('/api/manga/:id', async (c) => {
  const id = c.req.param('id');

  if (id.startsWith('md:')) {
    const rawId = id.slice(3);
    const mdDetails = await getMangaDexDetails(rawId);
    if (!mdDetails) {
      return c.json({ error: 'MangaDex manga not found' }, 404);
    }
    return c.json({ data: mdDetails });
  }

  const details = await getMangaDetails(id);
  if (!details) {
    return c.json({ error: 'Manga not found' }, 404);
  }
  return c.json({ data: details });
});

// Chapter list for manga (Automatically routes md: prefix to MangaDex)
app.get('/api/manga/:id/chapters', async (c) => {
  const id = c.req.param('id');

  if (id.startsWith('md:')) {
    const rawId = id.slice(3);
    const mdChapters = await getMangaDexChapters(rawId);
    return c.json({ data: mdChapters });
  }

  const chapters = await getChapterList(id);
  return c.json({ data: chapters });
});

// Chapter images (Automatically routes md: prefix to MangaDex)
app.get('/api/chapter/:id', async (c) => {
  const id = c.req.param('id');

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

  const images = await getChapterImages(id);
  return c.json({
    data: {
      chapterId: id,
      images,
      count: images.length
    }
  });
});

// High-speed Streaming image proxy with multi-upstream anti-hotlink bypass
app.get('/api/proxy/image', async (c) => {
  const url = c.req.query('url');
  if (!url) {
    return c.text('Missing url parameter', 400);
  }

  try {
    const isMangaDex = url.includes('mangadex.org') || url.includes('mangadex.network');

    const headers: Record<string, string> = isMangaDex
      ? {
          'User-Agent': 'KuroScroll-Proxy/2026.1 (Linux; Android; Termux)',
          'Referer': 'https://mangadex.org/',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        }
      : {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://weebcentral.com/',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
        };

    const upstreamRes = await fetch(url, { headers });

    if (!upstreamRes.ok) {
      return c.text(`Upstream image failed: ${upstreamRes.status}`, 502);
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const cacheControl = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';

    c.header('Content-Type', contentType);
    c.header('Cache-Control', cacheControl);

    const buffer = await upstreamRes.arrayBuffer();
    return c.body(buffer);
  } catch (err) {
    console.error('Image proxy error:', err);
    return c.text('Image proxy failed', 500);
  }
});

// Serve frontend static assets from dist
app.use('/*', serveStatic({ root: './dist' }));
app.get('*', serveStatic({ path: './dist/index.html' }));

// Dynamic Port for Local Termux, Render, Railway, Docker
const PORT = Number(process.env.PORT) || 3001;
console.log(`⚡ KuroScroll Neo-Archive Unified Server running on port ${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT
});

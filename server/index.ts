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
import {
  UpstreamError,
  probeTransports,
  getPreferredTransport,
} from './upstream.ts';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

// Health & Metadata check
app.get('/api/health', (c) => c.json({
  status: 'ok',
  service: 'KURSO SCROLL Manga Platform',
  version: '2026.2.1',
  engines: ['WeebCentral', 'MangaDex Safe Vault'],
  weebTransport: getPreferredTransport() ?? 'unknown'
}));

// Live connectivity report: which egress routes can reach WeebCentral from this host.
app.get('/api/diagnostics', async (c) => {
  const transports = await probeTransports();
  return c.json({
    ok: transports.some((t) => t.ok),
    preferred: getPreferredTransport(),
    transports,
    hint: 'Only "direct" working means the host is not blocked. Google/allorigins working means the fallback chain is healthy.'
  });
});

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
  const countryParam = c.req.query('country') || undefined;
  const langParam = c.req.query('lang') || undefined;

  const mdFilterOptions = {
    country: countryParam,
    lang: langParam,
    types: typesParam.length > 0 ? typesParam : undefined,
    status: statusParam.length > 0 ? statusParam : undefined,
  };

  // 1. If explicit MangaDex source requested
  if (source === 'mangadex') {
    const mdResults = !query
      ? (sort === 'Latest Updates' ? await getMangaDexLatest(offset, limit, mdFilterOptions) : await getMangaDexTrending(offset, limit, mdFilterOptions))
      : await searchMangaDex(query, offset, limit, mdFilterOptions);
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

    // If WeebCentral returns empty and source is 'all', supplement with MangaDex results
    if (results.length === 0 && source === 'all') {
      const mdFallback = !query
        ? (sort === 'Latest Updates' ? await getMangaDexLatest(offset, limit, mdFilterOptions) : await getMangaDexTrending(offset, limit, mdFilterOptions))
        : await searchMangaDex(query, offset, limit, mdFilterOptions);
      return c.json({ data: mdFallback, count: mdFallback.length, offset, source: 'mangadex-fallback' });
    }

    return c.json({ data: results, count: results.length, offset, source: 'weebcentral' });
  } catch (err) {
    const detail = err instanceof UpstreamError ? err.message : String(err);
    console.warn('WeebCentral search failed:', detail);

    // Explicit WeebCentral request: tell the truth instead of returning a bare empty list.
    if (source === 'weebcentral') {
      return c.json({
        data: [],
        count: 0,
        offset,
        source: 'weebcentral',
        error: 'WeebCentral is unreachable from this server',
        detail,
        attempts: err instanceof UpstreamError ? err.attempts : undefined,
      }, 502);
    }

    const mdFallback = !query
      ? (sort === 'Latest Updates' ? await getMangaDexLatest(offset, limit, mdFilterOptions) : await getMangaDexTrending(offset, limit, mdFilterOptions))
      : await searchMangaDex(query, offset, limit, mdFilterOptions);
    return c.json({
      data: mdFallback,
      count: mdFallback.length,
      offset,
      source: 'mangadex-fallback',
      degraded: true,
      detail,
    });
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
    const detail = err instanceof UpstreamError ? err.message : String(err);
    console.warn('Trending failed:', detail);
    if (source === 'weebcentral') {
      return c.json({ data: [], source: 'weebcentral', error: 'WeebCentral is unreachable from this server', detail }, 502);
    }
    const mdResults = await getMangaDexTrending(offset, limit);
    return c.json({ data: mdResults, source: 'mangadex-fallback', degraded: true, detail });
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
    if (results.length === 0 && source === 'all') {
      const mdResults = await getMangaDexLatest(offset, limit);
      return c.json({ data: mdResults, source: 'mangadex-fallback' });
    }
    return c.json({ data: results, source: 'weebcentral' });
  } catch (err) {
    const detail = err instanceof UpstreamError ? err.message : String(err);
    console.warn('Latest failed:', detail);
    if (source === 'weebcentral') {
      return c.json({ data: [], source: 'weebcentral', error: 'WeebCentral is unreachable from this server', detail }, 502);
    }
    const mdResults = await getMangaDexLatest(offset, limit);
    return c.json({ data: mdResults, source: 'mangadex-fallback', degraded: true, detail });
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

  try {
    const details = await getMangaDetails(id);
    if (!details) {
      return c.json({ error: 'Manga not found' }, 404);
    }
    return c.json({ data: details });
  } catch (err) {
    const detail = err instanceof UpstreamError ? err.message : String(err);
    return c.json({ error: 'WeebCentral is unreachable from this server', detail, data: null }, 502);
  }
});

// Chapter list for manga (Automatically routes md: prefix to MangaDex)
app.get('/api/manga/:id/chapters', async (c) => {
  const id = c.req.param('id');

  if (id.startsWith('md:')) {
    const rawId = id.slice(3);
    const mdChapters = await getMangaDexChapters(rawId);
    return c.json({ data: mdChapters });
  }

  try {
    const chapters = await getChapterList(id);
    return c.json({ data: chapters });
  } catch (err) {
    const detail = err instanceof UpstreamError ? err.message : String(err);
    return c.json({ data: [], error: 'WeebCentral is unreachable from this server', detail }, 502);
  }
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

    const headers: Record<string, string> = isMangaDex
      ? {
          'User-Agent': 'KursoScroll-Proxy/2026.2 (Linux; Android; Termux)',
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

    // Unbuffered Direct Stream: pipe upstream ReadableStream directly to socket
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

// Dynamic Port for Local Termux, Render, Railway, Docker
const PORT = Number(process.env.PORT) || 3001;
console.log(`⚡ KURSO SCROLL Unified Server running on port ${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT
});

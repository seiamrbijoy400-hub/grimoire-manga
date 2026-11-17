import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import {
  searchManga,
  quickSearch,
  getMangaDetails,
  getChapterList,
  getChapterImages
} from './scraper.ts';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

// API Routes
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'GrimoireX Manga API' }));

// Trending manga (Popularity sorted with pagination offset)
app.get('/api/trending', async (c) => {
  const offset = Number(c.req.query('offset')) || 0;
  const list = await searchManga('', 'Popularity', offset);
  return c.json({ data: list });
});

// Latest updates with pagination offset
app.get('/api/latest', async (c) => {
  const offset = Number(c.req.query('offset')) || 0;
  const list = await searchManga('', 'Latest Updates', offset);
  return c.json({ data: list });
});

// Search manga with pagination offset
app.get('/api/search', async (c) => {
  const q = c.req.query('q') || '';
  const sort = c.req.query('sort') || 'Popularity';
  const offset = Number(c.req.query('offset')) || 0;
  const quick = c.req.query('quick') === 'true';

  if (!q.trim() && !sort) {
    return c.json({ data: [] });
  }

  const results = quick ? await quickSearch(q) : await searchManga(q, sort, offset);
  return c.json({ data: results });
});

// Manga details
app.get('/api/manga/:id', async (c) => {
  const id = c.req.param('id');
  const details = await getMangaDetails(id);
  if (!details) {
    return c.json({ error: 'Manga not found' }, 404);
  }
  return c.json({ data: details });
});

// Chapter list for manga
app.get('/api/manga/:id/chapters', async (c) => {
  const id = c.req.param('id');
  const chapters = await getChapterList(id);
  return c.json({ data: chapters });
});

// Chapter images
app.get('/api/chapter/:id', async (c) => {
  const id = c.req.param('id');
  const images = await getChapterImages(id);
  return c.json({
    data: {
      chapterId: id,
      images,
      count: images.length
    }
  });
});

// Streaming image proxy with referrer spoofing
app.get('/api/proxy/image', async (c) => {
  const url = c.req.query('url');
  if (!url) {
    return c.text('Missing url parameter', 400);
  }

  try {
    const upstreamRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://weebcentral.com/'
      }
    });

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

const PORT = 3001;
console.log(`📜 GrimoireX Unified Server running on http://localhost:${PORT}`);
serve({
  fetch: app.fetch,
  port: PORT
});

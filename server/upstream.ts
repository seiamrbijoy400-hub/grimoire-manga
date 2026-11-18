/**
 * Resilient upstream layer for WeebCentral.
 *
 * Why this exists:
 * weebcentral.com sits behind Cloudflare bot protection that hard-blocks most
 * datacenter / cloud ASNs (Render, AWS, GCP...). A direct `fetch` from the
 * deployed server therefore returns 403 / an interstitial, while the same
 * request from a residential IP works fine.
 *
 * Instead of failing (and silently falling back to MangaDex), we try several
 * egress routes in order and remember the one that works:
 *
 *   1. direct       - plain request (works from Termux / residential IPs)
 *   2. proxy        - your own reverse proxy, e.g. the bundled Cloudflare Worker
 *                     (UPSTREAM_PROXY_URL / UPSTREAM_PROXY_URLS)
 *   3. google       - Google's public "website" translation relay (free, no key)
 *   4. allorigins   - public read-only CORS relay (free, no key, rate limited)
 *
 * Responses are cached in memory, so repeated navigation stays fast.
 */

const WEEB_ORIGIN = 'https://weebcentral.com';
const TRANSLATE_ORIGIN = 'https://weebcentral-com.translate.goog';

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

export type TransportName = 'direct' | 'proxy' | 'google' | 'allorigins';

const ALL_TRANSPORTS: TransportName[] = ['direct', 'proxy', 'google', 'allorigins'];

const TIMEOUT_MS: Record<TransportName, number> = {
  direct: 10_000,
  proxy: 20_000,
  google: 25_000,
  allorigins: 25_000,
};

const PROXY_URLS = (process.env.UPSTREAM_PROXY_URLS || process.env.UPSTREAM_PROXY_URL || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

export class UpstreamError extends Error {
  status = 502;
  attempts: { transport: TransportName; reason: string }[];

  constructor(message: string, attempts: { transport: TransportName; reason: string }[]) {
    super(message);
    this.name = 'UpstreamError';
    this.attempts = attempts;
  }
}

/** Last transport that produced a usable response; tried first from then on. */
let preferredTransport: TransportName | null = null;

export function getPreferredTransport(): TransportName | null {
  return preferredTransport;
}

function orderedTransports(method: string): TransportName[] {
  const forced = process.env.WEEB_TRANSPORT as TransportName | undefined;
  // Public relays only support GET, so POST goes direct or through your proxy.
  const allowed = ALL_TRANSPORTS.filter(
    (t) => method === 'GET' || t === 'direct' || t === 'proxy',
  );
  if (forced && allowed.includes(forced)) return [forced];
  if (!preferredTransport || !allowed.includes(preferredTransport)) return allowed;
  return [preferredTransport, ...allowed.filter((t) => t !== preferredTransport)];
}

function buildUrl(transport: TransportName, targetUrl: string): string | null {
  if (transport === 'direct') return targetUrl;

  if (transport === 'proxy') {
    if (PROXY_URLS.length === 0) return null;
    const base = PROXY_URLS[0];
    return `${base}${base.includes('?') ? '&' : '?'}url=${encodeURIComponent(targetUrl)}`;
  }

  if (transport === 'google') {
    if (!targetUrl.startsWith(WEEB_ORIGIN)) return null;
    const path = targetUrl.slice(WEEB_ORIGIN.length);
    const relay = `${TRANSLATE_ORIGIN}${path}`;
    const sep = relay.includes('?') ? '&' : '?';
    return `${relay}${sep}_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en`;
  }

  return `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
}

const BLOCK_MARKERS = [
  'Just a moment',
  'cf-browser-verification',
  'cf_chl_opt',
  'Attention Required',
  'Enable JavaScript and cookies to continue',
  'error code: 52',
  'error code: 10',
  'Cloudflare Ray ID',
];

function looksBlocked(body: string): boolean {
  const head = body.slice(0, 4000);
  if (BLOCK_MARKERS.some((m) => head.includes(m))) return true;
  // Cloudflare interstitials and proxy error pages are tiny documents.
  if (body.length < 1200 && /^\s*(\{|<!DOCTYPE|<html)/i.test(body)) {
    return !/weebcentral|weeb central/i.test(body);
  }
  return false;
}

interface FetchOptions {
  /** Extra headers for the upstream request (HX-Request, Content-Type...). */
  headers?: Record<string, string>;
  method?: string;
  body?: BodyInit | null;
  /** Cache TTL in ms. 0 disables caching. Defaults to 3 minutes. */
  ttl?: number;
  /** Regex the response body must match to be accepted. */
  expect?: RegExp;
  /** Skip the cache for this call. */
  noCache?: boolean;
}

interface CacheEntry {
  body: string;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 250;

function cacheGet(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  // Refresh LRU position.
  cache.delete(key);
  cache.set(key, hit);
  return hit.body;
}

function cacheSet(key: string, body: string, ttl: number) {
  if (ttl <= 0) return;
  cache.set(key, { body, expires: Date.now() + ttl });
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

async function requestOnce(
  transport: TransportName,
  targetUrl: string,
  opts: FetchOptions,
): Promise<string> {
  const url = buildUrl(transport, targetUrl);
  if (!url) throw new Error('transport not configured');

  const method = (opts.method || 'GET').toUpperCase();
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  // Relays fetch on their own behalf, so browser-fingerprint headers are noise.
  if (transport === 'google' || transport === 'allorigins') {
    delete headers['Sec-Fetch-Site'];
    delete headers['Sec-Fetch-Mode'];
    delete headers['Sec-Fetch-Dest'];
  }
  Object.assign(headers, opts.headers || {});

  const res = await fetch(url, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : opts.body,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS[transport]),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
  if (!text || text.length < 40) throw new Error('empty response');
  if (looksBlocked(text)) throw new Error('blocked by Cloudflare/proxy interstitial');
  if (opts.expect && !opts.expect.test(text)) throw new Error('unexpected response body');

  return text;
}

/**
 * Fetch a WeebCentral URL (HTML or HTMX partial) through whichever egress works.
 * Throws UpstreamError when every transport fails.
 */
export async function fetchWeebHtml(targetUrl: string, opts: FetchOptions = {}): Promise<string> {
  const method = (opts.method || 'GET').toUpperCase();
  const ttl = opts.ttl ?? 3 * 60_000;
  const cacheKey = `${method} ${targetUrl} ${opts.body ? String(opts.body) : ''}`;

  if (!opts.noCache) {
    const hit = cacheGet(cacheKey);
    if (hit !== null) return hit;
  }

  const attempts: { transport: TransportName; reason: string }[] = [];

  for (const transport of orderedTransports(method)) {
    if (buildUrl(transport, targetUrl) === null) {
      attempts.push({ transport, reason: 'not configured' });
      continue;
    }
    try {
      const text = await requestOnce(transport, targetUrl, opts);
      preferredTransport = transport;
      cacheSet(cacheKey, text, ttl);
      return text;
    } catch (err: any) {
      attempts.push({ transport, reason: err?.message || String(err) });
    }
  }

  const detail = attempts.map((a) => `${a.transport}: ${a.reason}`).join(' | ');
  console.error(`[weeb] all transports failed for ${targetUrl} -> ${detail}`);
  throw new UpstreamError(`WeebCentral unreachable (${detail})`, attempts);
}

/** Health probe for /api/diagnostics. */
export async function probeTransports(sampleUrl = `${WEEB_ORIGIN}/search/data?text=one&limit=1`): Promise<
  { transport: TransportName; ok: boolean; ms: number; reason?: string }[]
> {
  return Promise.all(
    ALL_TRANSPORTS.map(async (transport) => {
      const started = Date.now();
      if (buildUrl(transport, sampleUrl) === null) {
        return { transport, ok: false, ms: 0, reason: 'not configured' };
      }
      try {
        await requestOnce(transport, sampleUrl, {});
        return { transport, ok: true, ms: Date.now() - started };
      } catch (err: any) {
        return { transport, ok: false, ms: Date.now() - started, reason: err?.message || String(err) };
      }
    }),
  );
}

/**
 * Normalise links coming back from a relay.
 * Google's relay rewrites hrefs to `weebcentral-com.translate.goog/...?_x_tr_...`
 * and images to `translate.google.com/website?...&u=<real url>`.
 */
export function normalizeWeebUrl(href: string): string {
  if (!href) return '';
  let url = href.trim();

  const relayImage = url.match(/translate\.google\.com\/website\?(.*)$/i);
  if (relayImage) {
    const params = new URLSearchParams(relayImage[1]);
    const real = params.get('u');
    if (real) url = real;
  }

  url = url.replace(/^https?:\/\/weebcentral-com\.translate\.goog/i, WEEB_ORIGIN);
  url = url.replace(/^\/\//, 'https://');

  return url;
}

/** Normalise + strip query/hash, returning an origin-relative path. */
export function weebPath(href: string): string {
  const url = normalizeWeebUrl(href).split('#')[0].split('?')[0];
  const hostMatch = url.match(/^https?:\/\/[^/]+(\/.*)$/);
  return hostMatch ? hostMatch[1] : url;
}

/** Pick the first usable URL out of a src/srcset and unwrap relay rewrites. */
export function pickImageUrl(raw: string | undefined | null): string {
  if (!raw) return '';
  const first = raw.split(',')[0].trim().split(/\s+/)[0];
  const url = normalizeWeebUrl(first);
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${WEEB_ORIGIN}${url}`;
  return url;
}

export { WEEB_ORIGIN, DEFAULT_HEADERS };

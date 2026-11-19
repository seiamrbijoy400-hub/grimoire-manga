/**
 * 🛡️ Cloudflare Bypass Reverse Proxy Worker
 *
 * Deploy this free on Cloudflare Workers (dash.cloudflare.com -> Workers & Pages -> Create Worker)
 * When deployed, paste your worker URL into Render/Vercel Environment Variables:
 * UPSTREAM_PROXY_URL=https://your-worker-name.your-subdomain.workers.dev
 *
 * Cloudflare Workers run inside Cloudflare's own internal network edge,
 * meaning WeebCentral's Cloudflare protection NEVER returns 403 Forbidden!
 */

export default {
  async fetch(request, env, ctx) {
    // Enable CORS for your frontend / backend
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: "Missing ?url= parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const upstreamHeaders = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://weebcentral.com/",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
      };

      // Forward the headers the scraper relies on (HTMX partials, form posts)
      const forwardedContentType = request.headers.get("Content-Type");
      if (forwardedContentType) {
        upstreamHeaders["Content-Type"] = forwardedContentType;
      }
      if (request.headers.get("HX-Request")) {
        upstreamHeaders["HX-Request"] = request.headers.get("HX-Request");
      }

      const hasBody = !["GET", "HEAD"].includes(request.method);
      const upstreamResponse = await fetch(targetUrl, {
        method: request.method,
        headers: upstreamHeaders,
        body: hasBody ? await request.arrayBuffer() : undefined,
      });

      const responseHeaders = new Headers(upstreamResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      if (request.method === "GET") {
        responseHeaders.set(
          "Cache-Control",
          "public, max-age=3600, s-maxage=86400"
        );
      } else {
        responseHeaders.set("Cache-Control", "no-store");
      }

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Worker upstream error", message: err.message }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};

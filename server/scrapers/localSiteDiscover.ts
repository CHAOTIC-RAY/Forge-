import axios from 'axios';
import * as cheerio from 'cheerio';

export interface DiscoveredLink {
  url: string;
  title?: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function normalizeUrl(href: string): string {
  const u = new URL(href);
  u.hash = '';
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.slice(0, -1);
  }
  return u.href;
}

function isAssetUrl(url: string): boolean {
  return /\.(pdf|jpg|jpeg|png|gif|webp|css|js|zip|svg|ico|woff2?|mp4|mp3)(\?|$)/i.test(url);
}

/**
 * BFS link discovery without Firecrawl — same-origin crawl from a seed URL.
 */
export async function discoverSiteLinks(
  startUrl: string,
  opts: { limit?: number; maxDepth?: number } = {}
): Promise<DiscoveredLink[]> {
  const limit = Math.min(opts.limit ?? 500, 2000);
  const maxDepth = opts.maxDepth ?? 3;

  let origin: URL;
  try {
    origin = new URL(startUrl);
  } catch {
    return [];
  }

  const seen = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: normalizeUrl(startUrl), depth: 0 }];
  const results: DiscoveredLink[] = [];

  while (queue.length > 0 && results.length < limit) {
    const { url, depth } = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);

    try {
      const response = await axios.get(url, {
        timeout: 18_000,
        maxRedirects: 5,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
        validateStatus: (s) => s < 400,
      });
      if (typeof response.data !== 'string') continue;

      const $ = cheerio.load(response.data);
      const title = $('title').first().text().replace(/\s+/g, ' ').trim() || undefined;
      results.push({ url, title });

      if (depth >= maxDepth) continue;

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        try {
          const abs = new URL(href, url);
          if (abs.origin !== origin.origin) return;
          const normalized = normalizeUrl(abs.href);
          if (!seen.has(normalized) && !isAssetUrl(normalized)) {
            queue.push({ url: normalized, depth: depth + 1 });
          }
        } catch {
          /* ignore bad href */
        }
      });
    } catch {
      if (results.length === 0 && url === normalizeUrl(startUrl)) {
        results.push({ url });
      }
    }
  }

  return results;
}

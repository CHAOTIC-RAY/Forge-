/**
 * Dependency-free HTML helpers for Cloudflare Worker scrape/map fallbacks.
 */

export function extractLinksFromHtml(
  html: string,
  baseUrl: string
): Array<{ url: string; title?: string }> {
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [];
  }

  const links = new Map<string, { url: string; title?: string }>();
  const re = /<a\s[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
    try {
      const abs = new URL(href, baseUrl).href;
      if (!abs.startsWith(origin)) continue;
      if (/\.(pdf|jpg|jpeg|png|gif|webp|css|js|zip|svg|ico|woff2?)(\?|$)/i.test(abs)) continue;
      const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
      links.set(abs, { url: abs, title: text || undefined });
    } catch {
      /* ignore */
    }
  }
  return Array.from(links.values());
}

export function htmlToSimpleMarkdown(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  const withBreaks = stripped
    .replace(/<\/(p|div|h1|h2|h3|h4|li|br|tr)>/gi, '\n')
    .replace(/<h1[^>]*>/gi, '\n# ')
    .replace(/<h2[^>]*>/gi, '\n## ')
    .replace(/<h3[^>]*>/gi, '\n### ');
  const text = withBreaks
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 120_000);
}

export async function discoverLinksWorker(
  startUrl: string,
  limit = 200,
  maxDepth = 2
): Promise<Array<{ url: string; title?: string }>> {
  let origin: URL;
  try {
    origin = new URL(startUrl);
  } catch {
    return [];
  }

  const seen = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
  const results: Array<{ url: string; title?: string }> = [];

  while (queue.length > 0 && results.length < limit) {
    const { url, depth } = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ForgeCatalogue/1.0; +https://forge.app)',
          Accept: 'text/html',
        },
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim();
      results.push({ url, title });

      if (depth >= maxDepth) continue;
      const found = extractLinksFromHtml(html, url);
      for (const link of found) {
        if (!seen.has(link.url)) queue.push({ url: link.url, depth: depth + 1 });
      }
    } catch {
      if (results.length === 0) results.push({ url });
    }
  }

  return results;
}

/**
 * Client helpers for Firecrawl fetch during catalogue import.
 */

export interface CrawlStartOptions {
  url: string;
  limit?: number;
  apiKey?: string;
  includePaths?: string[];
  excludePaths?: string[];
}

export interface ScrapePageResult {
  url: string;
  markdown?: string;
  metadata?: { title?: string };
  provider?: 'firecrawl' | 'crawlee' | 'cloudscraper' | 'cheerio';
  error?: string;
}

export async function startCrawlJob(opts: CrawlStartOptions): Promise<{ id?: string; success?: boolean; error?: string }> {
  const res = await fetch('/api/crawl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  return res.json();
}

export async function pollCrawlJob(
  jobId: string,
  apiKey?: string
): Promise<{ status?: string; data?: any[]; error?: string }> {
  const apiKeyParam = apiKey ? `?apiKey=${encodeURIComponent(apiKey)}` : '';
  const res = await fetch(`/api/crawl/${jobId}${apiKeyParam}`);
  return res.json();
}

export async function scrapePageMarkdown(
  url: string,
  apiKey?: string,
  options?: { onlyMainContent?: boolean; waitFor?: number }
): Promise<ScrapePageResult> {
  const res = await fetch('/api/firecrawl-scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, apiKey, ...options }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    return { url, error: data.error || data.details || 'Scrape failed' };
  }
  return {
    url,
    markdown: data.data?.markdown,
    metadata: data.data?.metadata,
    provider: data.provider,
  };
}

export async function scrapeUrlBatch(
  urls: string[],
  apiKey?: string,
  onProgress?: (done: number, total: number, lastUrl: string) => void
): Promise<ScrapePageResult[]> {
  const res = await fetch('/api/firecrawl-scrape-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, apiKey, onlyMainContent: true, waitFor: 5000 }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.details || 'Batch scrape failed');
  }
  const results: ScrapePageResult[] = data.results || [];
  if (onProgress) onProgress(results.length, urls.length, urls[urls.length - 1] || '');
  return results;
}

export async function mapSite(
  url: string,
  apiKey?: string,
  limit = 5000
): Promise<{ success?: boolean; links?: Array<{ url: string; title?: string }>; error?: string }> {
  const res = await fetch('/api/map', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, limit, apiKey }),
  });
  return res.json();
}

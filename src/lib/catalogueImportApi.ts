/**
 * Client helpers for Firecrawl fetch during catalogue import.
 */

export interface CrawlStartOptions {
  url: string;
  limit?: number;
  apiKey?: string;
  scrapegraphApiKey?: string;
  useCrawl4ai?: boolean;
  useLlmReader?: boolean;
  includePaths?: string[];
  excludePaths?: string[];
}

export interface ScrapeRequestKeys {
  firecrawlApiKey?: string;
  scrapegraphApiKey?: string;
  useCrawl4ai?: boolean;
  useLlmReader?: boolean;
}

export interface ScrapePageResult {
  url: string;
  markdown?: string;
  metadata?: { title?: string };
  provider?:
    | 'firecrawl'
    | 'scrapegraph'
    | 'crawl4ai'
    | 'llm-reader'
    | 'crawlee'
    | 'cloudscraper'
    | 'cheerio'
    | 'fetch';
  error?: string;
}

function resolveScrapeKeys(keys?: ScrapeRequestKeys | string): ScrapeRequestKeys {
  if (typeof keys === 'string') {
    return { firecrawlApiKey: keys };
  }
  return keys || {};
}

function buildScrapePayload(
  payload: Record<string, unknown>,
  keys?: ScrapeRequestKeys | string
) {
  const resolved = resolveScrapeKeys(keys);
  return {
    ...payload,
    apiKey: resolved.firecrawlApiKey,
    scrapegraphApiKey: resolved.scrapegraphApiKey,
    useCrawl4ai: resolved.useCrawl4ai,
    useLlmReader: resolved.useLlmReader,
  };
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
  keys?: ScrapeRequestKeys | string,
  options?: { onlyMainContent?: boolean; waitFor?: number }
): Promise<ScrapePageResult> {
  const res = await fetch('/api/firecrawl-scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildScrapePayload({ url, ...options }, keys)),
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
  keys?: ScrapeRequestKeys | string,
  onProgress?: (done: number, total: number, lastUrl: string) => void
): Promise<ScrapePageResult[]> {
  const res = await fetch('/api/firecrawl-scrape-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      buildScrapePayload({ urls, onlyMainContent: true, waitFor: 5000 }, keys)
    ),
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
): Promise<{
  success?: boolean;
  links?: Array<{ url: string; title?: string }>;
  error?: string;
  provider?: 'firecrawl' | 'local';
  message?: string;
}> {
  const res = await fetch('/api/map', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, limit, apiKey }),
  });
  return res.json();
}

export function scrapeKeysFromSettings(settings: {
  firecrawlApiKey?: string;
  scrapegraphApiKey?: string;
  catalogueScrapeUseCrawl4ai?: boolean;
  catalogueScrapeUseLlmReader?: boolean;
}): ScrapeRequestKeys {
  return {
    firecrawlApiKey: settings.firecrawlApiKey || undefined,
    scrapegraphApiKey: settings.scrapegraphApiKey || undefined,
    useCrawl4ai: settings.catalogueScrapeUseCrawl4ai !== false,
    useLlmReader: settings.catalogueScrapeUseLlmReader !== false,
  };
}

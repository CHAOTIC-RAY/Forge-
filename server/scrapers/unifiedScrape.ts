import axios from 'axios';
import { htmlToMarkdown } from './htmlToMarkdown.js';

export type ScrapeProvider = 'firecrawl' | 'crawlee' | 'cloudscraper' | 'cheerio';

export interface UnifiedScrapeResult {
  markdown?: string;
  metadata?: { title?: string; sourceURL?: string };
  provider?: ScrapeProvider;
  error?: string;
}

async function cheerioFetchMarkdown(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 25_000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      validateStatus: (s) => s < 500,
    });
    if (response.status >= 400 || typeof response.data !== 'string') return null;
    return htmlToMarkdown(response.data);
  } catch {
    return null;
  }
}

async function firecrawlScrape(
  url: string,
  apiKey: string,
  onlyMainContent: boolean,
  waitFor: number
): Promise<UnifiedScrapeResult | null> {
  try {
    const response = await axios.post(
      'https://api.firecrawl.dev/v2/scrape',
      { url, formats: ['markdown'], onlyMainContent, waitFor },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60_000,
      }
    );
    const markdown = response.data?.data?.markdown;
    if (markdown) {
      return {
        markdown,
        metadata: response.data?.data?.metadata,
        provider: 'firecrawl',
      };
    }
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: unknown }; message?: string }).response?.data;
    console.warn('[Firecrawl] fallback:', msg || (err as Error).message);
  }
  return null;
}

/**
 * Scrape a URL for catalogue markdown: Firecrawl → Crawlee → cloudscraper → cheerio.
 */
export async function scrapeWithProviders(
  url: string,
  opts: {
    apiKey?: string;
    onlyMainContent?: boolean;
    waitFor?: number;
    skipFirecrawl?: boolean;
  } = {}
): Promise<UnifiedScrapeResult> {
  const onlyMainContent = opts.onlyMainContent ?? true;
  const waitFor = opts.waitFor ?? 5000;
  const rawKey = opts.apiKey || process.env.FIRECRAWL_API_KEY;
  const firecrawlKey =
    typeof rawKey === 'string' ? rawKey.replace(/[^\x21-\x7E]/g, '') : undefined;

  if (!opts.skipFirecrawl && firecrawlKey) {
    const fc = await firecrawlScrape(url, firecrawlKey, onlyMainContent, waitFor);
    if (fc?.markdown) return fc;
  }

  try {
    const { crawleeScrapeMarkdown } = await import('./crawleeScrape.js');
    const crawleeMd = await crawleeScrapeMarkdown(url);
    if (crawleeMd) {
      return { markdown: crawleeMd, provider: 'crawlee', metadata: { sourceURL: url } };
    }
  } catch (err) {
    console.warn('[Crawlee] import/run failed:', (err as Error).message);
  }

  try {
    const { cloudscraperScrapeMarkdown } = await import('./cloudscraperFetch.js');
    const csMd = await cloudscraperScrapeMarkdown(url);
    if (csMd) {
      return { markdown: csMd, provider: 'cloudscraper', metadata: { sourceURL: url } };
    }
  } catch (err) {
    console.warn('[cloudscraper] failed:', (err as Error).message);
  }

  const cheerioMd = await cheerioFetchMarkdown(url);
  if (cheerioMd) {
    return {
      markdown: cheerioMd,
      provider: 'cheerio',
      metadata: { sourceURL: url },
    };
  }

  return {
    error: 'All scrape providers failed (Firecrawl, Crawlee, cloudscraper, cheerio)',
  };
}

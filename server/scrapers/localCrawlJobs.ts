import { discoverSiteLinks } from './localSiteDiscover.js';
import { scrapeWithProviders } from './unifiedScrape.js';

export type LocalCrawlStatus = 'scraping' | 'completed' | 'failed';

export interface LocalCrawlPage {
  url: string;
  markdown?: string;
  metadata?: { title?: string; sourceURL?: string };
}

export interface LocalCrawlJob {
  id: string;
  status: LocalCrawlStatus;
  data: LocalCrawlPage[];
  error?: string;
  startedAt: number;
  updatedAt: number;
}

const jobs = new Map<string, LocalCrawlJob>();

const JOB_TTL_MS = 60 * 60 * 1000;

function pruneOldJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.updatedAt < cutoff) jobs.delete(id);
  }
}

function filterUrls(
  urls: string[],
  includePaths?: string[],
  excludePaths?: string[]
): string[] {
  let out = urls;
  if (includePaths?.length) {
    out = out.filter((u) => includePaths.some((p) => u.toLowerCase().includes(p.toLowerCase())));
  }
  if (excludePaths?.length) {
    out = out.filter((u) => !excludePaths.some((p) => u.toLowerCase().includes(p.toLowerCase())));
  }
  return out;
}

async function runLocalCrawl(
  id: string,
  opts: {
    url: string;
    limit?: number;
    includePaths?: string[];
    excludePaths?: string[];
    apiKey?: string;
    scrapegraphApiKey?: string;
  }
) {
  const job = jobs.get(id);
  if (!job) return;

  try {
    const discovered = await discoverSiteLinks(opts.url, {
      limit: Math.min((opts.limit || 50) * 3, 500),
      maxDepth: 3,
    });
    let urls = discovered.map((l) => l.url);
    urls = filterUrls(urls, opts.includePaths, opts.excludePaths);
    urls = urls.slice(0, opts.limit || 50);

    if (urls.length === 0) {
      urls = [opts.url];
    }

    for (const pageUrl of urls) {
      const result = await scrapeWithProviders(pageUrl, {
        apiKey: opts.apiKey,
        scrapegraphApiKey: opts.scrapegraphApiKey,
        skipFirecrawl: !opts.apiKey,
      });
      if (result.markdown) {
        job.data.push({
          url: pageUrl,
          markdown: result.markdown,
          metadata: result.metadata,
        });
      }
      job.updatedAt = Date.now();
      await new Promise((r) => setTimeout(r, 350));
    }

    job.status = 'completed';
    job.updatedAt = Date.now();
  } catch (e) {
    job.status = 'failed';
    job.error = (e as Error).message || 'Local crawl failed';
    job.updatedAt = Date.now();
  }
}

export function startLocalCrawl(opts: {
  url: string;
  limit?: number;
  includePaths?: string[];
  excludePaths?: string[];
  apiKey?: string;
  scrapegraphApiKey?: string;
}): string {
  pruneOldJobs();
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  jobs.set(id, {
    id,
    status: 'scraping',
    data: [],
    startedAt: now,
    updatedAt: now,
  });
  void runLocalCrawl(id, opts);
  return id;
}

export function getLocalCrawlJob(id: string): LocalCrawlJob | undefined {
  return jobs.get(id);
}

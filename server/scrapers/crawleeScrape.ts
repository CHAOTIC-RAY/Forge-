import { CheerioCrawler, Configuration } from 'crawlee';
import { htmlToMarkdown } from './htmlToMarkdown.js';

export async function crawleeScrapeMarkdown(url: string): Promise<string | null> {
  let markdown: string | null = null;

  const config = Configuration.getGlobalConfig();
  config.set('persistStorage', false);
  config.set('availableMemoryRatio', 0.5);

  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: 1,
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 45,
    async requestHandler({ $, body }) {
      const html = typeof body === 'string' ? body : $.html();
      markdown = htmlToMarkdown(html);
    },
  });

  try {
    await crawler.run([{ url }]);
    return markdown;
  } catch (err) {
    console.warn('[Crawlee] scrape failed:', (err as Error).message);
    return null;
  }
}

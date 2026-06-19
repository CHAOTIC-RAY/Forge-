export interface ScrapegraphScrapeResult {
  markdown?: string;
  metadata?: { title?: string; sourceURL?: string };
}

function sanitizeApiKey(raw?: string): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/[^\x21-\x7E]/g, '');
}

/**
 * Fetch page markdown via ScrapeGraphAI v2 /api/scrape.
 * @see https://docs.scrapegraphai.com/api-reference/endpoint/scrape
 */
export async function scrapegraphScrapeMarkdown(
  url: string,
  apiKey: string,
  waitFor = 5000
): Promise<ScrapegraphScrapeResult | null> {
  const key = sanitizeApiKey(apiKey);
  if (!key) return null;

  try {
    const response = await fetch('https://v2-api.scrapegraphai.com/api/scrape', {
      method: 'POST',
      headers: {
        'SGAI-APIKEY': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: [{ type: 'markdown', mode: 'reader' }],
        fetch_config: {
          wait: Math.min(Math.max(waitFor, 0), 30_000),
          mode: 'js',
        },
      }),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        detail = (errBody as { message?: string; error?: string }).message
          || (errBody as { message?: string; error?: string }).error
          || detail;
      } catch {
        /* ignore parse errors */
      }
      console.warn('[ScrapeGraphAI] request failed:', detail);
      return null;
    }

    const data = (await response.json()) as {
      results?: { markdown?: { data?: unknown[] } };
      metadata?: { title?: string; contentType?: string };
    };

    const markdownEntries = data?.results?.markdown?.data;
    const markdown = Array.isArray(markdownEntries) ? markdownEntries[0] : undefined;
    if (typeof markdown !== 'string' || !markdown.trim()) return null;

    return {
      markdown,
      metadata: {
        sourceURL: url,
        title: data?.metadata?.title,
      },
    };
  } catch (err) {
    console.warn('[ScrapeGraphAI] fallback:', (err as Error).message);
    return null;
  }
}

export function resolveScrapegraphApiKey(clientKey?: string): string | undefined {
  return sanitizeApiKey(clientKey || process.env.SCRAPEGRAPH_API_KEY);
}

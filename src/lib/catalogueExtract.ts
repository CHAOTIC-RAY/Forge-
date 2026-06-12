/**
 * Catalogue extraction: URL classification, markdown chunking, local-AI JSON extraction, normalize/dedupe.
 */

import { getAiSettings, generateAppJson, isLocalTextProvider, type HighStockProduct } from './gemini';
import { getContextBudget } from './localAiContext';

export type CatalogueMode = 'product' | 'info';
export type UrlPageKind = 'product_list' | 'product_detail' | 'content' | 'other';

export interface ClassifiedMapLink {
  url: string;
  title?: string;
  kind: UrlPageKind;
  pathSegment?: string;
}

export interface ExtractCatalogueOptions {
  markdown: string;
  pageUrl?: string;
  pageTitle?: string;
  mode: CatalogueMode;
  brandCategories?: string[];
  outlet?: string;
  forceLocal?: boolean;
  allowCloudFallback?: boolean;
  businessId?: string;
}

export interface ExtractCatalogueResult {
  items: HighStockProduct[];
  chunksProcessed: number;
  usedLocalAi: boolean;
}

export interface ImportReport {
  pagesProcessed: number;
  itemsExtracted: number;
  duplicatesSkipped: number;
  failures: { url: string; error: string }[];
}

const PRODUCT_LIST_PATTERNS = [
  /\/shop\/?$/i,
  /\/products?\/?$/i,
  /\/catalog\/?$/i,
  /\/collections?\/?$/i,
  /\/category\//i,
  /\/product-category\//i,
  /\/store\/?$/i,
  /post_type=product/i,
];

const PRODUCT_DETAIL_PATTERNS = [
  /\/product\//i,
  /\/products\/[^/]+$/i,
  /\/p\/[^/]+/i,
  /\/item\//i,
  /\/sku\//i,
];

const NOISE_PATTERNS = [
  /\/cart\/?/i,
  /\/checkout/i,
  /\/account/i,
  /\/login/i,
  /\/wp-admin/i,
  /\/privacy/i,
  /\/terms/i,
  /\/contact\/?$/i,
  /\.(pdf|jpg|png|gif|css|js)(\?|$)/i,
];

const CONTENT_PATTERNS = [
  /\/blog\//i,
  /\/news\//i,
  /\/article\//i,
  /\/docs?\//i,
  /\/about/i,
  /\/faq/i,
];

export function classifyUrl(url: string): UrlPageKind {
  try {
    const u = new URL(url);
    const path = `${u.pathname}${u.search}`.toLowerCase();
    if (NOISE_PATTERNS.some((p) => p.test(path))) return 'other';
    if (PRODUCT_DETAIL_PATTERNS.some((p) => p.test(path))) return 'product_detail';
    if (PRODUCT_LIST_PATTERNS.some((p) => p.test(path))) return 'product_list';
    if (CONTENT_PATTERNS.some((p) => p.test(path))) return 'content';
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length === 1 && segments[0].length > 2) return 'product_list';
    return 'other';
  } catch {
    return 'other';
  }
}

export function classifySiteMapLinks(
  links: Array<{ url: string; title?: string }>
): ClassifiedMapLink[] {
  return links.map((link) => {
    const kind = classifyUrl(link.url);
    let pathSegment: string | undefined;
    try {
      const segments = new URL(link.url).pathname.split('/').filter(Boolean);
      pathSegment = segments[0];
    } catch {
      /* ignore */
    }
    return { url: link.url, title: link.title, kind, pathSegment };
  });
}

export function buildCategoryCountsFromClassified(
  classified: ClassifiedMapLink[],
  baseUrl?: string
): Array<{ category: string; count: number; url?: string }> {
  const buckets: Record<string, number> = {
    product_list: 0,
    product_detail: 0,
    content: 0,
    other: 0,
  };
  classified.forEach((c) => {
    buckets[c.kind] = (buckets[c.kind] || 0) + 1;
  });
  const labels: Record<UrlPageKind, string> = {
    product_list: 'Product listing pages',
    product_detail: 'Product detail pages',
    content: 'Articles & content',
    other: 'Other pages',
  };
  return (Object.entries(buckets) as [UrlPageKind, number][])
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => ({
      category: labels[kind],
      count,
      url: baseUrl,
    }));
}

export function defaultImportQueue(classified: ClassifiedMapLink[]): string[] {
  const priority: UrlPageKind[] = ['product_list', 'product_detail', 'content'];
  const selected = new Set<string>();
  for (const kind of priority) {
    classified
      .filter((c) => c.kind === kind)
      .slice(0, 200)
      .forEach((c) => selected.add(c.url));
  }
  return Array.from(selected);
}

const CHUNK_SIZE = 7000;
const CHUNK_OVERLAP = 400;

export function splitMarkdownIntoChunks(markdown: string): string[] {
  const text = markdown.trim();
  if (!text) return [];
  if (text.length <= CHUNK_SIZE) return [text];

  const sections = text.split(/\n(?=#{1,3}\s)/);
  const chunks: string[] = [];
  let buffer = '';

  const flush = () => {
    if (buffer.trim()) chunks.push(buffer.trim());
    buffer = '';
  };

  for (const section of sections) {
    if ((buffer + section).length <= CHUNK_SIZE) {
      buffer += (buffer ? '\n' : '') + section;
    } else {
      flush();
      if (section.length <= CHUNK_SIZE) {
        buffer = section;
      } else {
        for (let i = 0; i < section.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
          chunks.push(section.slice(i, i + CHUNK_SIZE));
        }
      }
    }
  }
  flush();
  return chunks.length ? chunks : [text.slice(0, CHUNK_SIZE)];
}

function normalizeTitle(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

function resolveAbsoluteUrl(link: string | undefined, pageUrl?: string): string | undefined {
  if (!link?.trim()) return pageUrl;
  try {
    if (pageUrl) return new URL(link, pageUrl).href;
    return link;
  } catch {
    return link;
  }
}

export function normalizeCatalogueItem(
  raw: Record<string, unknown>,
  mode: CatalogueMode,
  pageUrl?: string,
  outlet?: string
): HighStockProduct | null {
  const title =
    normalizeTitle(raw.title) ||
    normalizeTitle(raw.name) ||
    normalizeTitle(raw.product_name);
  if (!title) return null;

  const type =
    normalizeTitle(raw.type) ||
    normalizeTitle(raw.category) ||
    (Array.isArray(raw.categories) && raw.categories[0]
      ? normalizeTitle(String(raw.categories[0]))
      : 'Uncategorized');

  const link = resolveAbsoluteUrl(
    typeof raw.link === 'string' ? raw.link : typeof raw.url === 'string' ? raw.url : undefined,
    pageUrl
  );

  const price =
    typeof raw.price === 'string'
      ? raw.price
      : typeof raw.price === 'number'
        ? String(raw.price)
        : undefined;

  const stockInfo =
    typeof raw.stockInfo === 'string'
      ? raw.stockInfo
      : mode === 'product'
        ? [raw.stock, raw.availability, price].filter(Boolean).join(' — ') || price
        : typeof raw.content === 'string'
          ? raw.content
          : typeof raw.summary === 'string'
            ? raw.summary
            : '';

  return {
    title,
    type: type || 'Uncategorized',
    link: link || pageUrl || '',
    stockInfo: stockInfo || (mode === 'product' ? '—' : ''),
    outlet: typeof raw.outlet === 'string' ? raw.outlet : outlet || 'Forge Enterprises',
    sku: typeof raw.sku === 'string' ? raw.sku : undefined,
    price,
    categories: Array.isArray(raw.categories)
      ? raw.categories.map(String)
      : undefined,
  };
}

export function dedupeCatalogueItems(items: HighStockProduct[]): HighStockProduct[] {
  const seen = new Set<string>();
  const out: HighStockProduct[] = [];
  for (const item of items) {
    const key = (
      item.link?.toLowerCase().trim() ||
      item.sku?.toLowerCase().trim() ||
      item.title.toLowerCase().trim()
    );
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function mergeUniqueCatalogue(
  existing: HighStockProduct[],
  incoming: HighStockProduct[]
): { merged: HighStockProduct[]; added: HighStockProduct[]; duplicatesSkipped: number } {
  const keys = new Set(
    existing.map(
      (p) =>
        p.link?.toLowerCase().trim() ||
        p.sku?.toLowerCase().trim() ||
        p.title.toLowerCase().trim()
    )
  );
  const added: HighStockProduct[] = [];
  let duplicatesSkipped = 0;
  for (const item of incoming) {
    const key =
      item.link?.toLowerCase().trim() ||
      item.sku?.toLowerCase().trim() ||
      item.title.toLowerCase().trim();
    if (!key || keys.has(key)) {
      duplicatesSkipped++;
      continue;
    }
    keys.add(key);
    added.push(item);
  }
  return { merged: [...existing, ...added], added, duplicatesSkipped };
}

function buildExtractionPrompt(
  chunk: string,
  opts: ExtractCatalogueOptions
): string {
  const cats =
    opts.brandCategories?.length ?
      opts.brandCategories.join(', ')
    : 'Furniture, Building Materials, Home Appliances, Electronics, Lighting, Hardware, Technical, Strategy, Research';

  const pageCtx = [
    opts.pageUrl ? `Page URL: ${opts.pageUrl}` : '',
    opts.pageTitle ? `Page title: ${opts.pageTitle}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (opts.mode === 'product') {
    return `Extract every product from this e-commerce page markdown.
${pageCtx}

Use Brand Kit categories when possible: ${cats}

Return a JSON array of objects with fields:
- title (required)
- type (category from list above)
- price (with currency if present)
- stockInfo (availability or stock note)
- link (absolute product URL; use page URL only if this chunk is a single product page)
- sku (optional)
- categories (optional string array)

Rules: ONLY the JSON array. No markdown. Skip nav/footer boilerplate. Empty array if no products.

Markdown:
${chunk}`;
  }

  return `Extract knowledge-base entries from this page markdown.
${pageCtx}

Use categories when possible: ${cats}

Return a JSON array of objects with fields:
- title (required)
- type (topic category)
- stockInfo (1-2 sentence summary)
- link (source URL)

Rules: ONLY the JSON array. No markdown. Empty array if nothing useful.

Markdown:
${chunk}`;
}

async function extractChunk(
  chunk: string,
  opts: ExtractCatalogueOptions
): Promise<Record<string, unknown>[]> {
  const settings = getAiSettings();
  const forceLocal =
    opts.forceLocal ??
    (settings.catalogueImportLocalOnly !== false && isLocalTextProvider(settings));
  const allowCloud =
    opts.allowCloudFallback ?? settings.catalogueImportCloudFallback !== false;

  const prompt = buildExtractionPrompt(chunk, opts);

  try {
    const parsed = await generateAppJson(prompt, {
      expectArray: true,
      forceLocal,
      businessId: opts.businessId,
    });
    if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
    if (parsed && typeof parsed === 'object') {
      const arr = (parsed as { items?: unknown[] }).items || (parsed as { products?: unknown[] }).products;
      if (Array.isArray(arr)) return arr as Record<string, unknown>[];
    }
    return [];
  } catch (e) {
    if (!allowCloud || forceLocal) throw e;
    const parsed = await generateAppJson(prompt, {
      expectArray: true,
      forceLocal: false,
      businessId: opts.businessId,
    });
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  }
}

export async function extractCatalogueFromMarkdown(
  opts: ExtractCatalogueOptions
): Promise<ExtractCatalogueResult> {
  const settings = getAiSettings();
  const budget = getContextBudget(settings.builtinModelId || null);
  const maxChunk =
    Math.min(CHUNK_SIZE, Math.floor(budget.maxInputChars * 0.55)) || CHUNK_SIZE;

  const md = typeof opts.markdown === 'string' ? opts.markdown : '';
  const rawChunks = splitMarkdownIntoChunks(md);
  const chunks = rawChunks.map((c) =>
    c.length > maxChunk ? c.slice(0, maxChunk) : c
  );

  const allRaw: Record<string, unknown>[] = [];
  const usedLocalAi =
    opts.forceLocal ??
    (settings.catalogueImportLocalOnly !== false && isLocalTextProvider(settings));

  for (const chunk of chunks) {
    const part = await extractChunk(chunk, opts);
    allRaw.push(...part);
  }

  const normalized = allRaw
    .map((r) => normalizeCatalogueItem(r, opts.mode, opts.pageUrl, opts.outlet))
    .filter((x): x is HighStockProduct => x !== null);

  return {
    items: dedupeCatalogueItems(normalized),
    chunksProcessed: chunks.length,
    usedLocalAi,
  };
}

export function pickBestUrlForCategory(
  classified: ClassifiedMapLink[],
  categoryLabel: string,
  fallbackBase?: string
): string | null {
  const slug = categoryLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const match = classified.find(
    (c) =>
      c.kind === 'product_list' &&
      c.url.toLowerCase().includes(slug)
  );
  if (match) return match.url;
  const anyList = classified.find((c) => c.kind === 'product_list');
  if (anyList) return anyList.url;
  if (fallbackBase) {
    return `${fallbackBase.replace(/\/$/, '')}/shop/`;
  }
  return null;
}

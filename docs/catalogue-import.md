# Catalogue import pipeline

How the Catalogue tab ingests website data into `HighStockProduct` records.

## Firestore collections

| Collection | Document ID | Contents |
|------------|-------------|----------|
| `inventory_products` | `{businessId}_{sanitizedTitle}` | Catalogue items (`title`, `type`, `price`, `stockInfo`, `link`, `outlet`, `sku`, …) |
| `inventory_category_counts` | `{businessId}_{category}` | Discovery buckets (`category`, `count`, `url`) |
| `inventory_maps` | `{businessId}` | Full site map link list from Firecrawl |
| `brand_overviews` | `{businessId}` | AI-generated brand summary (knowledge mode) |
| `catalogue_import_state` | `{businessId}` | Resume state: crawl job id, processed page count |

## API endpoints (server / worker)

- `POST /api/map` — Firecrawl v2 map (sitemap, up to 5000 URLs)
- `POST /api/crawl` — Start crawl job; supports `includePaths`, `excludePaths`, `limit`, `scrapeOptions`
- `GET /api/crawl/:id` — Poll crawl status and page markdown batches
- `POST /api/firecrawl-scrape` — Single-page markdown scrape
- `POST /api/firecrawl-scrape-batch` — Sequential batch scrape for selected URLs

## Client modules

- [`src/lib/catalogueExtract.ts`](../src/lib/catalogueExtract.ts) — URL classification, markdown chunking, local-AI extraction, normalize/dedupe
- [`src/components/LocalDbImportPanel.tsx`](../src/components/LocalDbImportPanel.tsx) — Import & sync UI (Discover → Fetch → Convert → Review → Advanced)

## Flows

1. **Discover** — Map site → classify URLs (`product_list`, `product_detail`, `content`, `other`) → build import queue
2. **Fetch** — Scrape selected URLs or crawl with path filters (Firecrawl API key required)
3. **Convert** — `extractCatalogueFromMarkdown` per page (local AI by default; optional cloud fallback in Settings)
4. **Review** — Preview pending items, then commit to Firestore
5. **Advanced** — Console paste, JSON upload, legacy category import

## Settings

- `firecrawlApiKey` — Website fetch only
- `catalogueImportLocalOnly` — Force local AI for conversion (`forceLocal`)
- `catalogueImportCloudFallback` — Allow cloud providers if local extraction fails

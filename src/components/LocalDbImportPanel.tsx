import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Globe, RefreshCw, Square, Sparkles, Upload, ClipboardPaste, Moon, Trash2, Filter,
  ChevronDown, Check, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { ForgeLoader } from './ForgeLoader';
import {
  HighStockProduct,
  CategoryCount,
  getAiSettings,
  generateAppJson,
  findProductsByCategory,
} from '../lib/gemini';
import {
  classifySiteMapLinks,
  buildCategoryCountsFromClassified,
  defaultImportQueue,
  extractCatalogueFromMarkdown,
  mergeUniqueCatalogue,
  type ClassifiedMapLink,
  type ImportReport,
  type UrlPageKind,
  pickBestUrlForCategory,
} from '../lib/catalogueExtract';
import { mapSite, startCrawlJob, pollCrawlJob, scrapeUrlBatch, scrapeKeysFromSettings } from '../lib/catalogueImportApi';
import {
  saveSiteMap,
  saveCategoryCounts,
  saveCatalogueImportState,
  fetchCatalogueImportState,
} from '../lib/catalogueSupabase';
import { Business } from '../data';
import type { DbMode } from '../types/localDb';

type ImportTab = 'discover' | 'fetch' | 'convert' | 'review' | 'advanced';

const TAB_LABELS: { id: ImportTab; label: string }[] = [
  { id: 'discover', label: 'Discover' },
  { id: 'fetch', label: 'Fetch' },
  { id: 'convert', label: 'Convert' },
  { id: 'review', label: 'Review' },
  { id: 'advanced', label: 'Advanced' },
];

const KIND_LABELS: Record<UrlPageKind, string> = {
  product_list: 'Listing',
  product_detail: 'Product',
  content: 'Content',
  other: 'Other',
};

export interface LocalDbImportPanelProps {
  dbMode: DbMode;
  activeBusiness?: Business | null;
  businessId?: string;
  userId: string | null;
  brandKitCategories: string[];
  products: HighStockProduct[];
  setProducts: React.Dispatch<React.SetStateAction<HighStockProduct[]>>;
  setHasSearched: (v: boolean) => void;
  syncProductsToFirestore: (items: HighStockProduct[]) => Promise<void>;
  manualUrl: string;
  setManualUrl: (u: string) => void;
  manualUrlInput: string;
  setManualUrlInput: (u: string) => void;
  siteMap: Array<{ url: string; title?: string }>;
  setSiteMap: React.Dispatch<React.SetStateAction<any[]>>;
  categoryCounts: CategoryCount[];
  setCategoryCounts: React.Dispatch<React.SetStateAction<CategoryCount[]>>;
  setHasCheckedCounts: (v: boolean) => void;
  onViewSiteMap?: () => void;
  onJsonFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LocalDbImportPanel({
  dbMode,
  activeBusiness,
  businessId,
  userId,
  brandKitCategories,
  products,
  setProducts,
  setHasSearched,
  syncProductsToFirestore,
  manualUrl,
  setManualUrl,
  manualUrlInput,
  setManualUrlInput,
  siteMap,
  setSiteMap,
  categoryCounts,
  setCategoryCounts,
  setHasCheckedCounts,
  onViewSiteMap,
  onJsonFileUpload,
}: LocalDbImportPanelProps) {
  const aiSettings = getAiSettings();
  const scrapeKeys = useMemo(
    () => scrapeKeysFromSettings(aiSettings),
    [aiSettings.firecrawlApiKey, aiSettings.scrapegraphApiKey]
  );
  const [importTab, setImportTab] = useState<ImportTab>('discover');
  const [logs, setLogs] = useState<string[]>([]);
  const [isCheckingCounts, setIsCheckingCounts] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlJobId, setCrawlJobId] = useState<string | null>(null);
  const [crawlProcessedCount, setCrawlProcessedCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ done: 0, total: 0 });
  const [isConverting, setIsConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState({ done: 0, total: 0 });
  const [classified, setClassified] = useState<ClassifiedMapLink[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [fetchedPages, setFetchedPages] = useState<
    Array<{ url: string; markdown: string; title?: string }>
  >([]);
  const [pendingReview, setPendingReview] = useState<HighStockProduct[]>([]);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [queueFilter, setQueueFilter] = useState<UrlPageKind | 'all'>('all');
  const [crawlLimit, setCrawlLimit] = useState(
    () => aiSettings.catalogueCrawlLimit || 100
  );
  const [isOvernightMode, setIsOvernightMode] = useState(false);
  const [consolePaste, setConsolePaste] = useState('');
  const [isProcessingPaste, setIsProcessingPaste] = useState(false);
  const [fetchingCategory, setFetchingCategory] = useState<string | null>(null);
  const crawlIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  useEffect(() => {
    if (siteMap.length > 0 && classified.length === 0) {
      const c = classifySiteMapLinks(siteMap);
      setClassified(c);
      setSelectedUrls(new Set(defaultImportQueue(c)));
    }
  }, [siteMap, classified.length]);

  useEffect(() => {
    if (!businessId) return;
    void fetchCatalogueImportState(businessId).then((state) => {
      if (!state) return;
      if (state.crawlJobId != null) setCrawlJobId(state.crawlJobId);
      if (typeof state.processedCount === 'number') setCrawlProcessedCount(state.processedCount);
    });
  }, [businessId]);

  const filteredQueue = useMemo(() => {
    if (queueFilter === 'all') return classified;
    return classified.filter((c) => c.kind === queueFilter);
  }, [classified, queueFilter]);

  const outletName = activeBusiness?.name || 'Forge Enterprises';

  const extractMeta = useMemo(
    () => ({
      brandCategories: brandKitCategories,
      outlet: outletName,
      businessId: businessId || undefined,
    }),
    [brandKitCategories, outletName, businessId]
  );

  const handleMapSite = async (force = false) => {
    if (!force && siteMap.length > 0 && categoryCounts.length > 0) {
      toast.info('Map already exists. Use force refresh if needed.');
      return;
    }
    const urlToMap = activeBusiness?.targetUrl || manualUrl;
    if (!urlToMap) {
      toast.error('Enter a source URL first.');
      return;
    }
    setIsCheckingCounts(true);
    addLog(`Mapping ${urlToMap}…`);
    try {
      const mapData = await mapSite(urlToMap, aiSettings.firecrawlApiKey, 5000);
      if (!mapData.success || !mapData.links) {
        throw new Error(mapData.error || 'Map failed');
      }
      const links = mapData.links;
      setSiteMap(links);
      const c = classifySiteMapLinks(links);
      setClassified(c);
      const counts = buildCategoryCountsFromClassified(c, urlToMap);
      setCategoryCounts(counts);
      setHasCheckedCounts(true);
      setSelectedUrls(new Set(defaultImportQueue(c)));

      if (userId && businessId) {
        await saveSiteMap(businessId, links);
        await saveCategoryCounts(businessId, counts);
      }
      const providerNote = mapData.provider === 'local' ? ' (no Firecrawl — local discovery)' : '';
      toast.success(`Mapped ${links.length} URLs${providerNote}`);
      addLog(`Map complete: ${links.length} URLs classified.`);
      setImportTab('discover');
    } catch (e: any) {
      toast.error(e.message);
      addLog(`Map error: ${e.message}`);
    } finally {
      setIsCheckingCounts(false);
    }
  };

  const toggleUrl = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedUrls(new Set(filteredQueue.map((c) => c.url)));
  };

  const processCrawlPages = async (pages: any[]) => {
    const report: ImportReport = {
      pagesProcessed: 0,
      itemsExtracted: 0,
      duplicatesSkipped: 0,
      failures: [],
    };
    const collected: HighStockProduct[] = [];

    for (const page of pages) {
      if (!page.markdown) continue;
      report.pagesProcessed++;
      try {
        const { items } = await extractCatalogueFromMarkdown({
          markdown: page.markdown,
          pageUrl: page.url || page.metadata?.sourceURL,
          pageTitle: page.metadata?.title,
          mode: dbMode,
          ...extractMeta,
        });
        collected.push(
          ...items.map((p) => ({
            ...p,
            link: p.link || page.url,
            outlet: p.outlet || outletName,
          }))
        );
        report.itemsExtracted += items.length;
      } catch (e: any) {
        report.failures.push({
          url: page.url || 'unknown',
          error: e.message || 'Extract failed',
        });
      }
    }

    const { added, duplicatesSkipped } = mergeUniqueCatalogue(products, collected);
    report.duplicatesSkipped = duplicatesSkipped;
    setPendingReview(added);
    setImportReport(report);
    if (added.length) setImportTab('review');
    return report;
  };

  const handleBatchFetch = async () => {
    const urls = Array.from(selectedUrls);
    if (!urls.length) {
      toast.error('Select URLs in Discover first.');
      return;
    }
    setIsFetching(true);
    setFetchProgress({ done: 0, total: urls.length });
    addLog(`Fetching ${urls.length} pages…`);
    try {
      const results = await scrapeUrlBatch(
        urls,
        scrapeKeys,
        (done, total) => setFetchProgress({ done, total })
      );
      const pages = results
        .filter((r) => r.markdown)
        .map((r) => ({
          url: r.url,
          markdown: r.markdown!,
          title: r.metadata?.title,
        }));
      setFetchedPages(pages);
      addLog(`Fetched ${pages.length} pages with markdown.`);
      toast.success(`Fetched ${pages.length} pages`);
      setImportTab('convert');
    } catch (e: any) {
      toast.error(e.message);
      addLog(`Fetch error: ${e.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleConvertFetched = async () => {
    if (!fetchedPages.length) {
      toast.error('Fetch pages first.');
      return;
    }
    setIsConverting(true);
    setConvertProgress({ done: 0, total: fetchedPages.length });
    const report: ImportReport = {
      pagesProcessed: 0,
      itemsExtracted: 0,
      duplicatesSkipped: 0,
      failures: [],
    };
    const collected: HighStockProduct[] = [];

    for (let i = 0; i < fetchedPages.length; i++) {
      const page = fetchedPages[i];
      setConvertProgress({ done: i + 1, total: fetchedPages.length });
      report.pagesProcessed++;
      try {
        const { items } = await extractCatalogueFromMarkdown({
          markdown: page.markdown,
          pageUrl: page.url,
          pageTitle: page.title,
          mode: dbMode,
          ...extractMeta,
        });
        collected.push(...items);
        report.itemsExtracted += items.length;
      } catch (e: any) {
        report.failures.push({ url: page.url, error: e.message });
      }
    }

    const { added, duplicatesSkipped } = mergeUniqueCatalogue(products, collected);
    report.duplicatesSkipped = duplicatesSkipped;
    setPendingReview(added);
    setImportReport(report);
    setIsConverting(false);
    if (added.length) {
      setImportTab('review');
      toast.success(`Ready to review ${added.length} new items`);
    } else {
      toast.info('No new items after conversion.');
    }
  };

  const handleCommitReview = async () => {
    if (!pendingReview.length) return;
    setProducts((prev) => [...prev, ...pendingReview]);
    setHasSearched(true);
    await syncProductsToFirestore(pendingReview);
    toast.success(`Added ${pendingReview.length} items to catalogue`);
    addLog(`Committed ${pendingReview.length} items.`);
    setPendingReview([]);
    setImportTab('discover');
  };

  const handleStartCrawl = async () => {
    if (!manualUrl) {
      toast.error('Enter a source URL.');
      return;
    }
    if (categoryCounts.length === 0 && siteMap.length === 0) {
      await handleMapSite();
    }
    setIsCrawling(true);
    setCrawlProcessedCount(0);
    const includePaths = ['/product', '/shop', '/products', '/collections', '/category'];
    const excludePaths = ['/cart', '/checkout', '/account', '/wp-admin'];
    try {
      const data = await startCrawlJob({
        url: manualUrl,
        limit: crawlLimit,
        apiKey: aiSettings.firecrawlApiKey,
        scrapegraphApiKey: aiSettings.scrapegraphApiKey,
        includePaths,
        excludePaths,
      });
      if (!data.success || !data.id) {
        throw new Error(data.error || 'Crawl start failed');
      }
      setCrawlJobId(data.id);
      addLog(`Crawl job ${data.id} started.`);
      if (userId && businessId) {
        await saveCatalogueImportState(businessId, {
          crawlJobId: data.id,
          processedCount: 0,
        });
      }
      pollCrawl(data.id);
    } catch (e: any) {
      toast.error(e.message);
      setIsCrawling(false);
    }
  };

  const pollCrawl = (jobId: string) => {
    if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
    let processed = crawlProcessedCount;

    crawlIntervalRef.current = setInterval(async () => {
      try {
        const data = await pollCrawlJob(jobId, aiSettings.firecrawlApiKey);
        if (data.data && data.data.length > processed + 15) {
          const batch = data.data.slice(processed, processed + 20);
          await processCrawlPages(batch);
          processed += batch.length;
          setCrawlProcessedCount(processed);
          if (userId && businessId) {
            await saveCatalogueImportState(businessId, {
              crawlJobId: jobId,
              processedCount: processed,
            });
          }
        }
        if (data.status === 'completed' || data.status === 'failed') {
          if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
          crawlIntervalRef.current = null;
          const remaining = data.data?.slice(processed) || [];
          if (remaining.length) await processCrawlPages(remaining);
          setIsCrawling(false);
          setCrawlJobId(null);
          addLog(data.status === 'completed' ? 'Crawl completed.' : `Crawl failed: ${data.error}`);
        }
      } catch (e: any) {
        if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
        setIsCrawling(false);
        toast.error(e.message);
      }
    }, 10000);
  };

  const handleStopCrawl = () => {
    if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
    setIsCrawling(false);
    setCrawlJobId(null);
    addLog('Crawl stopped.');
  };

  const handleFetchCategory = async (category: string) => {
    setFetchingCategory(category);
    const url =
      pickBestUrlForCategory(classified, category, manualUrl || activeBusiness?.targetUrl) ||
      manualUrl;
    if (url && classified.length > 0) {
      setIsFetching(true);
      try {
        const results = await scrapeUrlBatch([url], scrapeKeys);
        const page = results[0];
        if (page?.markdown) {
          const { items } = await extractCatalogueFromMarkdown({
            markdown: page.markdown,
            pageUrl: url,
            pageTitle: page.metadata?.title,
            mode: dbMode,
            ...extractMeta,
          });
          const { added } = mergeUniqueCatalogue(products, items);
          if (added.length) {
            setPendingReview(added);
            setImportTab('review');
            toast.success(`Extracted ${added.length} items from map URL`);
          }
        }
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setIsFetching(false);
      }
      setFetchingCategory(null);
      return;
    }

    try {
      const result = await findProductsByCategory(
        category,
        products.map((p) => p.title),
        undefined,
        activeBusiness?.targetUrl || manualUrl,
        activeBusiness || undefined
      );
      const unique = result.products.filter(
        (p) => !products.some((ex) => ex.title === p.title)
      );
      if (unique.length) {
        setPendingReview(unique);
        setImportTab('review');
      }
    } finally {
      setFetchingCategory(null);
    }
  };

  const handleConsolePaste = async () => {
    if (!consolePaste.trim()) return;
    setIsProcessingPaste(true);
    try {
      let data: unknown = JSON.parse(consolePaste.trim());
      if (typeof data === 'string') data = JSON.parse(data);
      const dataArray = Array.isArray(data) ? data : [data];
      const categoriesMap =
        (await generateAppJson(
          dbMode === 'product'
            ? `Categorize products into: ${brandKitCategories.join(', ') || 'General'}. Products: ${dataArray.map((p: any) => p.name || p.title).join(', ')}. Return JSON object name->category.`
            : `Categorize items. Return JSON object name->category.`,
          { expectArray: false, forceLocal: aiSettings.catalogueImportLocalOnly !== false }
        )) || {};

      const newItems: HighStockProduct[] = dataArray
        .map((item: any) => {
          const name = item.name || item.title || '';
          if (!name) return null;
          return {
            title: name,
            type: categoriesMap[name] || item.type || 'Uncategorized',
            link: item.link || manualUrl,
            stockInfo:
              dbMode === 'product'
                ? item.price || item.stock || ''
                : item.content || item.stockInfo || '',
            outlet: outletName,
            price: item.price,
          } as HighStockProduct;
        })
        .filter(Boolean) as HighStockProduct[];

      const { added } = mergeUniqueCatalogue(products, newItems);
      setPendingReview(added);
      setImportTab('review');
      setConsolePaste('');
      toast.success(`Parsed ${added.length} new items`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsProcessingPaste(false);
    }
  };

  return (
    <div className="glass-card p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-[#E9E9E7] dark:border-[#2E2E2E] pb-3">
        {TAB_LABELS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setImportTab(t.id)}
            className={cn(
              'px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors min-h-[36px]',
              importTab === t.id
                ? 'bg-brand text-white'
                : 'text-secondary-safe hover:bg-[#F7F7F5] dark:hover:bg-[#202020]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="url"
            placeholder={`Source URL (${aiSettings.targetUrl || 'https://example.com'})`}
            value={manualUrlInput}
            onChange={(e) => setManualUrlInput(e.target.value)}
            onBlur={() => setManualUrl(manualUrlInput || aiSettings.targetUrl || '')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setManualUrl(manualUrlInput || aiSettings.targetUrl || '');
            }}
            className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm focus:ring-2 focus:ring-brand/30 outline-none"
          />
          <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
        </div>
      </div>

      {importTab === 'discover' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => handleMapSite()}
              disabled={isCheckingCounts}
              className="px-4 py-2 bg-brand text-white rounded-[10px] text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {isCheckingCounts ? <ForgeLoader size={16} /> : <RefreshCw className="w-4 h-4" />}
              Map site
            </button>
            <button
              type="button"
              onClick={() => handleMapSite(true)}
              disabled={isCheckingCounts}
              className="px-3 py-2 border rounded-[10px] text-xs font-bold"
            >
              Force refresh
            </button>
            {siteMap.length > 0 && onViewSiteMap && (
              <button type="button" onClick={onViewSiteMap} className="text-xs font-bold text-brand hover:underline">
                View full map ({siteMap.length})
              </button>
            )}
          </div>

          {categoryCounts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categoryCounts.map((cat, idx) => (
                <div key={idx} className="p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[10px] text-sm">
                  <span className="font-bold text-[#37352F] dark:text-[#EBE9ED]">{cat.category}</span>
                  <span className="text-secondary-safe ml-2">{cat.count}</span>
                </div>
              ))}
            </div>
          )}

          {classified.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-secondary-safe">Queue filter:</span>
                {(['all', 'product_list', 'product_detail', 'content', 'other'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setQueueFilter(k)}
                    className={cn(
                      'px-2 py-1 rounded-[6px] text-[10px] font-bold',
                      queueFilter === k ? 'bg-brand-bg text-brand' : 'bg-[#EFEFED] dark:bg-[#2E2E2E]'
                    )}
                  >
                    {k === 'all' ? 'All' : KIND_LABELS[k]}
                  </button>
                ))}
                <button type="button" onClick={selectAllFiltered} className="text-[10px] font-bold text-brand ml-auto">
                  Select filtered ({filteredQueue.length})
                </button>
              </div>
              <div className="max-h-[280px] overflow-y-auto space-y-1 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] p-2">
                {filteredQueue.slice(0, 150).map((link) => (
                  <label
                    key={link.url}
                    className="flex items-center gap-2 p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#202020] rounded-[8px] cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUrls.has(link.url)}
                      onChange={() => toggleUrl(link.url)}
                      className="rounded"
                    />
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-brand-bg text-brand text-[9px] font-bold uppercase">
                      {KIND_LABELS[link.kind]}
                    </span>
                    <span className="truncate flex-1 font-mono text-[#37352F] dark:text-[#EBE9ED]">{link.url}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-secondary-safe">{selectedUrls.size} URLs selected for fetch</p>
            </>
          )}
        </div>
      )}

      {importTab === 'fetch' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-xs font-bold text-secondary-safe">
              Crawl limit
              <input
                type="number"
                min={10}
                max={200}
                value={crawlLimit}
                onChange={(e) => setCrawlLimit(Number(e.target.value) || 100)}
                className="block mt-1 w-24 px-2 py-1.5 border rounded-[8px] text-sm"
              />
            </label>
            {isCrawling ? (
              <button type="button" onClick={handleStopCrawl} className="px-4 py-2 bg-red-100 text-red-600 rounded-[10px] text-sm font-bold flex items-center gap-2">
                <Square className="w-3 h-3 fill-current" /> Stop crawl
              </button>
            ) : (
              <button type="button" onClick={handleStartCrawl} className="px-4 py-2 bg-brand text-white rounded-[10px] text-sm font-bold">
                Crawl with path filters
              </button>
            )}
            <button
              type="button"
              onClick={handleBatchFetch}
              disabled={isFetching || selectedUrls.size === 0}
              className="px-4 py-2 border border-brand text-brand rounded-[10px] text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {isFetching ? <ForgeLoader size={16} /> : <Download className="w-4 h-4" />}
              Scrape selected ({selectedUrls.size})
            </button>
          </div>
          {isFetching && (
            <p className="text-xs text-secondary-safe">
              Fetching… {fetchProgress.done}/{fetchProgress.total}
            </p>
          )}
          {fetchedPages.length > 0 && (
            <p className="text-xs text-brand font-bold">{fetchedPages.length} pages cached — go to Convert</p>
          )}
          {categoryCounts.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-[#F7F7F5] dark:bg-[#202020] rounded-[8px]">
              <span className="text-sm">{cat.category}</span>
              <button
                type="button"
                disabled={fetchingCategory === cat.category}
                onClick={() => handleFetchCategory(cat.category)}
                className="px-2 py-1 bg-brand text-white text-[10px] font-bold rounded-[6px] disabled:opacity-50"
              >
                {fetchingCategory === cat.category ? '…' : 'Import'}
              </button>
            </div>
          ))}
        </div>
      )}

      {importTab === 'convert' && (
        <div className="space-y-3">
          <p className="text-sm text-secondary-safe">
            {fetchedPages.length
              ? `${fetchedPages.length} pages ready. Local AI will extract catalogue items.`
              : 'Fetch pages first, or use Crawl (processing runs automatically on new batches).'}
          </p>
          <button
            type="button"
            onClick={handleConvertFetched}
            disabled={isConverting || !fetchedPages.length}
            className="px-4 py-2 bg-brand text-white rounded-[10px] text-sm font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {isConverting ? <ForgeLoader size={16} /> : <Sparkles className="w-4 h-4" />}
            Convert with local AI
          </button>
          {isConverting && (
            <p className="text-xs text-secondary-safe">
              Converting… {convertProgress.done}/{convertProgress.total}
            </p>
          )}
        </div>
      )}

      {importTab === 'review' && (
        <div className="space-y-3">
          <p className="text-sm font-bold">{pendingReview.length} items pending review</p>
          {importReport && (
            <div className="text-xs text-secondary-safe space-y-1 p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[10px]">
              <p>Pages processed: {importReport.pagesProcessed}</p>
              <p>Items extracted: {importReport.itemsExtracted}</p>
              <p>Duplicates skipped: {importReport.duplicatesSkipped}</p>
              {importReport.failures.length > 0 && (
                <p className="text-red-500">{importReport.failures.length} page errors</p>
              )}
            </div>
          )}
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {pendingReview.slice(0, 30).map((p) => (
              <div key={p.title + p.link} className="text-xs p-2 border rounded-[8px] flex justify-between gap-2">
                <span className="font-bold truncate">{p.title}</span>
                <span className="text-secondary-safe shrink-0">{p.type}</span>
              </div>
            ))}
            {pendingReview.length > 30 && (
              <p className="text-[10px] text-secondary-safe">+{pendingReview.length - 30} more</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCommitReview}
              disabled={!pendingReview.length}
              className="px-4 py-2 bg-brand text-white rounded-[10px] text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Save to catalogue
            </button>
            <button
              type="button"
              onClick={() => setPendingReview([])}
              className="px-4 py-2 border rounded-[10px] text-sm font-bold"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {importTab === 'advanced' && (
        <div className="space-y-4">
          <div className="bg-[#F7F7F5] dark:bg-[#202020] p-4 rounded-[12px] space-y-3">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <ClipboardPaste className="w-4 h-4 text-brand" /> Paste JSON
            </h4>
            <textarea
              value={consolePaste}
              onChange={(e) => setConsolePaste(e.target.value)}
              placeholder='[{"name":"Product", "price":"$10", "link":"..."}]'
              className="w-full h-24 px-3 py-2 border rounded-[10px] text-xs font-mono bg-white dark:bg-[#191919]"
            />
            <button
              type="button"
              onClick={handleConsolePaste}
              disabled={isProcessingPaste || !consolePaste.trim()}
              className="px-4 py-2 bg-brand text-white rounded-[10px] text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessingPaste ? <ForgeLoader size={16} /> : <Upload className="w-4 h-4" />}
              Import paste
            </button>
          </div>
          {onJsonFileUpload && (
            <div className="pt-3 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
              <p className="text-xs text-secondary-safe mb-2">Upload Firecrawl JSON export</p>
              <input
                type="file"
                accept=".json"
                multiple
                onChange={onJsonFileUpload}
                className="text-xs"
              />
            </div>
          )}
        </div>
      )}

      <div className="border-t border-[#E9E9E7] dark:border-[#2E2E2E] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase text-secondary-safe">Activity</span>
          <div className="flex items-center gap-2">
            <Moon className="w-3 h-3 text-secondary-safe" />
            <button
              type="button"
              onClick={() => setIsOvernightMode(!isOvernightMode)}
              className={cn('w-8 h-4 rounded-full relative', isOvernightMode ? 'bg-green-500' : 'bg-gray-300')}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all',
                  isOvernightMode ? 'left-4' : 'left-0.5'
                )}
              />
            </button>
            <button type="button" onClick={() => setLogs([])} className="p-1 hover:bg-[#F7F7F5] dark:hover:bg-[#202020] rounded">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="max-h-[120px] overflow-y-auto font-mono text-[10px] bg-[#F7F7F5] dark:bg-[#202020] p-2 rounded-[8px]">
          {logs.length === 0 ? (
            <span className="italic text-secondary-safe">No activity yet</span>
          ) : (
            logs.slice(-40).map((log, i) => <div key={i}>{log}</div>)
          )}
        </div>
      </div>
    </div>
  );
}

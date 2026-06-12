import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { ForgeLoader } from './ForgeLoader';
import { TabPageContent, TabPageHeader, TabHeaderSegments, TabPageShell } from './ui/TabPageHeader';
import {
  X,
  Search,
  ExternalLink,
  Download,
  Trash2,
  Filter,
  RefreshCw,
  PlusCircle,
  Check,
  Upload,
  Moon,
  ClipboardPaste,
  ChevronUp,
  Sparkles,
  Square,
  Globe,
  Database,
  BookOpen,
  LayoutGrid,
  List,
  ChevronDown,
  Plus,
  FileJson,
} from 'lucide-react';
import { CatalogueGridSkeleton } from './ui/Skeleton';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import {
  HighStockProduct,
  CategoryCount,
  findProductsByCategory,
  scrapeScreenshot,
  getAiSettings,
  generateGenericText,
  generateAppJson,
} from '../lib/gemini';
import {
  extractCatalogueFromMarkdown,
  mergeUniqueCatalogue,
  classifySiteMapLinks,
  buildCategoryCountsFromClassified,
} from '../lib/catalogueExtract';
import { LocalDbImportPanel } from './LocalDbImportPanel';
import { DraggableProduct } from './DraggableProduct';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Business } from '../data';

export type DbMode = 'product' | 'info';

export function LocalDb({
  onAddPost,
  activeBusiness,
}: {
  onAddPost: (products: HighStockProduct[]) => void;
  activeBusiness?: Business | null;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const businessId = activeBusiness?.id;

  // Mode detection
  const initialMode = useMemo(() => {
    if (!activeBusiness?.industry) return 'product';
    const ind = activeBusiness.industry.toLowerCase();
    if (
      ind.includes('software') ||
      ind.includes('tech') ||
      ind.includes('agency') ||
      ind.includes('consulting') ||
      ind.includes('marketing')
    ) {
      return 'info';
    }
    return 'product';
  }, [activeBusiness?.industry]);

  const [dbMode, setDbMode] = useState<DbMode>(initialMode);

  // Update mode when business changes
  useEffect(() => {
    setDbMode(initialMode);
  }, [initialMode]);

  const [isCheckingCounts, setIsCheckingCounts] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [hasCheckedCounts, setHasCheckedCounts] = useState(false);

  const [products, setProducts] = useState<HighStockProduct[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [liveProducts, setLiveProducts] = useState<HighStockProduct[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const aiSettings = getAiSettings();
  const [manualUrl, setManualUrl] = useState(
    activeBusiness?.targetUrl || aiSettings.targetUrl || '',
  );
  const [manualUrlInput, setManualUrlInput] = useState(manualUrl);
  const [isScrapingScreenshot, setIsScrapingScreenshot] = useState(false);
  const [manualPreviewMode, setManualPreviewMode] = useState<'live' | 'screenshot'>('live');
  const [manualScreenshot, setManualScreenshot] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [isAutoScraping, setIsAutoScraping] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isOvernightMode, setIsOvernightMode] = useState(false);
  const [fetchingCategory, setFetchingCategory] = useState<string | null>(null);
  const [consolePaste, setConsolePaste] = useState('');
  const [isProcessingPaste, setIsProcessingPaste] = useState(false);
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);
  const [brandKitCategories, setBrandKitCategories] = useState<string[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState({ current: 0, total: 0 });
  const [crawlJobId, setCrawlJobId] = useState<string | null>(null);
  const [siteMap, setSiteMap] = useState<any[]>([]);
  const [isSiteMapOpen, setIsSiteMapOpen] = useState(false);
  const [brandOverview, setBrandOverview] = useState<string | null>(null);
  const [isGeneratingOverview, setIsGeneratingOverview] = useState(false);
  const crawlIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const [catalogueView, setCatalogueView] = useState<'grid' | 'list'>('grid');
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [detailItem, setDetailItem] = useState<HighStockProduct | null>(null);
  const [isCatalogueLoading, setIsCatalogueLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    type: '',
    price: '',
    stockInfo: '',
    link: '',
  });

  const catalogueLabels = useMemo(
    () => ({
      title: dbMode === 'product' ? 'Catalogue' : 'Knowledge base',
      subtitle:
        dbMode === 'product'
          ? 'Browse, search, and use your product library in posts and AI tools.'
          : 'Browse, search, and use reference insights across your workspace.',
      itemSingular: dbMode === 'product' ? 'item' : 'entry',
      itemPlural: dbMode === 'product' ? 'items' : 'entries',
      searchPlaceholder: dbMode === 'product' ? 'Search catalogue…' : 'Search knowledge base…',
      emptyTitle: dbMode === 'product' ? 'Your catalogue is empty' : 'No entries yet',
      emptyBody:
        dbMode === 'product'
          ? 'Add products manually or import from a website to build your library.'
          : 'Add insights manually or import from pages to build your knowledge base.',
      secondaryField: dbMode === 'product' ? 'Price / stock' : 'Summary',
    }),
    [dbMode],
  );

  // Scroll to top listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Monthly stock check
  useEffect(() => {
    if (!businessId) return;
    const lastCheck = localStorage.getItem(`rainbow_last_stock_check_${businessId}`);
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    if (!lastCheck || now - parseInt(lastCheck) > oneMonth) {
      toast('Monthly Stock Check Due', {
        description:
          "It's been over a month since your last full stock check. Would you like to refresh your inventory data?",
        action: {
          label: 'Check Now',
          onClick: () => handleCheckCounts(),
        },
      });
      localStorage.setItem(`rainbow_last_stock_check_${businessId}`, now.toString());
    }
  }, [businessId]);

  // Clear state when businessId changes
  useEffect(() => {
    setProducts([]);
    setCategoryCounts([]);
    setLiveProducts([]);
    setHasSearched(false);
    setHasCheckedCounts(false);
    setLogs([]);
    const defaultUrl = activeBusiness?.targetUrl || aiSettings.targetUrl || '';
    setManualUrl(defaultUrl);
    setManualUrlInput(defaultUrl);
  }, [businessId]);

  // Multi-select state
  const [selectedProducts, setSelectedProducts] = useState<HighStockProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-scrape interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoScraping && fetchingCategory) {
      interval = setInterval(async () => {
        const iframe = document.getElementById('scraper-iframe') as HTMLIFrameElement;
        if (iframe && iframe.src && !isScrapingScreenshot) {
          setIsScrapingScreenshot(true);
          addLog(`📸 Auto-Scrape: Taking screenshot and analyzing...`);
          try {
            const newProducts = await scrapeScreenshot(
              iframe.src,
              fetchingCategory,
              activeBusiness?.targetUrl,
            );
            if (newProducts.length > 0) {
              setLiveProducts((prev) => {
                const existingIds = new Set(prev.map((p) => p.title));
                const uniqueNew = newProducts.filter((p) => !existingIds.has(p.title));
                return [...prev, ...uniqueNew];
              });
              setProducts((prev) => {
                const existingIds = new Set(prev.map((p) => p.title));
                const uniqueNew = newProducts.filter((p) => !existingIds.has(p.title));
                if (uniqueNew.length > 0) {
                  syncProductsToFirestore(uniqueNew);
                }
                return [...prev, ...uniqueNew];
              });
              addLog(`✅ Auto-Scrape extracted ${newProducts.length} products.`);
            }
          } catch (e) {
            // Ignore errors in auto-scrape to avoid log spam
          } finally {
            setIsScrapingScreenshot(false);
          }
        }
      }, 15000); // Every 15 seconds
    }
    return () => clearInterval(interval);
  }, [isAutoScraping, fetchingCategory, isScrapingScreenshot]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    // Send notification for activity logs
    if ('Notification' in window && Notification.permission === 'granted') {
      // Only notify if it's a significant event or if the user is in overnight mode
      const isSignificant =
        msg.includes('✅') || msg.includes('🚨') || msg.includes('🎯') || msg.includes('🚀');
      if (isSignificant || isOvernightMode) {
        new Notification('Forge Scraper', {
          body: msg,
          icon: 'https://picsum.photos/seed/forge/192/192',
          silent: !isSignificant, // Make it silent for routine logs unless significant
        });
      }
    }
  };

  // Listen for messages from the proxied iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE') {
        const newUrl = event.data.url;
        addLog(`🔗 Navigation detected: ${newUrl}`);
        setManualUrlInput(newUrl);
        setManualUrl(newUrl); // This reloads the iframe with the new proxied URL
      } else if (event.data?.type === 'URL_CHANGE') {
        const targetUrl = event.data.targetUrl;
        if (targetUrl && targetUrl !== manualUrl) {
          setManualUrlInput(targetUrl);
          setManualUrl(targetUrl);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [manualUrl]);

  // Filters
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterOutlet, setFilterOutlet] = useState('All');

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  // Sync products with Firestore
  useEffect(() => {
    if (!userId || !businessId) {
      setIsCatalogueLoading(false);
      return;
    }

    setIsCatalogueLoading(true);
    const q = query(collection(db, 'inventory_products'), where('businessId', '==', businessId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cloudProducts: HighStockProduct[] = [];
        snapshot.forEach((docSnap) => {
          cloudProducts.push(docSnap.data() as HighStockProduct);
        });
        setProducts(cloudProducts);
        setHasSearched(true);
        setIsCatalogueLoading(false);
      },
      (error) => {
        setIsCatalogueLoading(false);
        handleFirestoreError(error, OperationType.GET, 'rainbow_products');
      },
    );

    return () => unsubscribe();
  }, [userId, businessId]);

  // Sync category counts with Firestore
  useEffect(() => {
    if (!userId || !businessId) return;

    const q = query(
      collection(db, 'inventory_category_counts'),
      where('businessId', '==', businessId),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cloudCounts: CategoryCount[] = [];
        snapshot.forEach((doc) => {
          cloudCounts.push(doc.data() as CategoryCount);
        });

        if (cloudCounts.length > 0) {
          setCategoryCounts(cloudCounts);
          setHasCheckedCounts(true);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'rainbow_counts');
      },
    );

    return () => unsubscribe();
  }, [userId, businessId]);

  // Sync site map with Firestore
  useEffect(() => {
    if (!userId || !businessId) return;

    const mapRef = doc(db, 'inventory_maps', businessId);
    const unsubscribe = onSnapshot(
      mapRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.links && Array.isArray(data.links)) {
            setSiteMap(data.links);
            addLog(`📦 Loaded site map from cloud (${data.links.length} links).`);
          }
        }
      },
      (error) => {
        console.warn('Map sync failed (might not exist yet):', error);
      },
    );

    return () => unsubscribe();
  }, [userId, businessId]);

  // Sync brand overview with Firestore
  useEffect(() => {
    if (!userId || !businessId) return;

    const overviewRef = doc(db, 'brand_overviews', businessId);
    const unsubscribe = onSnapshot(
      overviewRef,
      (doc) => {
        if (doc.exists()) {
          setBrandOverview(doc.data().overview);
        }
      },
      (error) => {
        console.warn('Overview sync failed:', error);
      },
    );

    return () => unsubscribe();
  }, [userId, businessId]);

  // Fetch Brand Kit Categories
  useEffect(() => {
    if (!businessId) return;
    const unsubscribe = onSnapshot(
      doc(db, 'categories', businessId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.categories && Array.isArray(data.categories)) {
            const names = data.categories
              .filter((c: any) => c.enabled !== false)
              .map((c: any) => c.name);
            setBrandKitCategories(names);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `categories/${businessId}`);
      },
    );
    return () => unsubscribe();
  }, [businessId]);

  // Save to local storage on mount
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (!userId || !businessId) {
      const savedProducts = localStorage.getItem(`rainbowStockCheck_${businessId || 'default'}`);
      const savedCounts = localStorage.getItem(`rainbowCategoryCounts_${businessId || 'default'}`);

      if (savedProducts) {
        try {
          const parsed = JSON.parse(savedProducts);
          if (Array.isArray(parsed)) {
            setProducts(parsed);
            if (parsed.length > 0) {
              setHasSearched(true);
            }
          }
        } catch (e) {
          console.error('Failed to parse saved stock check', e);
        }
      }

      if (savedCounts) {
        try {
          const parsed = JSON.parse(savedCounts);
          if (Array.isArray(parsed)) {
            setCategoryCounts(parsed);
            if (parsed.length > 0) {
              setHasCheckedCounts(true);
            }
          }
        } catch (e) {
          console.error('Failed to parse saved category counts', e);
        }
      }
    }
  }, [userId, businessId]);

  // Save to local storage (only if not logged in or no business)
  useEffect(() => {
    if (hasSearched && (!userId || !businessId)) {
      try {
        localStorage.setItem(
          `rainbowStockCheck_${businessId || 'default'}`,
          JSON.stringify(products),
        );
      } catch (e) {
        console.error('Failed to save products to localStorage', e);
      }
    }
  }, [products, hasSearched, userId, businessId]);

  useEffect(() => {
    if (hasCheckedCounts && (!userId || !businessId)) {
      try {
        localStorage.setItem(
          `rainbowCategoryCounts_${businessId || 'default'}`,
          JSON.stringify(categoryCounts),
        );
      } catch (e) {
        console.error('Failed to save categoryCounts to localStorage', e);
      }
    }
  }, [categoryCounts, hasCheckedCounts, userId, businessId]);

  const handleCheckCounts = async (force: boolean = false) => {
    // Only run if map is missing or force=true
    if (!force && siteMap.length > 0 && categoryCounts.length > 0) {
      toast.info('Map already exists. Using cached data.');
      return;
    }

    setIsCheckingCounts(true);
    try {
      const urlToMap = activeBusiness?.targetUrl || manualUrl;
      if (!urlToMap) {
        toast.error('Please enter a URL first.');
        return;
      }

      addLog(`🗺️ Fetching map for ${urlToMap}...`);
      const mapRes = await fetch('/api/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToMap, limit: 5000, apiKey: aiSettings.firecrawlApiKey }),
      });

      const mapData = await mapRes.json();

      if (!mapRes.ok) {
        const errMsg = mapData.error || mapData.details || 'Unknown mapping error';
        addLog(`⚠️ Map error: ${errMsg}`);
        if (errMsg.includes('API key is not configured')) {
          toast.error('Firecrawl API key is missing. Please add it in Settings.');
        } else {
          toast.error(`Map failed: ${errMsg}`);
        }
        return;
      }

      if (mapData.success && mapData.links) {
        const classified = classifySiteMapLinks(mapData.links);
        const newCounts: CategoryCount[] = buildCategoryCountsFromClassified(classified, urlToMap);

        setCategoryCounts(newCounts);
        setSiteMap(mapData.links);
        setHasCheckedCounts(true);

        // Save to Firestore
        if (userId && businessId) {
          addLog(`💾 Saving site map to cloud...`);
          const mapRef = doc(db, 'inventory_maps', businessId);
          await setDoc(mapRef, {
            links: mapData.links,
            businessId,
            userId,
            updatedAt: new Date().toISOString(),
          });

          // Also save counts to their respective documents
          const batch = writeBatch(db);
          newCounts.forEach((c) => {
            const docId = c.category.replace(/[^a-zA-Z0-9]/g, '_');
            const docRef = doc(db, 'inventory_category_counts', `${businessId}_${docId}`);
            batch.set(docRef, { ...c, userId, businessId, updatedAt: new Date().toISOString() });
          });
          await batch.commit();
        }

        toast.success(`Mapped ${mapData.links.length} URLs into ${newCounts.length} categories.`);
        addLog(
          `✅ Map completed. Found ${mapData.links.length} links, grouped into ${newCounts.length} categories.`,
        );
      } else {
        throw new Error(mapData.error || 'Failed to map website');
      }
    } catch (error: any) {
      console.error('Failed to get category counts:', error);
      toast.error(`Failed to map website: ${error.message}`);
      addLog(`⚠️ Map error: ${error.message}`);
    } finally {
      setIsCheckingCounts(false);
    }
  };

  const handleQuickSync = async () => {
    const url = (manualUrl || activeBusiness?.targetUrl || aiSettings.targetUrl || '').trim();
    if (!url) {
      toast.error('Add your website URL in Settings, or open import tools to enter one.');
      setShowImportPanel(true);
      return;
    }
    if (!manualUrl) {
      setManualUrl(url);
      setManualUrlInput(url);
    }
    await handleStartCrawl();
  };

  const handleStartCrawl = async () => {
    if (!manualUrl) {
      toast.error('Please enter a URL to crawl.');
      return;
    }

    setIsCrawling(true);

    // Check if we need to map first (if categoryCounts is empty or we force it)
    if (categoryCounts.length === 0 && siteMap.length === 0) {
      addLog(`🗺️ Starting map for ${manualUrl}...`);
      await handleCheckCounts();
    }

    addLog(`🚀 Starting crawl for ${manualUrl}...`);

    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: manualUrl, limit: 50, apiKey: aiSettings.firecrawlApiKey }),
      });

      const data = await res.json();
      if (data.success && data.id) {
        setCrawlJobId(data.id);
        addLog(`✅ Crawl job submitted (ID: ${data.id}). Polling for results...`);
        pollCrawlStatus(data.id);
      } else {
        throw new Error(data.error || 'Failed to start crawl job');
      }
    } catch (error: any) {
      toast.error(`Crawl failed: ${error.message}`);
      setIsCrawling(false);
    }
  };

  const pollCrawlStatus = async (jobId: string) => {
    if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);

    let processedCount = 0;

    crawlIntervalRef.current = setInterval(async () => {
      try {
        const apiKeyParam = aiSettings.firecrawlApiKey
          ? `?apiKey=${encodeURIComponent(aiSettings.firecrawlApiKey)}`
          : '';
        const res = await fetch(`/api/crawl/${jobId}${apiKeyParam}`);
        const data = await res.json();

        if (data.data && data.data.length > processedCount + 20) {
          const newPages = data.data.slice(processedCount, processedCount + 20);
          addLog(`📦 Batch ready: Processing ${newPages.length} new pages...`);
          await processCrawlData(newPages);
          processedCount += newPages.length;
        }

        if (data.status === 'completed' || data.status === 'failed') {
          if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
          crawlIntervalRef.current = null;

          if (data.status === 'completed') {
            const remainingPages = data.data?.slice(processedCount) || [];
            if (remainingPages.length > 0) {
              addLog(`✅ Crawl completed! Processing final ${remainingPages.length} pages...`);
              await processCrawlData(remainingPages);
            } else {
              addLog(`✅ Crawl completed!`);
            }
          } else {
            addLog(`❌ Crawl job failed: ${data.error || 'Unknown error'}`);
          }

          setIsCrawling(false);
          setCrawlJobId(null);
        } else {
          // Still in progress
          addLog(`⏳ Crawl status: ${data.status}... (${data.data?.length || 0} pages found)`);
        }
      } catch (error: any) {
        if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
        crawlIntervalRef.current = null;
        toast.error(`Error checking crawl status: ${error.message}`);
        setIsCrawling(false);
      }
    }, 10000); // Poll every 10 seconds for crawl
  };

  const processCrawlData = async (pages: any[]) => {
    if (!pages || pages.length === 0) {
      toast.info('No pages found in crawl data.');
      return;
    }

    const allExtractedProducts: HighStockProduct[] = [];
    setCrawlProgress({ current: 0, total: pages.length });
    const outlet = activeBusiness?.name || 'Forge Enterprises';

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      setCrawlProgress({ current: i + 1, total: pages.length });
      addLog(`Extracting: ${page.metadata?.title || page.url}…`);

      if (page.markdown) {
        try {
          const { items } = await extractCatalogueFromMarkdown({
            markdown: page.markdown,
            pageUrl: page.url || page.metadata?.sourceURL,
            pageTitle: page.metadata?.title,
            mode: dbMode,
            brandCategories: brandKitCategories,
            outlet,
            businessId: businessId || undefined,
          });
          if (items.length > 0) {
            allExtractedProducts.push(
              ...items.map((p) => ({
                ...p,
                outlet: p.outlet || outlet,
                link: p.link || page.url,
              })),
            );
            addLog(`Found ${items.length} items on this page.`);
          }
        } catch (error) {
          addLog(`Extract error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    if (allExtractedProducts.length > 0) {
      const { added, duplicatesSkipped } = mergeUniqueCatalogue(products, allExtractedProducts);

      if (added.length > 0) {
        setProducts((prev) => [...prev, ...added]);
        setHasSearched(true);
        await syncProductsToFirestore(added);
        toast.success(`Saved ${added.length} new items (${duplicatesSkipped} duplicates skipped).`);
      } else {
        toast.info(
          `Processed ${allExtractedProducts.length} products, but they are already in the inventory.`,
        );
      }
    } else {
      toast.info('Processing complete but no products were found.');
    }
  };

  const handleStopCrawl = async () => {
    if (!crawlJobId) return;

    addLog(`🛑 Stopping crawl and processing results found so far...`);
    if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
    crawlIntervalRef.current = null;

    try {
      // Fetch current state of the crawl
      const apiKeyParam = aiSettings.firecrawlApiKey
        ? `?apiKey=${encodeURIComponent(aiSettings.firecrawlApiKey)}`
        : '';
      const res = await fetch(`/api/crawl/${crawlJobId}${apiKeyParam}`);
      const data = await res.json();

      // We don't have processedCount here easily unless we store it in a ref
      // But syncProductsToFirestore handles duplicates by title, so it's safe to process all
      if (data.data && data.data.length > 0) {
        addLog(`📦 Found ${data.data.length} pages in total. Final processing...`);
        await processCrawlData(data.data);
      } else {
        addLog(`ℹ️ No pages were crawled yet.`);
        toast.info('Crawl stopped. No data was collected yet.');
      }
    } catch (error: any) {
      console.error('Error during stop crawl:', error);
      toast.error('Failed to process partial crawl data.');
    } finally {
      setIsCrawling(false);
      setCrawlJobId(null);
    }
  };

  const handleFetchCategory = async (category: string) => {
    setFetchingCategory(category);
    setLogs([]);
    setLiveProducts([]);
    addLog(`🚀 Starting single scan for category: "${category}"`);

    const startTime = Date.now();

    try {
      const existingTitles = products
        .filter((p) => p.type === category || category === 'All Products')
        .map((p) => p.title);
      addLog(`🔍 Fetching batch... (Current database: ${existingTitles.length} products)`);

      const result = await findProductsByCategory(
        category,
        existingTitles,
        (newProducts) => {
          setLiveProducts(newProducts);
        },
        activeBusiness?.targetUrl,
      );
      const { products: newProducts, meta } = result;
      const batchDuration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (meta.logs && meta.logs.length > 0) {
        meta.logs.forEach((log) => addLog(log));
      }

      if (newProducts.length > 0) {
        const existingIds = new Set(products.map((p) => p.title));
        const uniqueNew = newProducts.filter((p) => !existingIds.has(p.title));

        addLog(
          `📊 Batch Results [${batchDuration}s]: Found ${meta.aiCount} via AI, ${meta.scrapedCount} via Scraper.`,
        );

        if (uniqueNew.length > 0) {
          setProducts((prev) => [...prev, ...uniqueNew]);
          syncProductsToFirestore(uniqueNew);
          setHasSearched(true);

          const sampleNames = uniqueNew
            .slice(0, 3)
            .map((p) => p.title)
            .join(', ');
          addLog(
            `✅ Added ${uniqueNew.length} new unique products. (e.g., ${sampleNames}${uniqueNew.length > 3 ? '...' : ''})`,
          );
        } else {
          addLog(`⚠️ Found ${newProducts.length} products, but all were already in your database.`);
        }
      } else {
        addLog(`❌ No products found in this batch [${batchDuration}s].`);
      }

      addLog(`ℹ️ Scan complete. Click 'Get Info' again to fetch more.`);
    } catch (error) {
      console.error(`Failed to fetch products for ${category}:`, error);
      addLog(`🚨 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}.`);
    } finally {
      const totalDuration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      addLog(`🏁 Session finished in ${totalDuration} minutes.`);
    }
  };

  // Derived data for filters
  const categories = useMemo(() => {
    if (!Array.isArray(products)) return ['All'];
    const cats = new Set(products.map((p) => p?.type));
    return ['All', ...Array.from(cats)].filter(Boolean);
  }, [products]);

  const outlets = useMemo(() => {
    if (!Array.isArray(products)) return ['All'];
    const outs = new Set(products.map((p) => p?.outlet || 'Forge Enterprises'));
    return ['All', ...Array.from(outs)].filter(Boolean);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((p) => {
      if (!p) return false;
      const matchCategory = filterCategory === 'All' || p.type === filterCategory;
      const matchOutlet =
        filterOutlet === 'All' || (p.outlet || 'Forge Enterprises') === filterOutlet;
      const matchSearch =
        searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.stockInfo && p.stockInfo.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchOutlet && matchSearch;
    });
  }, [products, filterCategory, filterOutlet, searchQuery]);

  const [columns, setColumns] = useState(2);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateColumns = () => {
      const w = window.innerWidth;
      if (w >= 1280) setColumns(6);
      else if (w >= 1024) setColumns(5);
      else if (w >= 768) setColumns(4);
      else if (w >= 640) setColumns(3);
      else setColumns(2);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const rows = Math.ceil(filteredProducts.length / columns);

  const virtualizer = useWindowVirtualizer({
    count: rows,
    estimateSize: () => 220, // Estimated height of a product card row
    overscan: 5,
  });

  const toggleProductSelection = (product: HighStockProduct) => {
    setSelectedProducts((prev) => {
      const isSelected = prev.find((p) => p.title === product.title);
      if (isSelected) {
        return prev.filter((p) => p.title !== product.title);
      } else {
        return [...prev, product];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts);
    }
  };

  // Helper to sync products to Firestore in batches
  const syncProductsToFirestore = async (items: HighStockProduct[], counts?: CategoryCount[]) => {
    if (!userId || !businessId || items.length === 0) return;

    try {
      const CHUNK_SIZE = 100; // Smaller chunk size for more reliability
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = items.slice(i, i + CHUNK_SIZE);

        chunk.forEach((p) => {
          const title = p.title || 'Untitled';
          const docId = title.replace(/[^a-zA-Z0-9]/g, '_');
          const docRef = doc(db, 'inventory_products', `${businessId}_${docId}`);
          batch.set(docRef, {
            ...p,
            title,
            userId,
            businessId,
            updatedAt: new Date().toISOString(),
          });
        });

        await batch.commit();
        // Delay to avoid rate limiting and exhaustion
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (counts && counts.length > 0) {
        const batch = writeBatch(db);
        counts.forEach((c) => {
          const docId = c.category.replace(/[^a-zA-Z0-9]/g, '_');
          const docRef = doc(db, 'inventory_category_counts', `${businessId}_${docId}`);
          batch.set(docRef, { ...c, userId, businessId, updatedAt: new Date().toISOString() });
        });
        await batch.commit();
      }
    } catch (e) {
      console.error('Manual sync failed', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let allPages: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Normalize Firecrawl JSON structure
        let pages = [];
        if (Array.isArray(parsed)) {
          pages = parsed;
        } else if (parsed.data && Array.isArray(parsed.data)) {
          pages = parsed.data;
        } else if (parsed.markdown) {
          pages = [parsed];
        }

        allPages = [...allPages, ...pages];
      } catch (error) {
        console.error(`Failed to parse ${file.name}:`, error);
        toast.error(`Failed to parse ${file.name}`);
      }
    }

    if (allPages.length > 0) {
      addLog(`📦 Loaded ${allPages.length} pages from uploaded JSON files. Processing...`);
      await processCrawlData(allPages);
    } else {
      toast.error('No valid crawl data found in the uploaded files.');
    }

    // Reset file input
    if (e.target) e.target.value = '';
  };

  const handleGenerateBrandOverview = async () => {
    if (!userId || !businessId || products.length === 0) {
      toast.error('Need insights first to generate an overview.');
      return;
    }

    setIsGeneratingOverview(true);
    addLog('🧠 AI is analyzing brand insights and generating identity overview...');

    try {
      const insightsText = products
        .filter((p) => p.stockInfo)
        .slice(0, 50)
        .map((p) => `- ${p.title}: ${p.stockInfo}`)
        .join('\n');

      const prompt = `Based on the following extracted insights from a business website, generate a cohesive, professional "Brand Identity Overview". 
      Focus on what the site is about, their core mission, important information for customers, and key details that define their value proposition.
      
      INSIGHTS:
      ${insightsText}
      
      Write a clear, structured summary (max 3-4 paragraphs) that would serve as the ultimate reference for this brand.`;

      const overview = await generateGenericText(prompt);
      if (overview) {
        setBrandOverview(overview);
        // Save to Firestore
        await setDoc(doc(db, 'brand_overviews', businessId), {
          overview,
          businessId,
          userId,
          updatedAt: new Date().toISOString(),
        });
        toast.success('Brand Identity Overview generated!');
        addLog('✨ Brand Identity Overview successfully updated.');
      }
    } catch (e) {
      console.error('Failed to generate overview:', e);
      toast.error('Failed to generate brand overview.');
    } finally {
      setIsGeneratingOverview(false);
    }
  };

  const handleConsolePaste = async () => {
    if (!consolePaste.trim()) return;
    setIsProcessingPaste(true);
    try {
      let data;
      try {
        // Try direct parse first
        const cleanedPaste = consolePaste.trim();
        data = JSON.parse(cleanedPaste);

        // If it's a string, it might be double-stringified (common in browser console output)
        if (typeof data === 'string') {
          try {
            const secondParse = JSON.parse(data);
            if (
              Array.isArray(secondParse) ||
              (typeof secondParse === 'object' && secondParse !== null)
            ) {
              data = secondParse;
            }
          } catch (e) {
            // Not double stringified, just a string that happens to be valid JSON
          }
        }
      } catch (e) {
        // If direct parse fails, try to extract JSON from messy text using AI
        addLog(`⚠️ Direct JSON parse failed. Attempting AI extraction from messy text...`);
        const extracted = await generateAppJson(
          dbMode === 'product'
            ? `Extract a JSON array of products from the following messy console output or text.
          Each product should have 'name', 'price', 'link', and 'image' fields if available.

          Text:
          ${consolePaste}`
            : `Extract a JSON array of information items from the following messy console output or text.
          Each item should have 'title', 'content', and 'link' fields if available.

          Text:
          ${consolePaste}`,
          { expectArray: true },
        );

        if (extracted && Array.isArray(extracted) && extracted.length > 0) {
          data = extracted;
        } else {
          throw new Error(
            dbMode === 'product'
              ? 'AI could not extract any product data from the text.'
              : 'AI could not extract any information from the text.',
          );
        }
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error(
          dbMode === 'product'
            ? 'No products found in the pasted data.'
            : 'No items found in the pasted data.',
        );
      }

      const dataArray = Array.isArray(data) ? data : [data];

      // Auto-categorize
      addLog(
        `🧠 AI: Categorizing ${dataArray.length} ${dbMode === 'product' ? 'products' : 'items'}...`,
      );
      const categoriesMap =
        (await generateAppJson(
          dbMode === 'product'
            ? `Categorize the following products into one of these categories: Furniture, Building Materials, Home Appliances, Kitchenware, Electronics, Lighting, Bathroom Fittings, Hardware.

          Products:
          ${dataArray.map((p: any) => p.name || p.title).join(', ')}

          Return a JSON object where keys are product names and values are the categories.`
            : `Categorize the following information pieces into one of these categories: Technical, Strategy, Research, Case Study, News, Tutorial.

          Items:
          ${dataArray.map((p: any) => p.name || p.title).join(', ')}

          Return a JSON object where keys are item names and values are the categories.`,
        )) || {};

      const newProducts: HighStockProduct[] = dataArray
        .map((item: any) => {
          const name = item.name || item.title || 'Unknown Product';
          return {
            title: name,
            type: categoriesMap[name] || 'Uncategorized',
            link: item.link || manualUrl,
            stockInfo:
              dbMode === 'product'
                ? item.price || item.stock || 'Price not available'
                : item.content || item.stockInfo || 'No content available',
            outlet: 'Forge Enterprises',
          };
        })
        .filter((p) => p.title !== 'Unknown Product');

      if (newProducts.length > 0) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.title));
          const uniqueNew = newProducts.filter((p) => !existingIds.has(p.title));
          const updated = [...prev, ...uniqueNew];
          syncProductsToFirestore(uniqueNew);
          return updated;
        });
        setHasSearched(true);
        addLog(
          `✅ Console Paste: Added ${newProducts.length} ${dbMode === 'product' ? 'products' : 'items'}.`,
        );
        toast.success(
          `Added ${newProducts.length} ${dbMode === 'product' ? 'products' : 'items'} from console paste!`,
        );
        setConsolePaste('');
      } else {
        toast.error(
          dbMode === 'product'
            ? 'No valid products found in the pasted data.'
            : 'No valid items found in the pasted data.',
        );
      }
    } catch (e: any) {
      toast.error(e.message);
      addLog(`🚨 Console Paste ERROR: ${e.message}`);
    } finally {
      setIsProcessingPaste(false);
    }
  };

  const handleAutoCategorize = async () => {
    const uncategorized = products.filter((p) => p.type === 'Uncategorized' || !p.type);
    if (uncategorized.length === 0) {
      toast.info('No uncategorized products found.');
      return;
    }

    setIsAutoCategorizing(true);
    addLog(
      `🧠 AI: Auto-categorizing ${uncategorized.length} products using Brand Kit categories...`,
    );

    try {
      // Process in batches of 20 to avoid prompt limits
      const batchSize = 20;
      const updatedProducts = [...products];
      const categoryList =
        brandKitCategories.length > 0
          ? brandKitCategories.join(', ')
          : 'Furniture, Building Materials, Home Appliances, Kitchenware, Electronics, Lighting, Bathroom Fittings, Hardware';

      for (let i = 0; i < uncategorized.length; i += batchSize) {
        const batch = uncategorized.slice(i, i + batchSize);
        const categoriesMap =
          (await generateAppJson(
            dbMode === 'product'
              ? `Categorize the following products into one of these categories: ${categoryList}.

          Products:
          ${batch.map((p) => p.title).join(', ')}

          Return a JSON object where keys are product names and values are the categories.`
              : `Categorize the following information pieces into one of these categories: ${categoryList}.

          Items:
          ${batch.map((p) => p.title).join(', ')}.

          Return a JSON object where keys are item names and values are the categories.`,
          )) || {};

        batch.forEach((p) => {
          const index = updatedProducts.findIndex((up) => up.title === p.title);
          if (index !== -1 && categoriesMap[p.title]) {
            updatedProducts[index] = { ...updatedProducts[index], type: categoriesMap[p.title] };
          }
        });
      }

      setProducts(updatedProducts);
      // Only sync the products that were actually updated
      syncProductsToFirestore(
        updatedProducts.filter((p) => uncategorized.some((u) => u.title === p.title)),
      );
      toast.success(`Successfully categorized ${uncategorized.length} products!`);
      addLog(`✅ Auto-categorization complete.`);
    } catch (error) {
      console.error('Auto-categorization failed:', error);
      toast.error('Failed to auto-categorize products.');
    } finally {
      setIsAutoCategorizing(false);
    }
  };

  const handleDeleteItem = async (product: HighStockProduct) => {
    setProducts((prev) => prev.filter((p) => p.title !== product.title));
    setSelectedProducts((prev) => prev.filter((p) => p.title !== product.title));
    if (detailItem?.title === product.title) setDetailItem(null);
    if (userId && businessId) {
      const docId = (product.title || 'Untitled').replace(/[^a-zA-Z0-9]/g, '_');
      try {
        await deleteDoc(doc(db, 'inventory_products', `${businessId}_${docId}`));
      } catch (e) {
        console.error('Delete failed', e);
        toast.error('Could not remove item from cloud sync.');
      }
    }
    toast.success('Removed from catalogue');
  };

  const handleAddEntry = async () => {
    const title = newEntry.title.trim();
    if (!title) {
      toast.error('Title is required.');
      return;
    }
    const item: HighStockProduct = {
      title,
      type: newEntry.type.trim() || 'Uncategorized',
      link: newEntry.link.trim() || manualUrl || undefined,
      outlet: 'Forge Enterprises',
      ...(dbMode === 'product'
        ? {
            price: newEntry.price.trim() || undefined,
            stockInfo: newEntry.price.trim() || undefined,
          }
        : { stockInfo: newEntry.stockInfo.trim() || newEntry.price.trim() || undefined }),
    };
    if (products.some((p) => p.title === title)) {
      toast.error('An entry with this title already exists.');
      return;
    }
    setProducts((prev) => [...prev, item]);
    setHasSearched(true);
    await syncProductsToFirestore([item]);
    setShowAddModal(false);
    setNewEntry({ title: '', type: '', price: '', stockInfo: '', link: '' });
    setDetailItem(item);
    toast.success('Added to catalogue');
  };

  const handleExportCatalogue = () => {
    if (filteredProducts.length === 0) {
      toast.info('Nothing to export.');
      return;
    }
    const rows = filteredProducts.map((p) => ({
      Title: p.title,
      Category: p.type,
      ...(dbMode === 'product' ? { Price: p.price || p.stockInfo } : { Summary: p.stockInfo }),
      Link: p.link || '',
      SKU: p.sku || '',
      Outlet: p.outlet || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, dbMode === 'product' ? 'Catalogue' : 'Knowledge');
    XLSX.writeFile(
      wb,
      `${dbMode === 'product' ? 'catalogue' : 'knowledge-base'}-${businessId || 'export'}.xlsx`,
    );
    toast.success('Exported catalogue');
  };

  const uncategorizedCount = products.filter((p) => p.type === 'Uncategorized' || !p.type).length;
  const categoryCount = new Set(products.map((p) => p.type).filter(Boolean)).size;

  return (
    <TabPageShell className="relative">
      <TabPageHeader
        icon={Database}
        title={catalogueLabels.title}
        subtitle={catalogueLabels.subtitle}
        actions={
          <TabHeaderSegments
            options={[
              { id: 'product', label: 'Catalogue' },
              { id: 'info', label: 'Knowledge base' },
            ]}
            value={dbMode}
            onChange={(id) => setDbMode(id as DbMode)}
          />
        }
      />

      <TabPageContent className="pb-6">
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 p-3 bg-brand text-white rounded-full hover:bg-brand-hover transition-colors animate-in fade-in slide-in-from-bottom-4 min-h-[44px] min-w-[44px]"
            title="Scroll to top"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
        )}

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-safe">
                Total {catalogueLabels.itemPlural}
              </p>
              <p className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] mt-1">
                {products.length}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-safe">
                Categories
              </p>
              <p className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] mt-1">
                {categoryCount}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-safe">
                Showing
              </p>
              <p className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] mt-1">
                {filteredProducts.length}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-safe">
                Needs category
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {uncategorizedCount}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
                <input
                  type="text"
                  placeholder={catalogueLabels.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm focus:ring-2 focus:ring-brand/30 outline-none"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm min-h-[44px]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {dbMode === 'product' && (
                <select
                  value={filterOutlet}
                  onChange={(e) => setFilterOutlet(e.target.value)}
                  className="px-3 py-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm min-h-[44px]"
                >
                  {outlets.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2 flex-wrap">
                <div className="flex rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCatalogueView('grid')}
                    className={cn(
                      'p-3 min-h-[44px]',
                      catalogueView === 'grid'
                        ? 'bg-brand text-white'
                        : 'bg-white dark:bg-[#191919] text-secondary-safe',
                    )}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogueView('list')}
                    className={cn(
                      'p-3 min-h-[44px]',
                      catalogueView === 'list'
                        ? 'bg-brand text-white'
                        : 'bg-white dark:bg-[#191919] text-secondary-safe',
                    )}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-3 bg-brand text-white rounded-[12px] text-sm font-bold hover:bg-brand-hover flex items-center gap-2 min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  Add {catalogueLabels.itemSingular}
                </button>
                <div className="flex rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden min-h-[44px]">
                  <button
                    type="button"
                    onClick={handleQuickSync}
                    disabled={isCrawling || isCheckingCounts}
                    className={cn(
                      'px-4 py-3 text-sm font-bold flex items-center gap-2 min-h-[44px]',
                      'bg-brand text-white hover:bg-brand-hover disabled:opacity-50',
                    )}
                    title="Start catalogue sync from your site URL"
                  >
                    <RefreshCw
                      className={cn('w-4 h-4', (isCrawling || isCheckingCounts) && 'animate-spin')}
                    />
                    Sync
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportPanel(!showImportPanel)}
                    className={cn(
                      'px-3 py-3 border-l border-[#E9E9E7] dark:border-[#2E2E2E] min-h-[44px] flex items-center',
                      showImportPanel
                        ? 'bg-brand-bg text-brand'
                        : 'bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#EBE9ED]',
                    )}
                    aria-expanded={showImportPanel}
                    aria-label={
                      showImportPanel ? 'Hide import tools' : 'Show import tools and terminal'
                    }
                    title="Import, map site, and view sync log"
                  >
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform',
                        showImportPanel && 'rotate-180',
                      )}
                    />
                  </button>
                </div>
                {products.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleAutoCategorize}
                      disabled={isAutoCategorizing}
                      className="px-4 py-3 rounded-[12px] text-sm font-bold border border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400 disabled:opacity-50 min-h-[44px] flex items-center gap-2"
                    >
                      {isAutoCategorizing ? (
                        <ForgeLoader size={16} />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Categorize
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCatalogue}
                      className="px-4 py-3 rounded-[12px] text-sm font-bold border border-[#E9E9E7] dark:border-[#2E2E2E] min-h-[44px] flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {showImportPanel && (
            <LocalDbImportPanel
              dbMode={dbMode}
              activeBusiness={activeBusiness}
              businessId={businessId}
              userId={userId}
              brandKitCategories={brandKitCategories}
              products={products}
              setProducts={setProducts}
              setHasSearched={setHasSearched}
              syncProductsToFirestore={syncProductsToFirestore}
              manualUrl={manualUrl}
              setManualUrl={setManualUrl}
              manualUrlInput={manualUrlInput}
              setManualUrlInput={setManualUrlInput}
              siteMap={siteMap}
              setSiteMap={setSiteMap}
              categoryCounts={categoryCounts}
              setCategoryCounts={setCategoryCounts}
              setHasCheckedCounts={setHasCheckedCounts}
              onViewSiteMap={() => setIsSiteMapOpen(true)}
              onJsonFileUpload={handleFileUpload}
            />
          )}

          {selectedProducts.length > 0 && (
            <div className="sticky top-0 z-20 glass-card p-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-[#37352F] dark:text-[#EBE9ED]">
                {selectedProducts.length} {catalogueLabels.itemPlural} selected
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-xs bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] min-h-[36px]"
                >
                  {selectedProducts.length === filteredProducts.length
                    ? 'Deselect all'
                    : 'Select all filtered'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProducts([])}
                  className="px-3 py-1.5 text-xs bg-[#EFEFED] dark:bg-[#2E2E2E] text-secondary-safe rounded-[8px] min-h-[36px]"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => onAddPost(selectedProducts)}
                  className="px-3 py-1.5 text-xs bg-brand text-white rounded-[8px] font-bold min-h-[36px]"
                >
                  Create post
                </button>
              </div>
            </div>
          )}

          {/* Brand Overview Header (Info Mode Only) */}
          {dbMode === 'info' && hasSearched && (
            <div className="mt-8 mb-8">
              <div className="bg-white dark:bg-[#191919] p-8 rounded-[32px] border border-[#E9E9E7] dark:border-[#2E2E2E] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/50" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-[20px] flex items-center justify-center text-blue-600">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-[#37352F] dark:text-[#EBE9ED]">
                        Brand Identity Overview
                      </h3>
                      <p className="text-xs font-bold text-[#757681] dark:text-[#9B9A97] tracking-wider uppercase">
                        Forge AI Insights Engine
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateBrandOverview}
                    disabled={isGeneratingOverview || products.length === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                  >
                    {isGeneratingOverview ? (
                      <ForgeLoader size={20} />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {brandOverview ? 'Regenerate Focus' : 'Analyze Brand Identity'}
                  </button>
                </div>

                {brandOverview ? (
                  <div className="bg-[#F7F7F5] dark:bg-[#202020] p-6 rounded-[20px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-[#37352F] dark:text-[#EBE9ED] leading-relaxed whitespace-pre-wrap font-medium">
                      {brandOverview}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-[#F7F7F5] dark:bg-[#202020] rounded-[24px] border border-dashed border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <div className="w-16 h-16 bg-white dark:bg-[#2E2E2E] rounded-full flex items-center justify-center mb-4 shadow-sm">
                      <BookOpen className="w-8 h-8 text-[#9B9A97] opacity-40" />
                    </div>
                    <h4 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED] mb-2">
                      No Brand Identity Yet
                    </h4>
                    <p className="text-sm text-[#757681] dark:text-[#9B9A97] max-w-md mb-6">
                      Ready to build your knowledge base? Fetch some insights using the crawler,
                      then click "Analyze" to generate a professional overview.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              {isCatalogueLoading ? (
                <CatalogueGridSkeleton />
              ) : filteredProducts.length === 0 ? (
                <div className="glass-card p-10 text-center">
                  <div className="w-16 h-16 mx-auto bg-brand-bg rounded-2xl flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-brand opacity-80" />
                  </div>
                  <h3 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED]">
                    {catalogueLabels.emptyTitle}
                  </h3>
                  <p className="text-sm text-secondary-safe mt-2 max-w-md mx-auto">
                    {catalogueLabels.emptyBody}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(true)}
                      className="px-5 py-2.5 bg-brand text-white rounded-[12px] text-sm font-bold hover:bg-brand-hover min-h-[44px]"
                    >
                      Add {catalogueLabels.itemSingular}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowImportPanel(true)}
                      className="px-5 py-2.5 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm font-bold min-h-[44px]"
                    >
                      Import data
                    </button>
                  </div>
                </div>
              ) : catalogueView === 'list' ? (
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const isSelected = !!selectedProducts.find((p) => p.title === product.title);
                    const isActive = detailItem?.title === product.title;
                    return (
                      <div key={product.title} className="relative">
                        <DraggableProduct
                          product={product}
                          onClick={() => setDetailItem(product)}
                          isSelected={isSelected || isActive}
                          viewMode="list"
                          dbMode={dbMode}
                          onDelete={handleDeleteItem}
                        />
                        {isSelected && (
                          <div className="absolute top-3 right-3 z-20 bg-brand text-white rounded-full p-1">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  ref={listRef}
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const startIndex = virtualRow.index * columns;
                    const rowProducts = filteredProducts.slice(startIndex, startIndex + columns);
                    return (
                      <div
                        key={virtualRow.index}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-3"
                      >
                        {rowProducts.map((product) => {
                          const isSelected = !!selectedProducts.find(
                            (p) => p.title === product.title,
                          );
                          const isActive = detailItem?.title === product.title;
                          return (
                            <div key={product.title} className="relative h-full">
                              <DraggableProduct
                                product={product}
                                onClick={() => setDetailItem(product)}
                                isSelected={isSelected || isActive}
                                viewMode="grid"
                                dbMode={dbMode}
                                onDelete={handleDeleteItem}
                              />
                              {isSelected && (
                                <div className="absolute top-2 right-2 z-20 bg-brand text-white rounded-full p-1 pointer-events-none">
                                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {detailItem && (
              <aside className="w-full lg:w-80 shrink-0 glass-card p-5 h-fit lg:sticky lg:top-4">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <h3 className="font-bold text-[#37352F] dark:text-[#EBE9ED] leading-snug">
                    {detailItem.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDetailItem(null)}
                    className="p-1 rounded-lg hover:bg-[#F7F7F5] dark:hover:bg-[#202020]"
                  >
                    <X className="w-4 h-4 text-secondary-safe" />
                  </button>
                </div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-brand bg-brand-bg px-2 py-0.5 rounded mb-3">
                  {detailItem.type || 'Uncategorized'}
                </span>
                {(detailItem.price || detailItem.stockInfo) && (
                  <p className="text-sm text-secondary-safe mb-3">
                    <span className="font-bold text-[#37352F] dark:text-[#EBE9ED]">
                      {catalogueLabels.secondaryField}:{' '}
                    </span>
                    {dbMode === 'product'
                      ? detailItem.price || detailItem.stockInfo
                      : detailItem.stockInfo}
                  </p>
                )}
                {detailItem.sku && (
                  <p className="text-xs text-secondary-safe mb-2">SKU: {detailItem.sku}</p>
                )}
                {detailItem.outlet && (
                  <p className="text-xs text-secondary-safe mb-4">Source: {detailItem.outlet}</p>
                )}
                <div className="flex flex-col gap-2">
                  {detailItem.link && (
                    <a
                      href={detailItem.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-brand hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open source
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleProductSelection(detailItem)}
                    className="w-full py-2.5 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[10px] text-sm font-bold"
                  >
                    {selectedProducts.find((p) => p.title === detailItem.title)
                      ? 'Remove from selection'
                      : 'Add to selection'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddPost([detailItem])}
                    className="w-full py-2.5 bg-brand text-white rounded-[10px] text-sm font-bold hover:bg-brand-hover"
                  >
                    Use in post
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(detailItem)}
                    className="w-full py-2.5 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-[10px] text-sm font-bold"
                  >
                    Remove from catalogue
                  </button>
                </div>
              </aside>
            )}
          </div>

          {showAddModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#191919] w-full max-w-md rounded-[20px] border border-[#E9E9E7] dark:border-[#2E2E2E] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED]">
                    Add {catalogueLabels.itemSingular}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="p-2 rounded-full hover:bg-[#F7F7F5] dark:hover:bg-[#202020]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    placeholder="Title *"
                    value={newEntry.title}
                    onChange={(e) => setNewEntry((s) => ({ ...s, title: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[10px] text-sm bg-white dark:bg-[#191919]"
                  />
                  <input
                    placeholder="Category"
                    value={newEntry.type}
                    onChange={(e) => setNewEntry((s) => ({ ...s, type: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[10px] text-sm bg-white dark:bg-[#191919]"
                  />
                  <input
                    placeholder={catalogueLabels.secondaryField}
                    value={dbMode === 'product' ? newEntry.price : newEntry.stockInfo}
                    onChange={(e) =>
                      setNewEntry((s) =>
                        dbMode === 'product'
                          ? { ...s, price: e.target.value }
                          : { ...s, stockInfo: e.target.value },
                      )
                    }
                    className="w-full px-3 py-2.5 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[10px] text-sm bg-white dark:bg-[#191919]"
                  />
                  <input
                    placeholder="Link (optional)"
                    value={newEntry.link}
                    onChange={(e) => setNewEntry((s) => ({ ...s, link: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[10px] text-sm bg-white dark:bg-[#191919]"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2E2E2E] text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddEntry}
                    className="flex-1 py-2.5 rounded-[10px] bg-brand text-white text-sm font-bold hover:bg-brand-hover"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Site Map Modal */}
          {isSiteMapOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#191919] w-full max-w-4xl max-h-[80vh] rounded-[24px] border border-[#E9E9E7] dark:border-[#2E2E2E] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-between sticky top-0 bg-white dark:bg-[#191919] z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-[12px] flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#37352F] dark:text-[#EBE9ED]">
                        Site Map Structure
                      </h2>
                      <p className="text-xs text-[#757681] dark:text-[#9B9A97]">
                        {siteMap.length} unique URLs discovered
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSiteMapOpen(false)}
                    className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#202020] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-[#757681]" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {siteMap.map((link, i) => (
                      <div
                        key={i}
                        className="group flex items-center justify-between p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] hover:border-emerald-500/50 transition-all"
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#9B9A97]">
                              URL {i + 1}
                            </span>
                          </div>
                          <span className="text-sm text-[#37352F] dark:text-[#EBE9ED] truncate pr-4 font-mono">
                            {link.url}
                          </span>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-[#757681] hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-[#F7F7F5] dark:bg-[#202020] border-t border-[#E9E9E7] dark:border-[#2E2E2E] flex justify-between items-center">
                  <p className="text-xs text-[#757681]">
                    These links were mapped using the initial crawl of {activeBusiness?.targetUrl}.
                  </p>
                  <button
                    onClick={() => setIsSiteMapOpen(false)}
                    className="px-6 py-2 bg-[#37352F] dark:bg-[#EBE9ED] text-white dark:text-[#191919] rounded-[12px] font-bold hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </TabPageContent>
    </TabPageShell>
  );
}

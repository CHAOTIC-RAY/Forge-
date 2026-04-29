import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { ForgeLoader } from './ForgeLoader';
import { X, Search, ExternalLink, Download, Trash2, Filter, RefreshCw, PlusCircle, Check, Upload, Save, Moon, Camera, ClipboardPaste, ChevronUp, Sparkles, Square, Globe, Database, BookOpen } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { HighStockProduct, getCategoryProductCounts, CategoryCount, findProductsByCategory, scrapeScreenshot, getAi, extractProductsFromMarkdown, extractInfoFromMarkdown, getAiSettings } from '../lib/gemini';
import { Type } from "@google/genai";
import { DraggableProduct } from './DraggableProduct';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Business } from '../data';

export type DbMode = 'product' | 'info';

export function LocalDb({ onAddPost, activeBusiness }: { onAddPost: (products: HighStockProduct[]) => void, activeBusiness?: Business | null }) {
  const [userId, setUserId] = useState<string | null>(null);
  const businessId = activeBusiness?.id;
  
  // Mode detection
  const initialMode = useMemo(() => {
    if (!activeBusiness?.industry) return 'product';
    const ind = activeBusiness.industry.toLowerCase();
    if (ind.includes('software') || ind.includes('tech') || ind.includes('agency') || ind.includes('consulting') || ind.includes('marketing')) {
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
  const [manualUrl, setManualUrl] = useState(activeBusiness?.targetUrl || aiSettings.targetUrl || '');
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
      toast("Monthly Stock Check Due", {
        description: "It's been over a month since your last full stock check. Would you like to refresh your inventory data?",
        action: {
          label: "Check Now",
          onClick: () => handleCheckCounts()
        }
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
            const newProducts = await scrapeScreenshot(iframe.src, fetchingCategory, activeBusiness?.targetUrl);
            if (newProducts.length > 0) {
              setLiveProducts(prev => {
                const existingIds = new Set(prev.map(p => p.title));
                const uniqueNew = newProducts.filter(p => !existingIds.has(p.title));
                return [...prev, ...uniqueNew];
              });
              setProducts(prev => {
                const existingIds = new Set(prev.map(p => p.title));
                const uniqueNew = newProducts.filter(p => !existingIds.has(p.title));
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
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    
    // Send notification for activity logs
    if ('Notification' in window && Notification.permission === 'granted') {
      // Only notify if it's a significant event or if the user is in overnight mode
      const isSignificant = msg.includes('✅') || msg.includes('🚨') || msg.includes('🎯') || msg.includes('🚀');
      if (isSignificant || isOvernightMode) {
        new Notification('Forge Scraper', {
          body: msg,
          icon: 'https://picsum.photos/seed/forge/192/192',
          silent: !isSignificant // Make it silent for routine logs unless significant
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
    if (!userId || !businessId) return;

    const q = query(collection(db, 'inventory_products'), where('businessId', '==', businessId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudProducts: HighStockProduct[] = [];
      snapshot.forEach((doc) => {
        cloudProducts.push(doc.data() as HighStockProduct);
      });
      
      if (cloudProducts.length > 0) {
        setProducts(cloudProducts);
        setHasSearched(true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rainbow_products');
    });

    return () => unsubscribe();
  }, [userId, businessId]);

  // Sync category counts with Firestore
  useEffect(() => {
    if (!userId || !businessId) return;

    const q = query(collection(db, 'inventory_category_counts'), where('businessId', '==', businessId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudCounts: CategoryCount[] = [];
      snapshot.forEach((doc) => {
        cloudCounts.push(doc.data() as CategoryCount);
      });
      
      if (cloudCounts.length > 0) {
        setCategoryCounts(cloudCounts);
        setHasCheckedCounts(true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rainbow_counts');
    });

    return () => unsubscribe();
  }, [userId, businessId]);

  // Sync site map with Firestore
  useEffect(() => {
    if (!userId || !businessId) return;

    const mapRef = doc(db, 'inventory_maps', businessId);
    const unsubscribe = onSnapshot(mapRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.links && Array.isArray(data.links)) {
          setSiteMap(data.links);
          addLog(`📦 Loaded site map from cloud (${data.links.length} links).`);
        }
      }
    }, (error) => {
      console.warn("Map sync failed (might not exist yet):", error);
    });

    return () => unsubscribe();
  }, [userId, businessId]);


  // Sync brand overview with Firestore
  useEffect(() => {
    if (!userId || !businessId) return;

    const overviewRef = doc(db, 'brand_overviews', businessId);
    const unsubscribe = onSnapshot(overviewRef, (doc) => {
      if (doc.exists()) {
        setBrandOverview(doc.data().overview);
      }
    }, (error) => {
      console.warn("Overview sync failed:", error);
    });

    return () => unsubscribe();
  }, [userId, businessId]);

  // Fetch Brand Kit Categories
  useEffect(() => {
    if (!businessId) return;
    const unsubscribe = onSnapshot(doc(db, 'categories', businessId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.categories && Array.isArray(data.categories)) {
          const names = data.categories
            .filter((c: any) => c.enabled !== false)
            .map((c: any) => c.name);
          setBrandKitCategories(names);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `categories/${businessId}`);
    });
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
          console.error("Failed to parse saved stock check", e);
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
          console.error("Failed to parse saved category counts", e);
        }
      }
    }
  }, [userId, businessId]);

  // Save to local storage (only if not logged in or no business)
  useEffect(() => {
    if (hasSearched && (!userId || !businessId)) {
      try {
        localStorage.setItem(`rainbowStockCheck_${businessId || 'default'}`, JSON.stringify(products));
      } catch (e) {
        console.error("Failed to save products to localStorage", e);
      }
    }
  }, [products, hasSearched, userId, businessId]);
  
  useEffect(() => {
    if (hasCheckedCounts && (!userId || !businessId)) {
      try {
        localStorage.setItem(`rainbowCategoryCounts_${businessId || 'default'}`, JSON.stringify(categoryCounts));
      } catch (e) {
        console.error("Failed to save categoryCounts to localStorage", e);
      }
    }
  }, [categoryCounts, hasCheckedCounts, userId, businessId]);

  const handleCheckCounts = async (force: boolean = false) => {
    // Only run if map is missing or force=true
    if (!force && siteMap.length > 0 && categoryCounts.length > 0) {
      toast.info("Map already exists. Using cached data.");
      return;
    }

    setIsCheckingCounts(true);
    try {
      const urlToMap = activeBusiness?.targetUrl || manualUrl;
      if (!urlToMap) {
        toast.error("Please enter a URL first.");
        return;
      }

      addLog(`🗺️ Fetching map for ${urlToMap}...`);
      const mapRes = await fetch('/api/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToMap, limit: 5000, apiKey: aiSettings.firecrawlApiKey })
      });
      
      const mapData = await mapRes.json();
      
      if (!mapRes.ok) {
        const errMsg = mapData.error || mapData.details || "Unknown mapping error";
        addLog(`⚠️ Map error: ${errMsg}`);
        if (errMsg.includes("API key is not configured")) {
          toast.error("Firecrawl API key is missing. Please add it in Settings.");
        } else {
          toast.error(`Map failed: ${errMsg}`);
        }
        return;
      }

      if (mapData.success && mapData.links) {
        const categoryMap: Record<string, number> = {};
        mapData.links.forEach((link: any) => {
          try {
            const urlObj = new URL(link.url);
            const pathSegments = urlObj.pathname.split('/').filter(Boolean);
            const category = pathSegments.length > 0 ? pathSegments[0] : 'Home';
            categoryMap[category] = (categoryMap[category] || 0) + 1;
          } catch (e) {
            // Ignore invalid URLs
          }
        });

        const newCounts: CategoryCount[] = Object.entries(categoryMap).map(([category, count]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          count: count as number,
          url: urlToMap
        })).sort((a, b) => b.count - a.count).slice(0, 50);

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
            updatedAt: new Date().toISOString()
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
        addLog(`✅ Map completed. Found ${mapData.links.length} links, grouped into ${newCounts.length} categories.`);
      } else {
        throw new Error(mapData.error || "Failed to map website");
      }
    } catch (error: any) {
      console.error("Failed to get category counts:", error);
      toast.error(`Failed to map website: ${error.message}`);
      addLog(`⚠️ Map error: ${error.message}`);
    } finally {
      setIsCheckingCounts(false);
    }
  };

  const handleStartCrawl = async () => {
    if (!manualUrl) {
      toast.error("Please enter a URL to crawl.");
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
        body: JSON.stringify({ url: manualUrl, limit: 50, apiKey: aiSettings.firecrawlApiKey })
      });
      
      const data = await res.json();
      if (data.success && data.id) {
        setCrawlJobId(data.id);
        addLog(`✅ Crawl job submitted (ID: ${data.id}). Polling for results...`);
        pollCrawlStatus(data.id);
      } else {
        throw new Error(data.error || "Failed to start crawl job");
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
        const apiKeyParam = aiSettings.firecrawlApiKey ? `?apiKey=${encodeURIComponent(aiSettings.firecrawlApiKey)}` : '';
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
            addLog(`❌ Crawl job failed: ${data.error || "Unknown error"}`);
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
      toast.info("No pages found in crawl data.");
      return;
    }

    let allExtractedProducts: HighStockProduct[] = [];
    setCrawlProgress({ current: 0, total: pages.length });

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      setCrawlProgress({ current: i + 1, total: pages.length });
      addLog(`🤖 Extracting products from: ${page.metadata?.title || page.url}...`);
      
      if (page.markdown) {
        addLog(`📄 Markdown length: ${page.markdown.length} characters.`);
        try {
          const extracted = dbMode === 'product' 
            ? await extractProductsFromMarkdown(page.markdown)
            : await extractInfoFromMarkdown(page.markdown);
            
          if (extracted.length > 0) {
            const productsWithOutlet = extracted.map(p => ({
              ...p,
              outlet: "Forge Enterprises",
              link: p.link || page.url
            }));
            allExtractedProducts.push(...productsWithOutlet);
            addLog(`✨ Found ${extracted.length} products on this page.`);
          } else {
            addLog(`🔍 No products found on this page.`);
          }
        } catch (error) {
          console.error("Extraction error:", error);
          addLog(`🚨 Error extracting from this page: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        addLog(`⚠️ No markdown content available for this page.`);
      }
    }

    if (allExtractedProducts.length > 0) {
      const existingIds = new Set(products.map(p => p.title));
      const uniqueNew = allExtractedProducts.filter(p => p.title && !existingIds.has(p.title));

      if (uniqueNew.length > 0) {
        setProducts(prev => [...prev, ...uniqueNew]);
        setHasSearched(true);
        // Save to Firestore using the existing sync function
        await syncProductsToFirestore(uniqueNew);
        toast.success(`Successfully processed and saved ${uniqueNew.length} new products!`);
      } else {
        toast.info(`Processed ${allExtractedProducts.length} products, but they are already in the inventory.`);
      }
    } else {
      toast.info("Processing complete but no products were found.");
    }
  };

  const handleStopCrawl = async () => {
    if (!crawlJobId) return;
    
    addLog(`🛑 Stopping crawl and processing results found so far...`);
    if (crawlIntervalRef.current) clearInterval(crawlIntervalRef.current);
    crawlIntervalRef.current = null;
    
    try {
      // Fetch current state of the crawl
      const apiKeyParam = aiSettings.firecrawlApiKey ? `?apiKey=${encodeURIComponent(aiSettings.firecrawlApiKey)}` : '';
      const res = await fetch(`/api/crawl/${crawlJobId}${apiKeyParam}`);
      const data = await res.json();
      
      // We don't have processedCount here easily unless we store it in a ref
      // But syncProductsToFirestore handles duplicates by title, so it's safe to process all
      if (data.data && data.data.length > 0) {
        addLog(`📦 Found ${data.data.length} pages in total. Final processing...`);
        await processCrawlData(data.data);
      } else {
        addLog(`ℹ️ No pages were crawled yet.`);
        toast.info("Crawl stopped. No data was collected yet.");
      }
    } catch (error: any) {
      console.error("Error during stop crawl:", error);
      toast.error("Failed to process partial crawl data.");
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
      const existingTitles = products.filter(p => p.type === category || category === 'All Products').map(p => p.title);
      addLog(`🔍 Fetching batch... (Current database: ${existingTitles.length} products)`);
      
      const result = await findProductsByCategory(category, existingTitles, (newProducts) => {
        setLiveProducts(newProducts);
      }, activeBusiness?.targetUrl);
      const { products: newProducts, meta } = result;
      const batchDuration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (meta.logs && meta.logs.length > 0) {
        meta.logs.forEach(log => addLog(log));
      }
      
      if (newProducts.length > 0) {
        const existingIds = new Set(products.map(p => p.title));
        const uniqueNew = newProducts.filter(p => !existingIds.has(p.title));
        
        addLog(`📊 Batch Results [${batchDuration}s]: Found ${meta.aiCount} via AI, ${meta.scrapedCount} via Scraper.`);
        
        if (uniqueNew.length > 0) {
          setProducts(prev => [...prev, ...uniqueNew]);
          syncProductsToFirestore(uniqueNew);
          setHasSearched(true);
          
          const sampleNames = uniqueNew.slice(0, 3).map(p => p.title).join(', ');
          addLog(`✅ Added ${uniqueNew.length} new unique products. (e.g., ${sampleNames}${uniqueNew.length > 3 ? '...' : ''})`);
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
    const cats = new Set(products.map(p => p?.type));
    return ['All', ...Array.from(cats)].filter(Boolean);
  }, [products]);

  const outlets = useMemo(() => {
    if (!Array.isArray(products)) return ['All'];
    const outs = new Set(products.map(p => p?.outlet || 'Forge Enterprises'));
    return ['All', ...Array.from(outs)].filter(Boolean);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter(p => {
      if (!p) return false;
      const matchCategory = filterCategory === 'All' || p.type === filterCategory;
      const matchOutlet = filterOutlet === 'All' || (p.outlet || 'Forge Enterprises') === filterOutlet;
      const matchSearch = searchQuery === '' || 
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
    setSelectedProducts(prev => {
      const isSelected = prev.find(p => p.title === product.title);
      if (isSelected) {
        return prev.filter(p => p.title !== product.title);
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
          batch.set(docRef, { ...p, title, userId, businessId, updatedAt: new Date().toISOString() });
        });
        
        await batch.commit();
        // Delay to avoid rate limiting and exhaustion
        await new Promise(resolve => setTimeout(resolve, 200));
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
      console.error("Manual sync failed", e);
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
      toast.error("No valid crawl data found in the uploaded files.");
    }
    
    // Reset file input
    if (e.target) e.target.value = '';
  };

  const handleGenerateBrandOverview = async () => {
    if (!userId || !businessId || products.length === 0) {
      toast.error("Need insights first to generate an overview.");
      return;
    }

    setIsGeneratingOverview(true);
    addLog("🧠 AI is analyzing brand insights and generating identity overview...");
    
    try {
      const insightsText = products
        .filter(p => p.stockInfo)
        .slice(0, 50)
        .map(p => `- ${p.title}: ${p.stockInfo}`)
        .join('\n');

      const ai = getAi();
      const prompt = `Based on the following extracted insights from a business website, generate a cohesive, professional "Brand Identity Overview". 
      Focus on what the site is about, their core mission, important information for customers, and key details that define their value proposition.
      
      INSIGHTS:
      ${insightsText}
      
      Write a clear, structured summary (max 3-4 paragraphs) that would serve as the ultimate reference for this brand.`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      
      const overview = result.text;
      if (overview) {
        setBrandOverview(overview);
        // Save to Firestore
        await setDoc(doc(db, 'brand_overviews', businessId), {
          overview,
          businessId,
          userId,
          updatedAt: new Date().toISOString()
        });
        toast.success("Brand Identity Overview generated!");
        addLog("✨ Brand Identity Overview successfully updated.");
      }
    } catch (e) {
      console.error("Failed to generate overview:", e);
      toast.error("Failed to generate brand overview.");
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
            if (Array.isArray(secondParse) || (typeof secondParse === 'object' && secondParse !== null)) {
              data = secondParse;
            }
          } catch (e) {
            // Not double stringified, just a string that happens to be valid JSON
          }
        }
      } catch (e) {
        // If direct parse fails, try to extract JSON from messy text using AI
        addLog(`⚠️ Direct JSON parse failed. Attempting AI extraction from messy text...`);
        const ai = getAi();
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: dbMode === 'product' ? `Extract a JSON array of products from the following messy console output or text. 
          Each product should have 'name', 'price', 'link', and 'image' fields if available.
          
          Text:
          ${consolePaste}
          
          Return ONLY the JSON array.` : `Extract a JSON array of information items from the following messy console output or text. 
          Each item should have 'title', 'content', and 'link' fields if available.
          
          Text:
          ${consolePaste}
          
          Return ONLY the JSON array.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: dbMode === 'product' ? {
                  name: { type: Type.STRING },
                  price: { type: Type.STRING },
                  link: { type: Type.STRING },
                  image: { type: Type.STRING }
                } : {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  link: { type: Type.STRING }
                }
              }
            }
          }
        });
        
        if (response.text) {
          data = JSON.parse(response.text);
        } else {
          throw new Error(dbMode === 'product' ? "AI could not extract any product data from the text." : "AI could not extract any information from the text.");
        }
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error(dbMode === 'product' ? "No products found in the pasted data." : "No items found in the pasted data.");
      }

      const dataArray = Array.isArray(data) ? data : [data];

      // Auto-categorize
      addLog(`🧠 AI: Categorizing ${dataArray.length} ${dbMode === 'product' ? 'products' : 'items'}...`);
      const ai = getAi();
      const categorizationResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: dbMode === 'product' 
          ? `Categorize the following products into one of these categories: Furniture, Building Materials, Home Appliances, Kitchenware, Electronics, Lighting, Bathroom Fittings, Hardware.
          
          Products:
          ${dataArray.map((p: any) => p.name || p.title).join(', ')}
          
          Return a JSON object where keys are product names and values are the categories.`
          : `Categorize the following information pieces into one of these categories: Technical, Strategy, Research, Case Study, News, Tutorial.
          
          Items:
          ${dataArray.map((p: any) => p.name || p.title).join(', ')}
          
          Return a JSON object where keys are item names and values are the categories.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            additionalProperties: { type: Type.STRING }
          }
        }
      });
      const categoriesMap = JSON.parse(categorizationResponse.text || "{}");

      const newProducts: HighStockProduct[] = dataArray.map((item: any) => {
        const name = item.name || item.title || 'Unknown Product';
        return {
          title: name,
          type: categoriesMap[name] || 'Uncategorized',
          link: item.link || manualUrl,
          stockInfo: dbMode === 'product' ? (item.price || item.stock || 'Price not available') : (item.content || item.stockInfo || 'No content available'),
          outlet: 'Forge Enterprises'
        };
      }).filter(p => p.title !== 'Unknown Product');

      if (newProducts.length > 0) {
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.title));
          const uniqueNew = newProducts.filter(p => !existingIds.has(p.title));
          const updated = [...prev, ...uniqueNew];
          syncProductsToFirestore(uniqueNew);
          return updated;
        });
        setHasSearched(true);
        addLog(`✅ Console Paste: Added ${newProducts.length} ${dbMode === 'product' ? 'products' : 'items'}.`);
        toast.success(`Added ${newProducts.length} ${dbMode === 'product' ? 'products' : 'items'} from console paste!`);
        setConsolePaste('');
      } else {
        toast.error(dbMode === 'product' ? "No valid products found in the pasted data." : "No valid items found in the pasted data.");
      }
    } catch (e: any) {
      toast.error(e.message);
      addLog(`🚨 Console Paste ERROR: ${e.message}`);
    } finally {
      setIsProcessingPaste(false);
    }
  };

  const handleAutoCategorize = async () => {
    const uncategorized = products.filter(p => p.type === 'Uncategorized' || !p.type);
    if (uncategorized.length === 0) {
      toast.info("No uncategorized products found.");
      return;
    }

    setIsAutoCategorizing(true);
    addLog(`🧠 AI: Auto-categorizing ${uncategorized.length} products using Brand Kit categories...`);
    
    try {
      const ai = getAi();
      // Process in batches of 20 to avoid prompt limits
      const batchSize = 20;
      const updatedProducts = [...products];
      const categoryList = brandKitCategories.length > 0 
        ? brandKitCategories.join(', ') 
        : 'Furniture, Building Materials, Home Appliances, Kitchenware, Electronics, Lighting, Bathroom Fittings, Hardware';

      for (let i = 0; i < uncategorized.length; i += batchSize) {
        const batch = uncategorized.slice(i, i + batchSize);
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: dbMode === 'product'
          ? `Categorize the following products into one of these categories: ${categoryList}.
          
          Products:
          ${batch.map(p => p.title).join(', ')}
          
          Return a JSON object where keys are product names and values are the categories.`
          : `Categorize the following information pieces into one of these categories: ${categoryList}.
          
          Items:
          ${batch.map(p => p.title).join(', ')}
          
          Return a JSON object where keys are item names and values are the categories.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              additionalProperties: { type: Type.STRING }
            }
          }
        });

        const categoriesMap = JSON.parse(response.text || "{}");
        
        batch.forEach(p => {
          const index = updatedProducts.findIndex(up => up.title === p.title);
          if (index !== -1 && categoriesMap[p.title]) {
            updatedProducts[index] = { ...updatedProducts[index], type: categoriesMap[p.title] };
          }
        });
      }

      setProducts(updatedProducts);
      // Only sync the products that were actually updated
      syncProductsToFirestore(updatedProducts.filter(p => uncategorized.some(u => u.title === p.title)));
      toast.success(`Successfully categorized ${uncategorized.length} products!`);
      addLog(`✅ Auto-categorization complete.`);
    } catch (error) {
      console.error("Auto-categorization failed:", error);
      toast.error("Failed to auto-categorize products.");
    } finally {
      setIsAutoCategorizing(false);
    }
  };

  return (
    <div className="flex flex-col bg-transparent relative">
      <div className="hidden md:block p-6 md:p-8 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] -mx-4 md:-mx-8 -mt-6 md:-mt-8 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-bg rounded-[16px] flex items-center justify-center">
              <Database className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] flex items-center gap-2">
                {dbMode === 'product' ? 'Product DB' : 'Info DB'}
              </h2>
              <p className="text-sm text-[#757681] dark:text-[#9B9A97] mt-1">
                {dbMode === 'product' 
                  ? 'Manage and analyze your inventory data.' 
                  : 'Manage and analyze your knowledge base and insights.'}
              </p>
            </div>
          </div>
          
          {/* Mode Toggle */}
          <div className="flex items-center bg-[#F7F7F5] dark:bg-[#202020] p-1 rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
            <button
              onClick={() => setDbMode('product')}
              className={cn(
                "px-4 py-1.5 rounded-[8px] text-xs font-medium transition-all",
                dbMode === 'product' 
                  ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] " 
                  : "text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
              )}
            >
              Product Mode
            </button>
            <button
              onClick={() => setDbMode('info')}
              className={cn(
                "px-4 py-1.5 rounded-[8px] text-xs font-medium transition-all",
                dbMode === 'info' 
                  ? "bg-white dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] " 
                  : "text-[#757681] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-[#EBE9ED]"
              )}
            >
              Info Mode
            </button>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 bg-[#2383E2] text-white rounded-full  hover:bg-blue-600 transition-all animate-in fade-in slide-in-from-bottom-4"
          title="Scroll to Top"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}

      {/* Body */}
      <div className="flex flex-col pb-6 px-4 md:px-0">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex-1 w-full max-w-md">
            <div className="relative">
              <input
                type="url"
                placeholder={`Target URL (defaults to ${aiSettings.targetUrl || 'https://example.com'})`}
                value={manualUrlInput}
                onChange={(e) => setManualUrlInput(e.target.value)}
                onBlur={() => setManualUrl(manualUrlInput || aiSettings.targetUrl || '')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setManualUrl(manualUrlInput || aiSettings.targetUrl || '');
                  }
                }}
                className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-sm focus:ring-2 focus:ring-[#2383E2] outline-none transition-all "
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Globe className="w-4 h-4 text-[#9B9A97]" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
            <button
              onClick={handleAutoCategorize}
              disabled={isAutoCategorizing}
              className="flex-1 md:flex-none px-4 py-2.5 bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 rounded-[12px] text-sm font-bold hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 "
            >
              {isAutoCategorizing ? <ForgeLoader size={16} /> : <Sparkles className="w-4 h-4" />}
              Auto-Categorize
            </button>
            <button
              onClick={() => setIsManualMode(!isManualMode)}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-[12px] text-sm font-bold transition-all  ${
                isManualMode
                  ? 'bg-[#2383E2] text-white'
                  : 'bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]'
              }`}
            >
              {isManualMode ? 'Back to Auto-Scrape' : 'Manual Scrape Mode'}
            </button>
          </div>
        </div>

        {/* Multi-select bar */}
        {selectedProducts.length > 0 && (
          <div className="sticky top-0 z-10 bg-white dark:bg-[#191919] p-4 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px]  mb-6 flex items-center justify-between">
            <span className="text-sm font-medium text-[#37352F] dark:text-[#EBE9ED]">
              {selectedProducts.length} products selected
            </span>
            <div className="flex gap-2">
              <button 
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[6px]"
              >
                {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All Filtered'}
              </button>
              <button 
                onClick={() => setSelectedProducts([])}
                className="px-3 py-1.5 text-xs bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#757681] dark:text-[#9B9A97] rounded-[6px]"
              >
                Clear Selection
              </button>
              <button 
                onClick={() => onAddPost(selectedProducts)}
                className="px-3 py-1.5 text-xs bg-[#2383E2] text-white rounded-[6px]"
              >
                Create Post with Selected
              </button>
            </div>
          </div>
        )}

        {/* Category Counts Section */}
        {!isManualMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-[#191919] p-6 rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E] ">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED] uppercase tracking-wider">
                  {dbMode === 'product' ? 'Inventory Overview' : 'Knowledge Overview'}
                </h3>
                <div className="flex items-center gap-2">
                  {isCrawling ? (
                    <button 
                      onClick={handleStopCrawl}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-[8px] text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      Stop Crawl
                    </button>
                  ) : (
                    <button 
                      onClick={handleStartCrawl}
                      disabled={isCrawling}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-[8px] text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Crawl Website
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      setIsCheckingCounts(true);
                      try {
                        for (const cat of categoryCounts) {
                          await handleFetchCategory(cat.category);
                        }
                        toast.success("All categories refreshed!");
                      } catch (e) {
                        toast.error("Failed to refresh all categories.");
                      } finally {
                        setIsCheckingCounts(false);
                  }
                }}
                disabled={isCheckingCounts}
                className="text-[10px] font-bold text-[#2383E2] hover:underline disabled:opacity-50"
              >
              </button>
                    <button 
                      onClick={() => handleCheckCounts(true)}
                      disabled={isCheckingCounts}
                      title="Force Re-Map Site"
                      className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#202020] rounded-[8px] text-[#757681] dark:text-[#9B9A97] transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    {siteMap.length > 0 && (
                      <button 
                        onClick={() => setIsSiteMapOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-[8px] text-[10px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-all"
                      >
                        <Globe className="w-3 h-3" />
                        View Map
                      </button>
                    )}
                  </div>
                </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-[12px] border border-blue-100 dark:border-blue-900/30">
                  <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
                    {dbMode === 'product' ? 'Total Items' : 'Total Insights'}
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{products.length}</div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-[12px] border border-orange-100 dark:border-orange-900/30">
                  <div className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Uncategorized</div>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {products.filter(p => p.type === 'Uncategorized' || !p.type).length}
                  </div>
                </div>
              </div>

              {hasCheckedCounts ? (
                <div className="space-y-3">
                  {categoryCounts.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-[#37352F] dark:text-[#EBE9ED]">{cat.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#757681] dark:text-[#9B9A97]">{cat.count} items</span>
                        <button 
                          onClick={() => handleFetchCategory(cat.category)}
                          disabled={fetchingCategory === cat.category}
                          className="px-3 py-1 bg-[#2383E2] hover:bg-[#2383E2]/90 text-white text-[10px] font-bold rounded-[6px] transition-colors disabled:opacity-50"
                        >
                          {fetchingCategory === cat.category ? 'Fetching...' : 'Get Info'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#F7F7F5] dark:bg-[#202020] flex items-center justify-center mb-4">
                    <Filter className="w-6 h-6 text-[#757681] dark:text-[#9B9A97]" />
                  </div>
                  <p className="text-sm text-[#757681] dark:text-[#9B9A97] mb-4">
                    {dbMode === 'product' 
                      ? 'Check inventory counts to see what\'s available.' 
                      : 'Check knowledge counts to see what\'s available.'}
                  </p>
                  <button 
                    onClick={() => handleCheckCounts()}
                    className="px-4 py-2 bg-[#2383E2] hover:bg-[#2383E2]/90 text-white text-sm font-bold rounded-[12px] transition-all  "
                  >
                    Check Now
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#191919] p-6 rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E]  flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED] uppercase tracking-wider">Activity Logs</h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-[#F7F7F5] dark:bg-[#202020] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <Moon className="w-3 h-3 text-[#757681]" />
                    <span className="text-[10px] font-bold text-[#757681]">Overnight</span>
                    <button 
                      onClick={() => setIsOvernightMode(!isOvernightMode)}
                      className={cn(
                        "w-6 h-3.5 rounded-full relative transition-colors",
                        isOvernightMode ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all",
                        isOvernightMode ? "left-3" : "left-0.5"
                      )} />
                    </button>
                  </div>
                  <button 
                    onClick={() => setLogs([])}
                    className="p-1 hover:bg-[#F7F7F5] dark:hover:bg-[#202020] rounded text-[#757681] dark:text-[#9B9A97]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] p-3 font-mono text-[10px] overflow-y-auto max-h-[300px] no-scrollbar">
                {logs.length === 0 ? (
                  <p className="text-[#9B9A97] italic">No activity yet...</p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, i) => (
                      <div key={i} className="text-[#37352F] dark:text-[#EBE9ED] border-b border-[#E9E9E7]/50 dark:border-[#2E2E2E]/50 pb-1 last:border-0">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manual Scrape Mode */}
        {isManualMode && (
          <div className="flex flex-col gap-6 mb-8">
            <div className="bg-white dark:bg-[#191919] p-6 rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E] ">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardPaste className="w-4 h-4 text-[#2383E2]" />
                <h3 className="font-bold text-sm text-[#37352F] dark:text-[#EBE9ED] uppercase tracking-wider">Manual Scraper (Console Method)</h3>
              </div>

              {/* Console Paste Section */}
              <div className="bg-[#F7F7F5] dark:bg-[#202020] p-6 rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardPaste className="w-4 h-4 text-[#2383E2]" />
                    <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Scraping via Console (Manual Method)</h4>
                  </div>
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97] mb-4">
                    If the automatic scraper is blocked by the target site, you can manually extract data using the browser console. Copy the snippet below, run it on the shop page, and paste the resulting JSON array here.
                  </p>
                  <div className="relative bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] p-4 ">
                    <div className="overflow-x-auto no-scrollbar">
                      <code className="text-[10px] sm:text-xs font-mono text-[#37352F] dark:text-[#EBE9ED] whitespace-pre">
                        {dbMode === 'product' ? `const products = [...document.querySelectorAll('.product')].map(item => ({
  name: item.querySelector('.woocommerce-loop-product__title')?.innerText,
  price: item.querySelector('.price')?.innerText,
  link: item.querySelector('a')?.href,
  image: item.querySelector('img')?.src
}));
JSON.stringify(products);` : `const items = [...document.querySelectorAll('article, .post, .item, .card')].map(item => ({
  title: item.querySelector('h1, h2, h3')?.innerText,
  content: item.innerText,
  link: item.querySelector('a')?.href
}));
JSON.stringify(items);`}
                      </code>
                    </div>
                    <button 
                      onClick={() => {
                        const snippet = dbMode === 'product' 
                          ? "const products = [...document.querySelectorAll('.product')].map(item => ({ name: item.querySelector('.woocommerce-loop-product__title')?.innerText, price: item.querySelector('.price')?.innerText, link: item.querySelector('a')?.href, image: item.querySelector('img')?.src })); JSON.stringify(products);"
                          : "const items = [...document.querySelectorAll('article, .post, .item, .card')].map(item => ({ title: item.querySelector('h1, h2, h3')?.innerText, content: item.innerText, link: item.querySelector('a')?.href })); JSON.stringify(items);";
                        navigator.clipboard.writeText(snippet);
                        toast.success("Snippet copied to clipboard!");
                      }}
                      className="absolute top-3 right-3 p-2 bg-[#F7F7F5] dark:bg-[#2E2E2E] hover:bg-[#E3E2E0] dark:hover:bg-[#3F3F3F] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] transition-colors border border-[#E9E9E7] dark:border-[#2E2E2E]"
                      title="Copy Snippet"
                    >
                      <ClipboardPaste className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Paste Console Output</h4>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-[#757681] dark:text-[#9B9A97]">AI will auto-detect categories for these {dbMode === 'product' ? 'products' : 'items'}.</p>
                    </div>
                  </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <textarea
                    value={consolePaste}
                    onChange={(e) => setConsolePaste(e.target.value)}
                    placeholder={dbMode === 'product' ? 'Paste the JSON array here (e.g., [{"name": "Product Name", ...}])' : 'Paste the JSON array here (e.g., [{"title": "Item Title", ...}])'}
                    className="flex-1 h-24 px-4 py-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none "
                  />
                  <button
                    onClick={handleConsolePaste}
                    disabled={isProcessingPaste || !consolePaste.trim()}
                    className="w-full sm:w-auto px-6 py-4 sm:py-2 bg-[#2383E2] hover:bg-blue-600 text-white text-sm font-bold rounded-[12px] transition-all disabled:opacity-50 flex flex-row sm:flex-col items-center justify-center gap-2 min-w-[120px]  "
                  >
                    {isProcessingPaste ? (
                      <ForgeLoader size={20} />
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Import Data</span>
                      </>
                    )}
                  </button>
                </div>
                </div>
              </div>

              {/* Firecrawl JSON Upload Section */}
              <div className="bg-[#F7F7F5] dark:bg-[#202020] p-6 rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] space-y-4 mt-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="w-4 h-4 text-[#2383E2]" />
                    <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Upload Firecrawl JSON</h4>
                  </div>
                  <p className="text-xs text-[#757681] dark:text-[#9B9A97] mb-4">
                    If you downloaded a JSON output directly from the Firecrawl dashboard, you can upload it here. You can select multiple files at once.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".json"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="firecrawl-json-upload"
                    />
                    <label
                      htmlFor="firecrawl-json-upload"
                      className="cursor-pointer w-full sm:w-auto px-6 py-4 sm:py-2 bg-[#2383E2] hover:bg-blue-600 text-white text-sm font-bold rounded-[12px] transition-all flex items-center justify-center gap-2  "
                    >
                      <Upload className="w-5 h-5" />
                      Select JSON Files
                    </label>
                  </div>
                </div>
              </div>
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
                    <h3 className="font-bold text-xl text-[#37352F] dark:text-[#EBE9ED]">Brand Identity Overview</h3>
                    <p className="text-xs font-bold text-[#757681] dark:text-[#9B9A97] tracking-wider uppercase">Forge AI Insights Engine</p>
                  </div>
                </div>
                <button 
                  onClick={handleGenerateBrandOverview}
                  disabled={isGeneratingOverview || products.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isGeneratingOverview ? <ForgeLoader size={20} /> : <RefreshCw className="w-4 h-4" />}
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
                  <h4 className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED] mb-2">No Brand Identity Yet</h4>
                  <p className="text-sm text-[#757681] dark:text-[#9B9A97] max-w-md mb-6">
                    Ready to build your knowledge base? Fetch some insights using the crawler, then click "Analyze" to generate a professional overview.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Products List Section */}
        {hasSearched && (
          <div className="mt-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-[#9B9A97]" />
                  </div>
                  <input
                    type="text"
                    placeholder={dbMode === 'product' ? "Search products..." : "Search insights..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 sm:py-2 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] sm:rounded-[8px] text-sm"
                  />
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="flex-1 sm:flex-none px-3 py-3 sm:py-2 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] sm:rounded-[8px] text-sm"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={filterOutlet}
                    onChange={(e) => setFilterOutlet(e.target.value)}
                    className="flex-1 sm:flex-none px-3 py-3 sm:py-2 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] sm:rounded-[8px] text-sm"
                  >
                    {outlets.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
            
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
                    {rowProducts.map((product, idx) => {
                      const isSelected = selectedProducts.find(p => p.title === product.title);
                      return (
                        <div key={idx} className="relative group h-full">
                          <DraggableProduct 
                            product={product} 
                            onClick={() => toggleProductSelection(product)} 
                            isSelected={!!isSelected}
                            viewMode="grid"
                            dbMode={dbMode}
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2 z-20 bg-[#2383E2] text-white rounded-full p-1  scale-75 sm:scale-100">
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
                    <h2 className="text-xl font-bold text-[#37352F] dark:text-[#EBE9ED]">Site Map Structure</h2>
                    <p className="text-xs text-[#757681] dark:text-[#9B9A97]">{siteMap.length} unique URLs discovered</p>
                  </div>
                </div>
                <button onClick={() => setIsSiteMapOpen(false)} className="p-2 hover:bg-[#F7F7F5] dark:hover:bg-[#202020] rounded-full transition-colors">
                  <X className="w-5 h-5 text-[#757681]" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {siteMap.map((link, i) => (
                    <div key={i} className="group flex items-center justify-between p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] hover:border-emerald-500/50 transition-all">
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#9B9A97]">URL {i + 1}</span>
                        </div>
                        <span className="text-sm text-[#37352F] dark:text-[#EBE9ED] truncate pr-4 font-mono">{link.url}</span>
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
                <p className="text-xs text-[#757681]">These links were mapped using the initial crawl of {activeBusiness?.targetUrl}.</p>
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
    </div>
  );
}

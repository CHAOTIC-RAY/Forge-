import React, { useState, useEffect, useMemo } from 'react';
import { ForgeLoader } from './ForgeLoader';
import { X, Search, ExternalLink, Download, Trash2, Filter, RefreshCw, PlusCircle, Check, Upload, Save, Moon, Camera } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { HighStockProduct, getCategoryProductCounts, CategoryCount, findProductsByCategory, scrapeScreenshot, getAiSettings } from '../lib/gemini';

export function ProductFinder() {
  const [isCheckingCounts, setIsCheckingCounts] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [hasCheckedCounts, setHasCheckedCounts] = useState(false);
  
  const [products, setProducts] = useState<HighStockProduct[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [liveProducts, setLiveProducts] = useState<HighStockProduct[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const aiSettings = getAiSettings();
  const [manualUrl, setManualUrl] = useState(aiSettings.targetUrl || '');
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
            const newProducts = await scrapeScreenshot(iframe.src, fetchingCategory);
            if (newProducts.length > 0) {
              setLiveProducts(prev => {
                const existingIds = new Set(prev.map(p => p.title));
                const uniqueNew = newProducts.filter(p => !existingIds.has(p.title));
                return [...prev, ...uniqueNew];
              });
              setProducts(prev => {
                const existingIds = new Set(prev.map(p => p.title));
                const uniqueNew = newProducts.filter(p => !existingIds.has(p.title));
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

  // Load from local storage on mount
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const savedProducts = localStorage.getItem('forgeStockCheck');
    const savedCounts = localStorage.getItem('forgeCategoryCounts');
    
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
  }, []);

  // Save to local storage when products/counts change
  useEffect(() => {
    if (hasSearched) {
      try {
        localStorage.setItem('forgeStockCheck', JSON.stringify(products));
      } catch (e) {
        console.error("Failed to save products to localStorage", e);
      }
    }
  }, [products, hasSearched]);
  
  useEffect(() => {
    if (hasCheckedCounts) {
      try {
        localStorage.setItem('forgeCategoryCounts', JSON.stringify(categoryCounts));
      } catch (e) {
        console.error("Failed to save categoryCounts to localStorage", e);
      }
    }
  }, [categoryCounts, hasCheckedCounts]);

  const handleCheckCounts = async () => {
    setIsCheckingCounts(true);
    try {
      const counts = await getCategoryProductCounts();
      setCategoryCounts(counts);
      setHasCheckedCounts(true);
    } catch (error) {
      console.error("Failed to get category counts:", error);
      toast.error("Failed to get category counts. Please check your API key and try again.");
    } finally {
      setIsCheckingCounts(false);
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
      });
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
      return matchCategory && matchOutlet;
    });
  }, [products, filterCategory, filterOutlet]);

  return (
    <div className="flex flex-col bg-transparent">
      {/* Body */}
      <div className="flex flex-col pb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Product Finder</h2>
          <button
            onClick={() => setIsManualMode(!isManualMode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isManualMode
                ? 'bg-[#2383E2] text-white'
                : 'bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED]'
            }`}
          >
            {isManualMode ? 'Back to Auto-Scrape' : 'Manual Scrape Mode'}
          </button>
        </div>

        {isManualMode ? (
          <div className="bg-white dark:bg-[#191919] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] p-6">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={manualUrlInput}
                onChange={(e) => setManualUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setManualUrl(manualUrlInput);
                    setManualScreenshot(null);
                  }
                }}
                className="flex-1 px-3 py-2 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-lg text-sm"
                placeholder="Enter URL to scrape"
              />
              <button
                onClick={() => {
                  setManualUrl(manualUrlInput);
                  setManualScreenshot(null);
                }}
                className="px-4 py-2 bg-[#2383E2] text-white rounded-lg text-sm font-medium"
              >
                Go
              </button>
            </div>
            <div className="flex border-b border-[#E9E9E7] dark:border-[#2E2E2E] mb-4">
              <button
                onClick={() => setManualPreviewMode('live')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  manualPreviewMode === 'live' 
                    ? 'border-[#2383E2] text-[#2383E2]' 
                    : 'border-transparent text-[#888] hover:text-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                Live Preview
              </button>
              <button
                onClick={async () => {
                  setManualPreviewMode('screenshot');
                  if (!manualScreenshot) {
                    setIsCapturingScreenshot(true);
                    try {
                      const response = await fetch(`/api/screenshot?url=${encodeURIComponent(manualUrl)}`);
                      const data = await response.json();
                      if (data.base64) {
                        setManualScreenshot(`data:${data.mimeType || 'image/jpeg'};base64,${data.base64}`);
                      }
                    } catch (e) {
                      console.error('Failed to capture manual screenshot:', e);
                    } finally {
                      setIsCapturingScreenshot(false);
                    }
                  }
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  manualPreviewMode === 'screenshot' 
                    ? 'border-[#2383E2] text-[#2383E2]' 
                    : 'border-transparent text-[#888] hover:text-[#1A1A1A] dark:hover:text-white'
                }`}
              >
                Screenshot Preview
              </button>
            </div>

            {manualPreviewMode === 'live' ? (
              <div className="relative">
                <iframe
                  id="manual-scraper-iframe"
                  src={`/api/proxy-html?url=${encodeURIComponent(manualUrl)}`}
                  className="w-full h-[500px] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-lg"
                  title="Manual Scraper Preview"
                />
                <div className="absolute bottom-4 left-4 right-4 p-3 bg-black/70 backdrop-blur-md rounded-lg border border-white/10 text-xs text-white/90 flex items-center gap-3">
                  <div className="p-1.5 bg-[#2383E2] rounded-full">
                    <Camera className="w-3 h-3" />
                  </div>
                  <p>
                    <b>Stuck on security check?</b> Switch to the <b>"Screenshot Preview"</b> tab or use <b>"Capture & Scrape (AI Vision)"</b> below.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-[500px] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-lg overflow-auto bg-[#F5F5F4] dark:bg-[#1A1A1A] flex items-center justify-center relative">
                {isCapturingScreenshot ? (
                  <div className="flex flex-col items-center gap-3">
                    <ForgeLoader size={32} />
                    <p className="text-sm text-[#888]">Capturing page screenshot...</p>
                  </div>
                ) : manualScreenshot ? (
                  <img 
                    src={manualScreenshot} 
                    alt="Page Screenshot" 
                    className="max-w-none w-full h-auto"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <p className="text-sm text-[#888]">Failed to capture screenshot.</p>
                )}
                <button
                  onClick={async () => {
                    setIsCapturingScreenshot(true);
                    try {
                      const response = await fetch(`/api/screenshot?url=${encodeURIComponent(manualUrl)}`);
                      const data = await response.json();
                      if (data.base64) {
                        setManualScreenshot(`data:${data.mimeType || 'image/jpeg'};base64,${data.base64}`);
                      }
                    } catch (e) {
                      console.error('Failed to capture manual screenshot:', e);
                    } finally {
                      setIsCapturingScreenshot(false);
                    }
                  }}
                  className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-black/80 rounded-full shadow-lg hover:scale-110 transition-transform"
                  title="Recapture Screenshot"
                >
                    {isCapturingScreenshot ? <ForgeLoader size={16} /> : <RefreshCw className="w-4 h-4" />}
                </button>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={async () => {
                  setIsScrapingScreenshot(true);
                  addLog(`📸 Manual Scrape: Analyzing ${manualUrl}...`);
                  try {
                    // 1. Try Direct HTML Scrape first (Best Method: Requests + Parser)
                    addLog(`⚡ Trying Direct HTML Scrape (Requests + Parser)...`);
                    const directResponse = await fetch(`/api/direct-scrape?url=${encodeURIComponent(manualUrl)}`);
                    const directData = await directResponse.json();
                    
                    let newProducts = [];
                    if (directData.products && directData.products.length > 0) {
                      newProducts = directData.products;
                      addLog(`✅ Direct Scrape successful! Extracted ${newProducts.length} products.`);
                    } else {
                      // 2. Fallback to AI Screenshot Scrape
                      addLog(`🔍 Direct Scrape returned no products (possibly blocked). Falling back to AI Screenshot...`);
                      addLog(`📸 Capturing screenshot (this may take 30-60s to bypass security)...`);
                      newProducts = await scrapeScreenshot(manualUrl, 'Manual');
                      if (newProducts.length > 0) {
                        addLog(`✅ AI Screenshot Scrape successful! Extracted ${newProducts.length} products.`);
                      } else {
                        addLog(`🚨 AI Screenshot Scrape failed to find products.`);
                      }
                    }

                    if (newProducts.length > 0) {
                      setProducts(prev => {
                        const existingTitles = new Set(prev.map(p => p.title));
                        const uniqueNew = newProducts.filter(p => !existingTitles.has(p.title));
                        return [...prev, ...uniqueNew];
                      });
                    }
                  } catch (e) {
                    console.error('Manual scrape error:', e);
                    addLog(`🚨 Manual Scrape failed.`);
                  } finally {
                    setIsScrapingScreenshot(false);
                  }
                }}
                disabled={isScrapingScreenshot}
                className="px-4 py-2 bg-[#2383E2] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isScrapingScreenshot ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Scrape Current Page
                  </>
                )}
              </button>
              <button
                onClick={async () => {
                  setIsScrapingScreenshot(true);
                  addLog(`📸 AI Vision Scrape: Capturing screenshot of ${manualUrl}...`);
                  addLog(`⏳ This may take up to 60 seconds to bypass security checks...`);
                  try {
                    const newProducts = await scrapeScreenshot(manualUrl, 'Manual');
                    if (newProducts.length > 0) {
                      setProducts(prev => {
                        const existingTitles = new Set(prev.map(p => p.title));
                        const uniqueNew = newProducts.filter(p => !existingTitles.has(p.title));
                        return [...prev, ...uniqueNew];
                      });
                      addLog(`✅ AI Vision Scrape successful! Extracted ${newProducts.length} products.`);
                    } else {
                      addLog(`🚨 AI Vision Scrape found no products. The page might still be blocked.`);
                    }
                  } catch (e) {
                    console.error('AI Vision scrape error:', e);
                    addLog(`🚨 AI Vision Scrape failed.`);
                  } finally {
                    setIsScrapingScreenshot(false);
                  }
                }}
                disabled={isScrapingScreenshot}
                className="px-4 py-2 bg-[#8B5CF6] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capture & Scrape (AI Vision)
              </button>
              <button
                onClick={() => {
                  const iframe = document.getElementById('manual-scraper-iframe') as HTMLIFrameElement;
                  if (iframe) iframe.src = iframe.src;
                }}
                className="px-4 py-2 bg-[#F5F5F4] dark:bg-[#2E2E2E] text-[#1A1A1A] dark:text-white rounded-lg text-sm font-medium hover:bg-[#E9E9E7] dark:hover:bg-[#3E3E3E] transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <a
                href={manualUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#F5F5F4] dark:bg-[#2E2E2E] text-[#1A1A1A] dark:text-white rounded-lg text-sm font-medium hover:bg-[#E9E9E7] dark:hover:bg-[#3E3E3E] transition-colors flex items-center gap-2 no-underline"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </a>
              <button
                onClick={async () => {
                  setIsRefining(true);
                  addLog(`🔍 Refining: Checking for unavailable products in ${manualUrl}...`);
                  try {
                    // Try direct scrape first for refinement
                    const directResponse = await fetch(`/api/direct-scrape?url=${encodeURIComponent(manualUrl)}`);
                    const directData = await directResponse.json();
                    
                    let currentProducts = [];
                    if (directData.products && directData.products.length > 0) {
                      currentProducts = directData.products;
                    } else {
                      currentProducts = await scrapeScreenshot(manualUrl, 'Manual');
                    }

                    const currentTitles = new Set(currentProducts.map(p => p.title));
                    
                    // Identify products that are in our database but not in the current scrape
                    const unavailableProducts = products.filter(p => !currentTitles.has(p.title));
                    
                    if (unavailableProducts.length > 0) {
                      addLog(`⚠️ Found ${unavailableProducts.length} products that seem unavailable: ${unavailableProducts.map(p => p.title).join(', ')}`);
                    } else {
                      addLog(`✅ All products found in database are still available.`);
                    }
                  } catch (e) {
                    console.error('Refine error:', e);
                    addLog(`🚨 Refine failed.`);
                  } finally {
                    setIsRefining(false);
                  }
                }}
                disabled={isRefining}
                className="px-4 py-2 bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {isRefining ? 'Refining...' : 'Refine Unavailable'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            {!hasCheckedCounts && !isCheckingCounts && (
              <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                <div className="w-24 h-24 bg-[#EFEFED] dark:bg-[#2E2E2E] rounded-full flex items-center justify-center mb-6 border border-[#E9E9E7] dark:border-[#3E3E3E]">
                  <Search className="w-10 h-10 text-[#37352F] dark:text-[#EBE9ED]" />
                </div>
                <h3 className="text-2xl font-bold text-[#37352F] dark:text-[#EBE9ED] mb-3">Ready to check stock?</h3>
                <p className="text-[#787774] dark:text-[#9B9A97] max-w-xs mb-8 text-lg">
                  First, we'll get an accurate count of all products on the target website by category.
                </p>
                
                <button
                  onClick={handleCheckCounts}
                  className="w-full max-w-xs py-3 bg-[#2383E2] hover:bg-[#1D6EB8] text-white rounded-lg font-medium text-base transition-all flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Start Stock Check
                </button>
              </div>
            )}

            {isCheckingCounts && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <ForgeLoader size={48} className="mb-6" />
                <p className="text-[#37352F] dark:text-[#EBE9ED] font-medium text-lg">Counting products...</p>
                <p className="text-[#787774] dark:text-[#9B9A97] mt-2">This might take a few moments.</p>
              </div>
            )}

            {hasCheckedCounts && !isCheckingCounts && (
              <div className="flex flex-col space-y-6">
                {/* Category Counts Section */}
                <div className="bg-white dark:bg-[#191919] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden">
                  <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex justify-between items-center bg-[#F7F7F5] dark:bg-[#202020]">
                    <h3 className="font-semibold text-[#37352F] dark:text-[#EBE9ED]">Categories to Check</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsOvernightMode(!isOvernightMode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          isOvernightMode 
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' 
                            : 'text-[#787774] dark:text-[#9B9A97] hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E]'
                        }`}
                        title={isOvernightMode ? "Overnight Mode is ON (Loops search)" : "Turn on Overnight Mode (Loops search)"}
                      >
                        <Moon className={`w-3.5 h-3.5 ${isOvernightMode ? 'fill-current' : ''}`} />
                        Overnight
                      </button>
                      <button
                        onClick={handleCheckCounts}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#787774] dark:text-[#9B9A97] hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E] rounded-md transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Recheck
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-[#E9E9E7] dark:divide-[#2E2E2E]">
                    {categoryCounts.map((cat, idx) => {
                      const fetchedCount = cat.category === 'All Products' 
                        ? products.length 
                        : products.filter(p => p.type === cat.category).length;
                      const isComplete = fetchedCount >= cat.count && cat.count > 0;
                      const isFetching = fetchingCategory === cat.category;
                      
                      return (
                        <div key={idx} className="p-4 flex flex-col gap-3 hover:bg-[#F7F7F5] dark:hover:bg-[#202020] transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-4">
                              <h4 className="font-medium text-[#37352F] dark:text-[#EBE9ED] text-base leading-tight">{cat.category}</h4>
                              <p className="text-xs text-[#787774] dark:text-[#9B9A97] mt-1">
                                {fetchedCount} / {cat.count} products
                              </p>
                            </div>
                            
                            <div className="shrink-0">
                              {isFetching ? (
                                <button disabled className="flex items-center justify-center px-3 py-1.5 bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] rounded-md text-xs font-medium cursor-not-allowed">
                                  <ForgeLoader size={14} className="mr-1.5" />
                                  Fetching
                                </button>
                              ) : isComplete ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] rounded-md text-xs font-medium">
                                  <Check className="w-3.5 h-3.5" />
                                  Done
                                </div>
                              ) : fetchedCount > 0 ? (
                                <button 
                                  onClick={() => handleFetchCategory(cat.category)}
                                  className="flex items-center justify-center px-3 py-1.5 bg-[#EFEFED] dark:bg-[#2E2E2E] hover:bg-[#E9E9E7] dark:hover:bg-[#3E3E3E] text-[#37352F] dark:text-[#EBE9ED] rounded-md text-xs font-medium transition-colors"
                                >
                                  Continue
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleFetchCategory(cat.category)}
                                  className="flex items-center justify-center px-3 py-1.5 bg-[#2383E2] hover:bg-[#1D6EB8] text-white rounded-md text-xs font-medium transition-colors"
                                >
                                  Get Info
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-[#EFEFED] dark:bg-[#2E2E2E] rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${isComplete ? 'bg-[#787774] dark:bg-[#9B9A97]' : 'bg-[#2383E2]'}`}
                              style={{ width: `${Math.min(100, cat.count > 0 ? (fetchedCount / cat.count) * 100 : 0)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {categoryCounts.length === 0 && (
                      <div className="p-8 text-center text-[#787774] dark:text-[#9B9A97] text-sm">
                        No categories found. Try rechecking.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Preview Iframe */}
        {fetchingCategory && (
          <div className="bg-white dark:bg-[#191919] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden flex flex-col mb-6">
            <div className="p-3 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex justify-between items-center bg-[#F7F7F5] dark:bg-[#202020]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="font-medium text-sm text-[#37352F] dark:text-[#EBE9ED]">Live Scraper Preview: {fetchingCategory}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAutoScraping(!isAutoScraping)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    isAutoScraping 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800' 
                      : 'bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] hover:bg-[#E9E9E7] dark:hover:bg-[#3E3E3E]'
                  }`}
                  title={isAutoScraping ? "Auto-Scrape is ON (Every 15s)" : "Turn on Auto-Scrape"}
                >
                    {isAutoScraping ? <ForgeLoader size={12} /> : <RefreshCw className="w-3 h-3" />}
                  Auto-Scrape
                </button>
                <button 
                  onClick={async () => {
                    const iframe = document.getElementById('scraper-iframe') as HTMLIFrameElement;
                    if (iframe && iframe.src) {
                      setIsScrapingScreenshot(true);
                      addLog(`📸 Taking screenshot and analyzing with AI Vision...`);
                      try {
                        const newProducts = await scrapeScreenshot(iframe.src, fetchingCategory);
                        if (newProducts.length > 0) {
                          setLiveProducts(prev => {
                            const existingIds = new Set(prev.map(p => p.title));
                            const uniqueNew = newProducts.filter(p => !existingIds.has(p.title));
                            return [...prev, ...uniqueNew];
                          });
                          setProducts(prev => {
                            const existingIds = new Set(prev.map(p => p.title));
                            const uniqueNew = newProducts.filter(p => !existingIds.has(p.title));
                            return [...prev, ...uniqueNew];
                          });
                          addLog(`✅ Vision AI extracted ${newProducts.length} products from screenshot.`);
                        } else {
                          addLog(`⚠️ Vision AI couldn't find any products in the screenshot.`);
                        }
                      } catch (e) {
                        addLog(`🚨 Vision AI failed to analyze screenshot.`);
                      } finally {
                        setIsScrapingScreenshot(false);
                      }
                    }
                  }}
                  disabled={isScrapingScreenshot}
                  className="flex items-center gap-1.5 px-2 py-1 bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] rounded text-xs font-medium hover:bg-[#E9E9E7] dark:hover:bg-[#3E3E3E] transition-colors disabled:opacity-50"
                >
                  {isScrapingScreenshot ? <ForgeLoader size={12} /> : <Search className="w-3 h-3" />}
                  Scrape View
                </button>
                <button 
                  onClick={() => {
                    const iframe = document.getElementById('scraper-iframe') as HTMLIFrameElement;
                    if (iframe && iframe.src) {
                      window.open(`https://image.thum.io/get/width/1200/crop/800/${iframe.src}`, '_blank');
                    }
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] rounded text-xs font-medium hover:bg-[#E9E9E7] dark:hover:bg-[#3E3E3E] transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Screenshot
                </button>
                <button 
                  onClick={() => {
                    setFetchingCategory(null);
                    setIsAutoScraping(false);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Close
                </button>
                <span className="text-xs text-[#787774] dark:text-[#9B9A97] ml-2">Bypassing bot detection...</span>
              </div>
            </div>
            <div className="flex flex-row h-[400px]">
              <div className="relative w-2/3 h-full bg-[#EFEFED] dark:bg-[#2E2E2E] border-r border-[#E9E9E7] dark:border-[#2E2E2E]">
                <iframe 
                  id="scraper-iframe"
                  src={fetchingCategory === 'All Products' ? `${getAiSettings().targetUrl || 'https://example.com'}/shop/` : `${getAiSettings().targetUrl || 'https://example.com'}/product-category/${fetchingCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/`}
                  className="w-full h-full border-0 opacity-80"
                  title="Scraper Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-black/20 pointer-events-none">
                  <div className="bg-white/90 dark:bg-[#191919]/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center gap-2">
                    <ForgeLoader size={16} />
                    <span className="text-sm font-medium text-[#37352F] dark:text-[#EBE9ED]">Extracting data...</span>
                  </div>
                </div>
              </div>
              <div className="w-1/3 h-full bg-[#F7F7F5] dark:bg-[#202020] overflow-y-auto p-4">
                <h4 className="text-xs font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider mb-3">Live Extraction ({liveProducts.length})</h4>
                <div className="space-y-2">
                  {liveProducts.slice(-10).reverse().map((p, i) => (
                    <div key={i} className="bg-white dark:bg-[#191919] p-2 rounded border border-[#E9E9E7] dark:border-[#2E2E2E] text-xs">
                      <div className="font-medium text-[#37352F] dark:text-[#EBE9ED] truncate" title={p.title}>{p.title}</div>
                      <div className="text-[#787774] dark:text-[#9B9A97] mt-1">{p.stockInfo}</div>
                    </div>
                  ))}
                  {liveProducts.length === 0 && (
                    <div className="text-xs text-[#787774] dark:text-[#9B9A97] italic text-center mt-8">Waiting for products...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Section */}
        {logs.length > 0 && (
          <div className="mb-8 bg-[#F7F7F5] dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] overflow-hidden flex flex-col">
            <div className="p-3 border-b border-[#E9E9E7] dark:border-[#2E2E2E] flex justify-between items-center">
              <h3 className="font-medium text-[#37352F] dark:text-[#EBE9ED] text-xs">Activity Log</h3>
              <button onClick={() => setLogs([])} className="text-[#787774] hover:text-[#37352F] dark:hover:text-[#EBE9ED] text-xs">Clear</button>
            </div>
            <div className="p-4 max-h-48 overflow-y-auto font-mono text-xs text-[#787774] dark:text-[#9B9A97] space-y-1">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Products List Section */}
        {hasSearched && (
          <div className="mt-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-row gap-3 w-full">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="w-4 h-4 text-[#9B9A97]" />
                  </div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] text-sm rounded-lg focus:ring-2 focus:ring-[#2383E2] focus:border-[#2383E2] block pl-10 p-2.5 appearance-none shadow-sm outline-none transition-colors"
                  >
                    {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
                  </select>
                </div>
                <div className="flex-1 relative">
                  <select
                    value={filterOutlet}
                    onChange={(e) => setFilterOutlet(e.target.value)}
                    className="w-full bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] text-sm rounded-lg focus:ring-2 focus:ring-[#2383E2] focus:border-[#2383E2] block p-2.5 appearance-none shadow-sm outline-none transition-colors"
                  >
                    {outlets.map(o => <option key={o} value={o}>{o === 'All' ? 'All Outlets' : o}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full">
                {/* Export and Clear buttons moved to More Options */}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-24">
              {filteredProducts.map((product, idx) => (
                <div key={idx} className="bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl p-4 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <h3 className="font-medium text-[#37352F] dark:text-[#EBE9ED] line-clamp-2 text-sm leading-tight">{product.title}</h3>
                      <a 
                        href={product.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 bg-[#F7F7F5] dark:bg-[#202020] hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] rounded-md transition-colors flex-shrink-0"
                        title="View on target website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2 py-0.5 bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] text-[11px] font-medium rounded">
                        {product.type}
                      </span>
                      {product.categories?.map((cat, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] text-[11px] font-medium rounded">
                          {cat}
                        </span>
                      ))}
                      <span className="px-2 py-0.5 bg-[#EFEFED] dark:bg-[#2E2E2E] text-[#787774] dark:text-[#9B9A97] text-[11px] font-medium rounded">
                        {product.outlet || 'Forge Enterprises'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-3 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
                    <div className="flex flex-col gap-1">
                      {product.sku && (
                        <div className="flex items-center justify-between text-[11px] text-[#9B9A97] dark:text-[#7D7C78]">
                          <span>SKU</span>
                          <span className="font-mono">{product.sku}</span>
                        </div>
                      )}
                      {product.price && (
                        <div className="flex items-center justify-between text-[11px] text-[#9B9A97] dark:text-[#7D7C78]">
                          <span>Price</span>
                          <span className="font-medium text-[#37352F] dark:text-[#EBE9ED]">{product.price}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#9B9A97] dark:text-[#7D7C78] uppercase tracking-wider">Stock</span>
                        <span className="font-medium text-sm text-[#37352F] dark:text-[#EBE9ED]">
                          {typeof product.stockInfo === 'object' && product.stockInfo !== null
                            ? JSON.stringify(product.stockInfo) 
                            : String(product.stockInfo || 'In Stock')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-16 text-center text-[#787774] dark:text-[#9B9A97] bg-[#F7F7F5] dark:bg-[#202020] rounded-xl border border-dashed border-[#E9E9E7] dark:border-[#2E2E2E]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-6 h-6 text-[#9B9A97] mb-2 opacity-50" />
                    <p className="font-medium text-[#37352F] dark:text-[#EBE9ED] text-sm">No products match your filters</p>
                    <p className="text-xs">Try adjusting your category or outlet selection.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

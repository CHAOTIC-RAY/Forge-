import React, { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';

type ScraperMethod = 'api' | 'crawler' | 'recommended';

const SCRIPTS: Record<ScraperMethod, string> = {
  api: `async function fetchAllProductsViaAPI() {
    let allProducts = [];
    let page = 1;
    let totalPages = 1;
    
    console.log("Starting extraction via WooCommerce Store API...");

    while (page <= totalPages) {
        try {
            // Fetch 100 products per page
            let response = await fetch(\`/wp-json/wc/store/products?per_page=100&page=\${page}\`);
            
            if (!response.ok) {
                console.error(\`API blocked or unavailable. Server returned: \${response.status}\`);
                return; // Stop if the API is restricted
            }
            
            // Get total pages from the response headers
            totalPages = parseInt(response.headers.get('X-WP-TotalPages')) || 1;
            
            let products = await response.json();
            
            products.forEach(p => {
                // Formatting the price
                let rawPrice = parseInt(p.prices.price);
                let minorUnit = parseInt(p.prices.currency_minor_unit);
                let formattedPrice = rawPrice ? (rawPrice / (10 ** minorUnit)).toFixed(2) : "0.00";

                allProducts.push({
                    title: p.name,
                    sku: p.sku,
                    price: \`\${p.prices.currency_prefix}\${formattedPrice}\`,
                    short_description: p.short_description.replace(/(<([^>]+)>)/gi, "").trim(),
                    link: p.permalink
                });
            });
            
            console.log(\`Fetched page \${page} of \${totalPages}... (\${allProducts.length} products total so far)\`);
            page++;
            
        } catch (e) {
            console.error("Error fetching data:", e);
            break;
        }
    }
    
    if (allProducts.length > 0) {
        downloadJSON(allProducts, "Products_API.json");
    }
}

function downloadJSON(data, filename) {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 4));
    let downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    console.log("Download complete!");
}

// Run the script
fetchAllProductsViaAPI();`,

  crawler: `async function crawlAllProducts() {
    let allProducts = [];
    let currentPage = 1;
    let hasNextPage = true;
    
    // The default WooCommerce query parameter to list all products
    let baseUrl = window.location.origin + '/?post_type=product&paged=';

    console.log("Starting frontend crawler. This may take a few minutes...");

    while (hasNextPage) {
        try {
            console.log(\`Crawling page \${currentPage}...\`);
            let response = await fetch(baseUrl + currentPage);
            
            if (!response.ok) {
                console.log(\`Reached end of pages or got blocked. Stopping at page \${currentPage}.\`);
                break;
            }
            
            let text = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(text, "text/html"); 
            
            // Using the specific Elementor/WooCommerce classes found in your HTML
            let products = doc.querySelectorAll('.product, .e-loop-item.product');
            
            if (products.length === 0) {
                console.log("No more products found. Finishing up...");
                break;
            }

            products.forEach(product => {
                // Get Title
                let titleEl = product.querySelector('.woocommerce-loop-product__title, .product_title');
                let title = titleEl ? titleEl.innerText.trim() : "Unknown Title";
                
                // Get Link
                let linkEl = product.querySelector('a.woocommerce-LoopProduct-link, h2 a');
                let link = linkEl ? linkEl.href : "";
                
                // Get Price (ignores "GST Included" text)
                let priceEl = product.querySelector('.price .woocommerce-Price-amount bdi');
                let price = priceEl ? priceEl.innerText.trim() : "N/A";
                
                // Get SKU
                let skuEl = product.querySelector('.sku');
                let sku = skuEl ? skuEl.innerText.trim() : "N/A";
                
                // Get Description (if available on archive views)
                let descEl = product.querySelector('.P_description');
                let short_description = descEl ? descEl.innerText.trim() : "";

                // Push to array if it's not a duplicate
                if(link && !allProducts.some(p => p.link === link)) {
                    allProducts.push({ title, sku, price, short_description, link });
                }
            });

            // Check if there is a 'next' button on the page pagination
            let nextButton = doc.querySelector('.next.page-numbers');
            if (nextButton) {
                currentPage++;
                // Wait 1 second to avoid getting blocked by Cloudflare firewall
                await new Promise(r => setTimeout(r, 1000));
            } else {
                hasNextPage = false;
            }

        } catch (e) {
            console.error("Error during crawling:", e);
            break;
        }
    }

    if (allProducts.length > 0) {
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allProducts, null, 4));
        let downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "Products_Crawled.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        console.log(\`Crawl complete! Downloaded \${allProducts.length} products.\`);
    } else {
        console.log("No products were scraped.");
    }
}

// Run the script
crawlAllProducts();`,

  recommended: `async function crawlAllProducts() {
    let allProducts = [];
    
    // Start scraping from the exact page you are currently on
    let currentUrl = window.location.href; 
    let pageNum = 1;

    console.log("Starting crawler. Please wait, this will take a moment...");

    while (currentUrl) {
        try {
            console.log(\`Crawling page \${pageNum}: \${currentUrl}\`);
            let response = await fetch(currentUrl);
            
            if (!response.ok) {
                console.log(\`Failed to fetch page. Status: \${response.status}. Stopping here.\`);
                break;
            }
            
            let text = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(text, "text/html"); 
            
            // Find all product blocks on this specific page
            let products = doc.querySelectorAll('.product, .e-loop-item.product');
            
            if (products.length === 0) {
                console.log("No products found on this page. Reached the end.");
                break;
            }

            let addedOnThisPage = 0;

            products.forEach(product => {
                // Get Title
                let titleEl = product.querySelector('.woocommerce-loop-product__title, .product_title');
                let title = titleEl ? titleEl.innerText.trim() : "Unknown Title";
                
                // Get Link
                let linkEl = product.querySelector('a.woocommerce-LoopProduct-link, h2 a');
                let link = linkEl ? linkEl.href : "";
                
                // Get Price
                let priceEl = product.querySelector('.price .woocommerce-Price-amount bdi');
                let price = priceEl ? priceEl.innerText.trim() : "N/A";
                
                // Get SKU (if displayed in grid)
                let skuEl = product.querySelector('.sku');
                let sku = skuEl ? skuEl.innerText.trim() : "N/A";

                // Push to array if it's a valid link and not already in our list
                if(link && !allProducts.some(p => p.link === link)) {
                    allProducts.push({ title, sku, price, link });
                    addedOnThisPage++;
                }
            });
            
            console.log(\`Found \${addedOnThisPage} products on page \${pageNum}. (Total: \${allProducts.length})\`);

            // Find the URL for the "Next" page button
            let nextButton = doc.querySelector('a.next.page-numbers, a.next, nav.woocommerce-pagination a.next');
            
            if (nextButton && nextButton.href) {
                currentUrl = nextButton.href; // Update the URL to the next page
                pageNum++;
                
                // Wait 1.5 seconds between pages to prevent Cloudflare from blocking you
                await new Promise(r => setTimeout(r, 1500));
            } else {
                console.log("No 'Next' button found on this page. Finishing up...");
                currentUrl = null; // This breaks the loop
            }

        } catch (e) {
            console.error("Error during crawling:", e);
            break;
        }
    }

    // Download the file
    if (allProducts.length > 0) {
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allProducts, null, 4));
        let downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "Products_By_Category.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        console.log(\`Crawl complete! Successfully downloaded \${allProducts.length} products.\`);
    } else {
        console.log("No products were scraped.");
    }
}

// Run the script
crawlAllProducts();`,
};

export function WooCommerceScraperSnippet() {
  const [method, setMethod] = useState<ScraperMethod>('recommended');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SCRIPTS[method]);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-2">
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value as ScraperMethod)}
        className="w-full px-3 py-2 border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[10px] text-xs bg-white dark:bg-[#191919]"
        title="Select scraping method"
      >
        <option value="recommended">Method 3 (Recommended) - Current page crawler</option>
        <option value="api">Method 1 - WooCommerce Store API</option>
        <option value="crawler">Method 2 - Frontend crawler (paginated)</option>
      </select>
      <pre className="bg-white dark:bg-[#191919] p-3 rounded-[8px] text-[9px] font-mono overflow-x-auto border border-[#E9E9E7] dark:border-[#2E2E2E] max-h-[300px]">
        {SCRIPTS[method]}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="px-3 py-1.5 border border-brand text-brand rounded-[8px] text-[10px] font-bold flex items-center gap-2"
        title="Copy script to clipboard"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? 'Copied!' : 'Copy to clipboard'}
      </button>
    </div>
  );
}
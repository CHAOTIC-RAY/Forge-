import { Router } from "express";
import axios from "axios";
import * as cheerio from "cheerio";

export const scraperRouter = Router();

scraperRouter.get("/direct-scrape", async (req, res) => {
  const { q, url, targetUrl } = req.query;
  const baseUrl = targetUrl ? (targetUrl as string) : 'https://example.com';
  const searchUrl = url 
    ? (url as string)
    : (q 
        ? `${baseUrl}/?s=${encodeURIComponent(q as string)}&post_type=product`
        : `${baseUrl}/shop/`);

  try {
    const response = await axios.get(searchUrl, { 
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache'
      }
    });

    const $ = cheerio.load(response.data);
    const products: any[] = [];

    $('.product').each((_, el) => {
      const $el = $(el);
      let title = $el.find('.woocommerce-loop-product__title').text().trim() || $el.find('h2').text().trim() || $el.find('.product-title').text().trim();
      const link = $el.find('a').attr('href');
      const price = $el.find('.price').text().trim().replace(/\s+/g, ' ');
      const image = $el.find('img').attr('src') || $el.find('img').attr('data-src');
      const stockInfo = $el.find('.ast-shop-product-out-of-stock').length > 0 
        ? "Out of Stock" 
        : ($el.find('.stock').text().trim() || (price ? `In Stock — ${price}` : "In Stock"));

      if (title && link && link.includes('/product/')) {
        products.push({ title, link, price, image, stockInfo, updatedAt: Date.now() });
      }
    });

    return res.json({ products, count: products.length, url: searchUrl });
  } catch (e: any) {
    return res.status(500).json({ error: "Direct scrape failed", details: e.message, url: searchUrl });
  }
});

scraperRouter.get("/news", async (req, res) => {
  const { q, lang, region } = req.query;
  if (!q) return res.status(400).json({ error: "Query parameter is required" });

  const SEARXNG_URL = process.env.SEARXNG_URL || "https://searx.be";
  let searxngUrl = `${SEARXNG_URL}/search?q=${encodeURIComponent(q as string)}&format=json&engines=google+news`;
  if (lang) searxngUrl += `&language=${lang}`;
  if (region) searxngUrl += `&region=${region}`;

  try {
    const response = await axios.get(searxngUrl, { timeout: 15000 });
    res.json(response.data);
  } catch (e: any) {
    res.status(500).json({ error: "News search failed", details: e.message });
  }
});

scraperRouter.get("/screenshot", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    // Using thum.io as a lightweight screenshot service to avoid puppeteer size issues
    const screenshotUrl = `https://image.thum.io/get/width/1200/crop/800/${url}`;
    const response = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    res.json({ base64, mimeType: 'image/jpeg' });
  } catch (e: any) {
    res.status(500).json({ error: "Screenshot failed", details: e.message });
  }
});

scraperRouter.get("/proxy-html", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const response = await axios.get(url as string, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    
    // Inject a script to handle relative links and form submissions if needed
    let html = response.data;
    const baseUrl = new URL(url as string).origin;
    
    // Basic link rewriting
    html = html.replace(/(href|src)="\/([^"]*)"/g, `$1="${baseUrl}/$2"`);
    
    res.send(html);
  } catch (e: any) {
    res.status(500).send(`Error proxying URL: ${e.message}`);
  }
});

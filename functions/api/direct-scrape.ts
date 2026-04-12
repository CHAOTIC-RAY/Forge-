import * as cheerio from "cheerio";

export const onRequestGet: PagesFunction = async ({ request }) => {
  const urlParams = new URL(request.url).searchParams;
  const q = urlParams.get("q");
  const url = urlParams.get("url");
  const targetUrl = urlParams.get("targetUrl");

  const baseUrl = targetUrl || 'https://example.com';
  const searchUrl = url 
    ? url
    : (q 
        ? `${baseUrl}/?s=${encodeURIComponent(q)}&post_type=product`
        : `${baseUrl}/shop/`);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Direct scrape failed", status: response.status }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const products: any[] = [];

    $('.product').each((_, el) => {
      const $el = $(el);
      let title = $el.find('.woocommerce-loop-product__title').text().trim() || $el.find('h2').text().trim() || $el.find('.product-title').text().trim();
      const productLink = $el.find('a').attr('href');
      const price = $el.find('.price').text().trim().replace(/\s+/g, ' ');
      const image = $el.find('img').attr('src') || $el.find('img').attr('data-src');
      const stockInfo = $el.find('.ast-shop-product-out-of-stock').length > 0 
        ? "Out of Stock" 
        : ($el.find('.stock').text().trim() || (price ? `In Stock — ${price}` : "In Stock"));

      if (title && productLink && productLink.includes('/product/')) {
        products.push({ title, link: productLink, price, image, stockInfo, updatedAt: Date.now() });
      }
    });

    return new Response(JSON.stringify({ products, count: products.length, url: searchUrl }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Direct scrape failed", details: e.message, url: searchUrl }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

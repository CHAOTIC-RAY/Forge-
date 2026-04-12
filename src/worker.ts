import * as cheerio from "cheerio";

export interface Env {
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  GEMINI_API_KEY: string;
  GROQ_API_KEY: string;
  ASSETS: { fetch: typeof fetch };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // Validate Environment Variables
    const requiredEnv = [
      'CLOUDINARY_CLOUD_NAME', 
      'CLOUDINARY_API_KEY', 
      'CLOUDINARY_API_SECRET',
      'GEMINI_API_KEY'
    ];
    const missingEnv = requiredEnv.filter(k => !env[k as keyof Env]);
    
    if (missingEnv.length > 0) {
      console.error(`[Worker] Missing Environment Variables: ${missingEnv.join(', ')}`);
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ 
          error: "Server Configuration Error", 
          details: `Missing environment variables: ${missingEnv.join(', ')}. Please set these in your Cloudflare Dashboard (Settings > Variables).` 
        }), { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json', 
            'Access-Control-Allow-Origin': '*' 
          }
        });
      }
    }
      try {
        // GET /api/config
        if (path === '/api/config' && request.method === 'GET') {
          return new Response(JSON.stringify({
            geminiApiKey: env.GEMINI_API_KEY,
            groqApiKey: env.GROQ_API_KEY,
            cloudinaryCloudName: env.CLOUDINARY_CLOUD_NAME
          }), {
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }

        // POST /api/cloudinary/upload
        if (path === '/api/cloudinary/upload' && request.method === 'POST') {
          const formData = await request.formData();
          const image = formData.get('image') as File;

          if (!image) {
            return new Response(JSON.stringify({ error: "No image file provided" }), { status: 400 });
          }

          const timestamp = Math.floor(Date.now() / 1000);
          const folder = "forge_posts";
          const strToSign = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
          console.log(`[Cloudinary] Signature String: folder=${folder}&timestamp=${timestamp}*** (secret masked)`);
          
          const encoder = new TextEncoder();
          const data = encoder.encode(strToSign);
          const hashBuffer = await crypto.subtle.digest("SHA-1", data);
          const signature = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          console.log(`[Cloudinary] Generated Signature: ${signature}`);

          const cloudFormData = new FormData();
          cloudFormData.append('file', image);
          cloudFormData.append('api_key', env.CLOUDINARY_API_KEY);
          cloudFormData.append('timestamp', timestamp.toString());
          cloudFormData.append('folder', folder);
          cloudFormData.append('signature', signature);

          console.log(`[Cloudinary] Dispatching upload to ${env.CLOUDINARY_CLOUD_NAME}...`);
          const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: cloudFormData
          });

          const result: any = await uploadRes.json();
          console.log(`[Cloudinary] Response Status: ${uploadRes.status}`, result.error || 'Success');

          return new Response(JSON.stringify(result), {
            status: uploadRes.status,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }

        // GET /api/proxy-image?url=...
        if (path === '/api/proxy-image' && request.method === 'GET') {
          const imageUrl = url.searchParams.get("url");
          if (!imageUrl) return new Response("URL required", { status: 400 });

          const imgRes = await fetch(imageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          
          if (!imgRes.ok) return new Response("Failed to fetch image", { status: imgRes.status });

          return new Response(imgRes.body, {
            headers: { 
              'Content-Type': imgRes.headers.get('Content-Type') || 'image/png',
              'Access-Control-Allow-Origin': '*' 
            }
          });
        }

        // GET /api/direct-scrape?q=...&targetUrl=...
        if (path === '/api/direct-scrape' && request.method === 'GET') {
          const q = url.searchParams.get("q");
          const targetUrl = url.searchParams.get("targetUrl") || 'https://example.com';
          const searchUrl = q ? `${targetUrl}/?s=${encodeURIComponent(q)}&post_type=product` : `${targetUrl}/shop/`;

          const scrapeRes = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });

          if (!scrapeRes.ok) return new Response("Scrape failed", { status: 500 });
          
          const html = await scrapeRes.text();
          const $ = cheerio.load(html);
          const products: any[] = [];

          $('.product').each((_, el) => {
            const $el = $(el);
            const title = $el.find('.woocommerce-loop-product__title').text().trim() || $el.find('h2').text().trim();
            const link = $el.find('a').attr('href');
            const price = $el.find('.price').text().trim();
            const image = $el.find('img').attr('src');

            if (title && link) {
              products.push({ title, link, price, image });
            }
          });

          return new Response(JSON.stringify({ products, count: products.length }), {
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }

        return new Response(JSON.stringify({ error: "Route not found" }), { status: 404 });

      } catch (err: any) {
        return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Pass everything else to Assets
      return env.ASSETS.fetch(request);
    }
  };

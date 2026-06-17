import * as cheerio from "cheerio";
import { patchEsrganOnnxOutputDims } from "./lib/esrganOnnxPatch";
import { discoverLinksWorker, htmlToSimpleMarkdown } from "./lib/lightweightHtml";
import { handleSupabaseTokenExchange } from "./lib/handleSupabaseTokenExchange";
import { handleFirestoreMigrateBatch, handleMigratePrefetchProfiles, handleMigrateRepairOwnership } from "./lib/handleFirestoreMigrate";

export interface Env {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  SUPABASE_JWT_SECRET?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  /** Alias for SUPABASE_SERVICE_ROLE_KEY */
  SUPABASE_SERVICE_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_API_KEY?: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  GEMINI_API_KEY: string;
  GROQ_API_KEY: string;
  FIRECRAWL_API_KEY: string;
  ONEDRIVE_CLIENT_ID: string;
  ONEDRIVE_CLIENT_SECRET: string;
  ONEDRIVE_REDIRECT_URI: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  ASSETS: { fetch: typeof fetch };
}

/**
 * Static asset `_headers` is not always applied to HTML on Workers + ASSETS.
 * Any COEP `require-corp` / `credentialless` (or cached old deploy) blocks cross-origin
 * images (Cloudinary), Puter (`js.puter.com`), and placeholders — Chrome reports
 * NotSameOriginAfterDefaultedToSameOriginByCoep. Force permissive document headers on HTML.
 */
function htmlResponseWithoutCoepIsolation(assetResponse: Response): Response {
  const ct = assetResponse.headers.get('Content-Type') || '';
  if (!ct.includes('text/html')) {
    return assetResponse;
  }
  const headers = new Headers(assetResponse.headers);
  headers.delete('Cross-Origin-Embedder-Policy');
  headers.delete('Cross-Origin-Opener-Policy');
  headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
  headers.set('Cache-Control', 'private, no-cache, must-revalidate');
  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}

/** Inject public client env (Supabase) into HTML before the app bundle loads. */
async function htmlResponseWithClientEnv(assetResponse: Response, env: Env): Promise<Response> {
  const base = htmlResponseWithoutCoepIsolation(assetResponse);
  const ct = base.headers.get('Content-Type') || '';
  if (!ct.includes('text/html')) {
    return base;
  }

  const supabaseUrl = env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey) {
    return base;
  }

  let html = await base.text();
  const payload = JSON.stringify({
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
  });
  const injection = `<script>window.__FORGE_ENV__=${payload};</script>`;
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>${injection}`);
  } else {
    html = injection + html;
  }

  const headers = new Headers(base.headers);
  return new Response(html, {
    status: base.status,
    statusText: base.statusText,
    headers,
  });
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

    // We won't globally block all /api/ routes anymore.
    // Instead, we'll check required variables per-route.
    const missingCloudinary = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(k => !env[k as keyof Env]);
    const missingGemini = !env.GEMINI_API_KEY;

    try {
      // GET /api/config
      if (path === '/api/config' && request.method === 'GET') {
        return new Response(JSON.stringify({
          hasGeminiApiKey: !!env.GEMINI_API_KEY,
          hasGroqApiKey: !!env.GROQ_API_KEY,
          cloudinaryCloudName: env.CLOUDINARY_CLOUD_NAME || null,
          supabaseUrl: env.VITE_SUPABASE_URL || null,
          supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || null,
          hasSupabaseAuthBridge: !!env.SUPABASE_JWT_SECRET,
          _missingCloudinary: missingCloudinary,
          _missingGemini: missingGemini
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // POST /api/auth/supabase-token — exchange verified Firebase ID token for Supabase JWT
      if (path === '/api/auth/supabase-token') {
        return handleSupabaseTokenExchange(request, env);
      }

      // GET /api/migrate/prefetch-profiles — load existing Supabase profile IDs before migration
      if (path === '/api/migrate/prefetch-profiles') {
        return handleMigratePrefetchProfiles(request, env);
      }

      // POST /api/migrate/repair-ownership — link migrated businesses to the signed-in profile
      if (path === '/api/migrate/repair-ownership') {
        return handleMigrateRepairOwnership(request, env);
      }

      // POST /api/migrate/supabase-batch — service-role upsert for Firestore migration
      if (path === '/api/migrate/supabase-batch') {
        return handleFirestoreMigrateBatch(request, env);
      }

      // Proxy for Gemini API
      if (path.startsWith('/api/gemini/') && request.method === 'POST') {
        const geminiPath = path.replace('/api/gemini/', '');
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Gemini API key is not configured on the server" }), { status: 500 });
        }
        
        const targetUrl = new URL(`https://generativelanguage.googleapis.com/${geminiPath}`);
        // Copy all search params (like key=...)
        url.searchParams.forEach((value, key) => {
          targetUrl.searchParams.append(key, value);
        });
        // Ensure API key is set
        targetUrl.searchParams.set('key', apiKey);

        const proxyReq = new Request(targetUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body
        });
        
        // Remove host header so fetch sets it correctly
        proxyReq.headers.delete('host');

        const response = await fetch(proxyReq);
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        return newResponse;
      }

      // Proxy for Groq API
      if (path === '/api/groq' && request.method === 'POST') {
        const apiKey = env.GROQ_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Groq API key is not configured on the server" }), { status: 500 });
        }

        const proxyReq = new Request('https://api.groq.com/openai/v1/chat/completions', {
          method: request.method,
          headers: request.headers,
          body: request.body
        });
        
        proxyReq.headers.set('Authorization', `Bearer ${apiKey}`);
        proxyReq.headers.delete('host');

        const response = await fetch(proxyReq);
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        return newResponse;
      }

      // POST /api/media/upload
      if ((path === '/api/media/upload' || path === '/api/media/upload/') && request.method.toUpperCase() === 'POST') {
          const formData = await request.formData();
          const image = formData.get('image') as File;
          
          const cloudName = formData.get('cloudName') as string || env.CLOUDINARY_CLOUD_NAME;
          const apiKey = formData.get('apiKey') as string || env.CLOUDINARY_API_KEY;
          const apiSecret = formData.get('apiSecret') as string || env.CLOUDINARY_API_SECRET;

          if (!cloudName || !apiKey || !apiSecret) {
            return new Response(JSON.stringify({ 
              error: "Server Configuration Error", 
              details: `Missing Cloudinary variables. Please provide them in Settings or set them in your Cloudflare Dashboard.` 
            }), { 
              status: 500,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }

          if (!image) {
            return new Response(JSON.stringify({ error: "No image file provided" }), { status: 400 });
          }

          const timestamp = Math.floor(Date.now() / 1000);
          const folder = "forge_posts";
          const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
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
          cloudFormData.append('api_key', apiKey);
          cloudFormData.append('timestamp', timestamp.toString());
          cloudFormData.append('folder', folder);
          cloudFormData.append('signature', signature);

          console.log(`[Cloudinary] Dispatching upload to ${cloudName}...`);
          const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
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

        // GET|HEAD /api/hf-proxy/mlc-ai/<model>/... — HuggingFace weights for WebLLM (CORS + Range)
        if (path.startsWith('/api/hf-proxy/')) {
          const hfSubPath = path.slice('/api/hf-proxy/'.length);
          if (!hfSubPath.startsWith('mlc-ai/')) {
            return new Response(JSON.stringify({ error: 'Only mlc-ai HuggingFace repos are allowed' }), {
              status: 403,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }

          const targetUrl = new URL(`https://huggingface.co/${hfSubPath}`);
          url.searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value));

          const forwardHeaders: Record<string, string> = {
            'User-Agent': 'Forge-WebLLM-Proxy/1.0 (Cloudflare Worker)',
          };
          const range = request.headers.get('Range');
          if (range) forwardHeaders['Range'] = range;

          const hfRes = await fetch(targetUrl.toString(), {
            method: request.method === 'HEAD' ? 'HEAD' : 'GET',
            headers: forwardHeaders,
          });

          const outHeaders = new Headers();
          for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'cache-control']) {
            const v = hfRes.headers.get(key);
            if (v) outHeaders.set(key, v);
          }
          outHeaders.set('Access-Control-Allow-Origin', '*');
          outHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          outHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type');
          outHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
          outHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
          if (!outHeaders.has('cache-control') && request.method === 'GET') {
            outHeaders.set('Cache-Control', 'public, max-age=86400');
          }

          return new Response(request.method === 'HEAD' ? null : hfRes.body, {
            status: hfRes.status,
            headers: outHeaders,
          });
        }

        // GET|HEAD /api/esrgan-model — Nomos2 ESRGAN ONNX (GitHub releases lack CORS)
        if (path === '/api/esrgan-model' && (request.method === 'GET' || request.method === 'HEAD')) {
          const upstream =
            'https://github.com/Phhofm/models/releases/download/4xNomos2_otf_esrgan/4xNomos2_otf_esrgan_fp16_opset17.onnx';

          const ghRes = await fetch(upstream, {
            method: 'GET',
            headers: {
              'User-Agent': 'Forge-ESRGAN-Proxy/1.0 (Cloudflare Worker)',
            },
          });

          if (!ghRes.ok) {
            return new Response(`Failed to fetch model: ${ghRes.status}`, { status: ghRes.status });
          }

          const raw = await ghRes.arrayBuffer();
          const patched = patchEsrganOnnxOutputDims(raw);

          const outHeaders = new Headers();
          outHeaders.set('Content-Type', 'application/octet-stream');
          outHeaders.set('Content-Length', String(patched.byteLength));
          outHeaders.set('Access-Control-Allow-Origin', '*');
          outHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          outHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
          outHeaders.set('Access-Control-Expose-Headers', 'Content-Length');
          outHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
          outHeaders.set('Cache-Control', 'public, max-age=604800');

          return new Response(request.method === 'HEAD' ? null : patched, {
            status: 200,
            headers: outHeaders,
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
              'Access-Control-Allow-Origin': '*',
              'Cross-Origin-Resource-Policy': 'cross-origin',
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }

        // POST /api/map
        if (path === '/api/map' && request.method === 'POST') {
          const body: any = await request.json();
          const { url: targetUrl, limit, apiKey } = body;
          if (!targetUrl) {
            return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
          }

          const firecrawlKey = apiKey || env.FIRECRAWL_API_KEY;
          if (firecrawlKey) {
            try {
              const response = await fetch('https://api.firecrawl.dev/v2/map', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${firecrawlKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: targetUrl, limit: limit || 5000, sitemap: "include" })
              });
              const data = await response.json();
              return new Response(JSON.stringify({ ...data, provider: 'firecrawl' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
              });
            } catch (e) {
              console.warn('[map] Firecrawl failed, using local discovery');
            }
          }

          const links = await discoverLinksWorker(targetUrl, Math.min(limit || 500, 300), 2);
          return new Response(JSON.stringify({
            success: true,
            links,
            provider: 'local',
            message: firecrawlKey ? 'Firecrawl map failed; used local discovery' : 'No Firecrawl key — used local discovery',
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // POST /api/firecrawl-scrape
        if (path === '/api/firecrawl-scrape' && request.method === 'POST') {
          const body: any = await request.json();
          const { url: targetUrl, apiKey, onlyMainContent = true, waitFor = 5000 } = body;
          if (!targetUrl) {
            return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
          }

          const firecrawlKey = apiKey || env.FIRECRAWL_API_KEY;
          if (firecrawlKey) {
            try {
              const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${firecrawlKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: targetUrl, formats: ["markdown"], onlyMainContent, waitFor })
              });
              const data = await response.json();
              if (data?.data?.markdown) {
                return new Response(JSON.stringify({
                  success: true,
                  data: data.data,
                  provider: 'firecrawl',
                }), {
                  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
              }
            } catch (e) {
              console.warn('[scrape] Firecrawl failed, using fetch fallback');
            }
          }

          try {
            const pageRes = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ForgeCatalogue/1.0)',
                Accept: 'text/html',
              },
              redirect: 'follow',
            });
            if (!pageRes.ok) {
              return new Response(JSON.stringify({ success: false, error: `HTTP ${pageRes.status}` }), { status: 500 });
            }
            const html = await pageRes.text();
            const $ = cheerio.load(html);
            const title = $('title').first().text().trim();
            const markdown = htmlToSimpleMarkdown(html);
            return new Response(JSON.stringify({
              success: true,
              data: { markdown, metadata: { title, sourceURL: targetUrl } },
              provider: 'fetch',
            }), {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          } catch (e: any) {
            return new Response(JSON.stringify({ success: false, error: e?.message || 'Scrape failed' }), { status: 500 });
          }
        }

        // POST /api/firecrawl-scrape-batch
        if (path === '/api/firecrawl-scrape-batch' && request.method === 'POST') {
          const body: any = await request.json();
          const { urls, apiKey, onlyMainContent = true, waitFor = 5000 } = body;
          const firecrawlKey = apiKey || env.FIRECRAWL_API_KEY;
          const results: any[] = [];

          for (const targetUrl of (urls || []).slice(0, 40)) {
            try {
              let markdown: string | undefined;
              let metadata: any;
              let provider = 'fetch';

              if (firecrawlKey) {
                const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${firecrawlKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ url: targetUrl, formats: ["markdown"], onlyMainContent, waitFor })
                });
                const data = await response.json();
                if (data?.data?.markdown) {
                  markdown = data.data.markdown;
                  metadata = data.data.metadata;
                  provider = 'firecrawl';
                }
              }

              if (!markdown) {
                const pageRes = await fetch(targetUrl, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ForgeCatalogue/1.0)', Accept: 'text/html' },
                  redirect: 'follow',
                });
                if (pageRes.ok) {
                  const html = await pageRes.text();
                  const $ = cheerio.load(html);
                  markdown = htmlToSimpleMarkdown(html);
                  metadata = { title: $('title').first().text().trim(), sourceURL: targetUrl };
                  provider = 'fetch';
                }
              }

              if (markdown) {
                results.push({ url: targetUrl, markdown, metadata, provider });
              } else {
                results.push({ url: targetUrl, error: 'Scrape failed' });
              }
            } catch (e: any) {
              results.push({ url: targetUrl, error: e?.message || 'Scrape failed' });
            }
            await new Promise((r) => setTimeout(r, 400));
          }
          return new Response(JSON.stringify({ success: true, results }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // In-memory local crawl jobs (worker isolate — best-effort)
        const localCrawlJobs = (globalThis as any).__forgeLocalCrawlJobs ||= new Map<string, any>();

        // POST /api/crawl
        if (path === '/api/crawl' && request.method === 'POST') {
          const body: any = await request.json();
          const { url: targetUrl, limit, apiKey, includePaths, excludePaths } = body;
          if (!targetUrl) {
            return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
          }

          const firecrawlKey = apiKey || env.FIRECRAWL_API_KEY;
          if (!firecrawlKey) {
            const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            localCrawlJobs.set(id, { id, status: 'scraping', data: [] });

            (async () => {
              const job = localCrawlJobs.get(id);
              try {
                const links = await discoverLinksWorker(targetUrl, Math.min(limit || 50, 80), 2);
                let urls = links.map((l) => l.url);
                if (Array.isArray(includePaths) && includePaths.length) {
                  urls = urls.filter((u) => includePaths.some((p: string) => u.includes(p)));
                }
                if (Array.isArray(excludePaths) && excludePaths.length) {
                  urls = urls.filter((u) => !excludePaths.some((p: string) => u.includes(p)));
                }
                urls = urls.slice(0, limit || 50);
                if (!urls.length) urls = [targetUrl];

                for (const pageUrl of urls) {
                  try {
                    const pageRes = await fetch(pageUrl, {
                      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ForgeCatalogue/1.0)', Accept: 'text/html' },
                      redirect: 'follow',
                    });
                    if (pageRes.ok) {
                      const html = await pageRes.text();
                      const $ = cheerio.load(html);
                      job.data.push({
                        url: pageUrl,
                        markdown: htmlToSimpleMarkdown(html),
                        metadata: { title: $('title').first().text().trim(), sourceURL: pageUrl },
                      });
                    }
                  } catch { /* skip page */ }
                  await new Promise((r) => setTimeout(r, 350));
                }
                job.status = 'completed';
              } catch (e: any) {
                job.status = 'failed';
                job.error = e?.message;
              }
            })();

            return new Response(JSON.stringify({ success: true, id, provider: 'local' }), {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }

          const crawlBody: Record<string, unknown> = {
            url: targetUrl,
            sitemap: 'include',
            crawlEntireDomain: false,
            limit: limit || 100,
            scrapeOptions: { formats: ['markdown'], onlyMainContent: true, waitFor: 5000 },
          };
          if (Array.isArray(includePaths) && includePaths.length) crawlBody.includePaths = includePaths;
          if (Array.isArray(excludePaths) && excludePaths.length) crawlBody.excludePaths = excludePaths;

          const response = await fetch('https://api.firecrawl.dev/v2/crawl', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(crawlBody)
          });
          
          const data = await response.json();
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // GET /api/crawl/:id
        if (path.startsWith('/api/crawl/') && request.method === 'GET') {
          const id = path.split('/').pop() || '';
          const apiKey = url.searchParams.get('apiKey');

          if (id.startsWith('local-')) {
            const job = localCrawlJobs.get(id);
            if (!job) {
              return new Response(JSON.stringify({ error: 'Local crawl job not found' }), { status: 404 });
            }
            return new Response(JSON.stringify({
              status: job.status === 'scraping' ? 'scraping' : job.status,
              data: job.data,
              error: job.error,
              provider: 'local',
            }), {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }

          const firecrawlKey = apiKey || env.FIRECRAWL_API_KEY;
          if (!firecrawlKey) {
            return new Response(JSON.stringify({ error: "Firecrawl API key is not configured" }), { status: 500 });
          }

          const response = await fetch(`https://api.firecrawl.dev/v2/crawl/${id}`, {
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`
            }
          });
          
          const data = await response.json();
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // GET /api/auth/google/url
        if (path === '/api/auth/google/url' && request.method === 'GET') {
          const customClientId = url.searchParams.get('clientId');
          const customClientSecret = url.searchParams.get('clientSecret');
          const customRedirectUri = url.searchParams.get('redirectUri');

          const clientId = customClientId || env.GOOGLE_CLIENT_ID;
          const redirectUri = customRedirectUri || env.GOOGLE_REDIRECT_URI;

          if (!clientId || !redirectUri) {
            return new Response(JSON.stringify({ error: 'Google OAuth credentials not configured.' }), { status: 500 });
          }

          const stateObj: any = {};
          if (customClientId) stateObj.clientId = customClientId;
          if (customClientSecret) stateObj.clientSecret = customClientSecret;
          if (customRedirectUri) stateObj.redirectUri = customRedirectUri;
          
          const state = Object.keys(stateObj).length > 0 
            ? btoa(JSON.stringify(stateObj))
            : undefined;

          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
            access_type: 'offline',
            prompt: 'consent',
          });

          if (state) {
            params.append('state', state);
          }

          const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
          return new Response(JSON.stringify({ url: authUrl }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // GET /auth/google/callback
        if ((path === '/auth/google/callback' || path === '/auth/google/callback/') && request.method === 'GET') {
          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');

          let clientId = env.GOOGLE_CLIENT_ID;
          let clientSecret = env.GOOGLE_CLIENT_SECRET;
          let redirectUri = env.GOOGLE_REDIRECT_URI;

          if (state) {
            try {
              const stateStr = atob(state);
              const stateObj = JSON.parse(stateStr);
              if (stateObj.clientId) clientId = stateObj.clientId;
              if (stateObj.clientSecret) clientSecret = stateObj.clientSecret;
              if (stateObj.redirectUri) redirectUri = stateObj.redirectUri;
            } catch (e) {
              console.error("Failed to parse state:", e);
            }
          }

          if (!code) {
            return new Response(`
              <html>
                <body>
                  <script>
                    if (window.opener) {
                      window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'No code provided' }, '*');
                      window.close();
                    }
                  </script>
                  <p>Authentication failed. No code provided.</p>
                </body>
              </html>
            `, { headers: { 'Content-Type': 'text/html' } });
          }

          try {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
              })
            });

            if (!tokenRes.ok) {
              throw new Error(`Token exchange failed: ${tokenRes.status}`);
            }

            const tokenData = await tokenRes.json();
            const { access_token, refresh_token, expires_in } = tokenData;

            return new Response(`
              <html>
                <body>
                  <script>
                    if (window.opener) {
                      window.opener.postMessage({ 
                        type: 'OAUTH_AUTH_SUCCESS', 
                        provider: 'google',
                        tokens: ${JSON.stringify({ access_token, refresh_token, expires_in })}
                      }, '*');
                      window.close();
                    } else {
                      window.location.href = '/';
                    }
                  </script>
                  <p>Authentication successful. This window should close automatically.</p>
                </body>
              </html>
            `, { headers: { 'Content-Type': 'text/html' } });
          } catch (error: any) {
            return new Response(`
              <html>
                <body>
                  <script>
                    if (window.opener) {
                      window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'Token exchange failed' }, '*');
                      window.close();
                    }
                  </script>
                  <p>Authentication failed. Token exchange failed.</p>
                </body>
              </html>
            `, { headers: { 'Content-Type': 'text/html' } });
          }
        }

        // GET /api/auth/onedrive/url
        if (path === '/api/auth/onedrive/url' && request.method === 'GET') {
          const customClientId = url.searchParams.get('clientId');
          const customRedirectUri = url.searchParams.get('redirectUri');
          const customClientSecret = url.searchParams.get('clientSecret');
          const customTenantId = url.searchParams.get('tenantId');

          const clientId = customClientId || env.ONEDRIVE_CLIENT_ID;
          const redirectUri = customRedirectUri || env.ONEDRIVE_REDIRECT_URI;
          const tenantId = customTenantId || 'common';

          if (!clientId || !redirectUri) {
            return new Response(JSON.stringify({ error: 'OneDrive OAuth credentials not configured.' }), { status: 500 });
          }

          const stateObj: any = {};
          if (customClientId) stateObj.clientId = customClientId;
          if (customClientSecret) stateObj.clientSecret = customClientSecret;
          if (customRedirectUri) stateObj.redirectUri = customRedirectUri;
          if (customTenantId) stateObj.tenantId = customTenantId;
          
          const state = Object.keys(stateObj).length > 0 
            ? btoa(JSON.stringify(stateObj))
            : undefined;

          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'Files.ReadWrite offline_access User.Read',
          });

          if (state) {
            params.append('state', state);
          }

          const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
          return new Response(JSON.stringify({ url: authUrl }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // GET /auth/onedrive/callback
        if ((path === '/auth/onedrive/callback' || path === '/auth/onedrive/callback/') && request.method === 'GET') {
          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');

          let clientId = env.ONEDRIVE_CLIENT_ID;
          let clientSecret = env.ONEDRIVE_CLIENT_SECRET;
          let redirectUri = env.ONEDRIVE_REDIRECT_URI;
          let tenantId = 'common';

          if (state) {
            try {
              const stateStr = atob(state);
              const stateObj = JSON.parse(stateStr);
              if (stateObj.clientId) clientId = stateObj.clientId;
              if (stateObj.clientSecret) clientSecret = stateObj.clientSecret;
              if (stateObj.redirectUri) redirectUri = stateObj.redirectUri;
              if (stateObj.tenantId) tenantId = stateObj.tenantId;
            } catch (e) {
              console.error("Failed to parse state:", e);
            }
          }

          if (!code) {
            return new Response(`
              <html>
                <body>
                  <script>
                    if (window.opener) {
                      window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'No code provided' }, '*');
                      window.close();
                    }
                  </script>
                  <p>Authentication failed. No code provided.</p>
                </body>
              </html>
            `, { headers: { 'Content-Type': 'text/html' } });
          }

          try {
            const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
              }).toString()
            });

            if (!tokenRes.ok) {
              throw new Error(`Token exchange failed: ${tokenRes.status}`);
            }

            const tokenData = await tokenRes.json();
            const { access_token, refresh_token, expires_in } = tokenData;

            return new Response(`
              <html>
                <body>
                  <script>
                    if (window.opener) {
                      window.opener.postMessage({ 
                        type: 'OAUTH_AUTH_SUCCESS', 
                        provider: 'onedrive',
                        tokens: ${JSON.stringify({ access_token, refresh_token, expires_in })}
                      }, '*');
                      window.close();
                    } else {
                      window.location.href = '/';
                    }
                  </script>
                  <p>Authentication successful. This window should close automatically.</p>
                </body>
              </html>
            `, { headers: { 'Content-Type': 'text/html' } });
          } catch (error: any) {
            return new Response(`
              <html>
                <body>
                  <script>
                    if (window.opener) {
                      window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'Token exchange failed' }, '*');
                      window.close();
                    }
                  </script>
                  <p>Authentication failed. Token exchange failed.</p>
                </body>
              </html>
            `, { headers: { 'Content-Type': 'text/html' } });
          }
        }

        // POST /api/onedrive/upload
        if (path === '/api/onedrive/upload' && request.method === 'POST') {
          const body: any = await request.json();
          const { accessToken, fileName, base64Data } = body;

          if (!accessToken || !fileName || !base64Data) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
          }

          try {
            const base64Content = base64Data.split(',')[1];
            // Convert base64 to Uint8Array
            const binaryString = atob(base64Content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const uploadRes = await fetch(
              `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/octet-stream',
                },
                body: bytes
              }
            );

            if (!uploadRes.ok) {
              throw new Error(`Upload failed: ${uploadRes.status}`);
            }

            const data = await uploadRes.json();
            return new Response(JSON.stringify(data), {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          } catch (error: any) {
            return new Response(JSON.stringify({ error: 'Upload failed', details: error.message }), { status: 500 });
          }
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

        if (path.startsWith('/api/')) {
          return new Response(JSON.stringify({ error: "Route not found" }), { status: 404 });
        }

        // Pass everything else to Assets (override HTML COEP/COOP — see htmlResponseWithoutCoepIsolation)
        return htmlResponseWithClientEnv(await env.ASSETS.fetch(request), env);

      } catch (err: any) {
        return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
  };

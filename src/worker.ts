import * as cheerio from "cheerio";

export interface Env {
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
          _missingCloudinary: missingCloudinary,
          _missingGemini: missingGemini
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
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

      // POST /api/cloudinary/upload
      if ((path === '/api/cloudinary/upload' || path === '/api/cloudinary/upload/') && request.method.toUpperCase() === 'POST') {
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

        // POST /api/map
        if (path === '/api/map' && request.method === 'POST') {
          const body: any = await request.json();
          const { url: targetUrl, limit, apiKey } = body;
          
          const firecrawlKey = apiKey || env.FIRECRAWL_API_KEY;
          if (!firecrawlKey) {
            return new Response(JSON.stringify({ error: "Firecrawl API key is not configured" }), { status: 500 });
          }

          const response = await fetch('https://api.firecrawl.dev/v2/map', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: targetUrl, limit: limit || 5000, sitemap: "include" })
          });
          
          const data = await response.json();
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // POST /api/firecrawl-scrape
        if (path === '/api/firecrawl-scrape' && request.method === 'POST') {
          const body: any = await request.json();
          const { url: targetUrl, apiKey } = body;
          
          const firecrawlKey = apiKey || env.FIRECRAWL_API_KEY;
          if (!firecrawlKey) {
            return new Response(JSON.stringify({ error: "Firecrawl API key is not configured" }), { status: 500 });
          }

          const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: targetUrl, formats: ["markdown"] })
          });
          
          const data = await response.json();
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // POST /api/crawl
        if (path === '/api/crawl' && request.method === 'POST') {
          const body: any = await request.json();
          const { url: targetUrl, limit, apiKey } = body;
          
          const firecrawlKey = apiKey || env.FIRECRAWL_API_KEY;
          if (!firecrawlKey) {
            return new Response(JSON.stringify({ error: "Firecrawl API key is not configured" }), { status: 500 });
          }

          const response = await fetch('https://api.firecrawl.dev/v1/crawl', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: targetUrl, limit: limit || 100, scrapeOptions: { formats: ["markdown"] } })
          });
          
          const data = await response.json();
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // GET /api/crawl/:id
        if (path.startsWith('/api/crawl/') && request.method === 'GET') {
          const id = path.split('/').pop();
          const apiKey = url.searchParams.get('apiKey');
          
          const firecrawlKey = apiKey || env.FIRECRAWL_API_KEY;
          if (!firecrawlKey) {
            return new Response(JSON.stringify({ error: "Firecrawl API key is not configured" }), { status: 500 });
          }

          const response = await fetch(`https://api.firecrawl.dev/v1/crawl/${id}`, {
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

        // Pass everything else to Assets
        return env.ASSETS.fetch(request);

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

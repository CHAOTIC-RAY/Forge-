import express from "express";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { scraperRouter } from "./server/routes/api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

interface CachedProduct {
  title: string;
  link: string;
  price: string;
  image: string | null;
  stockInfo: string;
  categories: string;
  sku?: string;
  updatedAt: number;
}



export async function startServer(forcePort?: number) {
  const app = express();
  const PORT = forcePort || Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use("/api", scraperRouter);

  // Expose Gemini API Key to client if set in environment
  app.get("/api/config", (req, res) => {
    res.json({
      geminiApiKey: process.env.GEMINI_API_KEY || null,
      groqApiKey: process.env.GROQ_API_KEY || null,
    });
  });

  // Proxy image endpoint to bypass CORS
  app.get("/api/proxy-image", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("URL is required");
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).send("Invalid URL format");
    }

    try {
      const response = await axios.get(url, { 
        responseType: "arraybuffer",
        timeout: 15000, // Increased timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/*'
        },
        validateStatus: (status) => status < 500 // Don't throw for 404s, etc.
      });

      if (response.status >= 400) {
        console.warn(`Proxy fetch failed with status ${response.status} for URL: ${url}`);
        return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers["content-type"] || "image/png";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      res.send(response.data);
    } catch (error: any) {
      console.error("Proxy image failed:", error.message);
      res.status(500).send(`Failed to fetch image: ${error.message}`);
    }
  });

  // Firecrawl Endpoints
  app.post("/api/crawl", async (req, res) => {
    const { url, limit = 10, apiKey } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const FIRECRAWL_API_KEY = (apiKey || process.env.FIRECRAWL_API_KEY)?.trim();
    if (!FIRECRAWL_API_KEY) {
      return res.status(500).json({ error: "Firecrawl API key is not configured" });
    }

    try {
      const response = await axios.post(
        "https://api.firecrawl.dev/v2/crawl",
        {
          url: url,
          sitemap: "include",
          crawlEntireDomain: false,
          limit: limit,
          scrapeOptions: {
            onlyMainContent: true,
            maxAge: 172800000,
            waitFor: 5000, // Wait for dynamic content
            parsers: ["pdf"],
            formats: ["markdown"]
          }
        },
        {
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      res.json(response.data);
    } catch (error: any) {
      console.error("Firecrawl crawl failed:", error.response?.data || error.message);
      res.status(500).json({ 
        error: "Firecrawl crawl failed", 
        details: error.response?.data || error.message 
      });
    }
  });

  app.get("/api/crawl/:id", async (req, res) => {
    const { id } = req.params;
    const { apiKey } = req.query;
    const FIRECRAWL_API_KEY = (apiKey as string || process.env.FIRECRAWL_API_KEY)?.trim();

    if (!FIRECRAWL_API_KEY) {
      return res.status(500).json({ error: "Firecrawl API key is not configured" });
    }

    try {
      const response = await axios.get(`https://api.firecrawl.dev/v2/crawl/${id}`, {
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`
        }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Firecrawl status check failed:", error.response?.data || error.message);
      res.status(500).json({ 
        error: "Firecrawl status check failed", 
        details: error.response?.data || error.message 
      });
    }
  });

  app.post("/api/firecrawl-scrape", async (req, res) => {
    const { url, apiKey } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const FIRECRAWL_API_KEY = (apiKey || process.env.FIRECRAWL_API_KEY)?.trim();
    if (!FIRECRAWL_API_KEY) {
      return res.status(500).json({ error: "Firecrawl API key is not configured" });
    }

    try {
      const response = await axios.post(
        "https://api.firecrawl.dev/v2/scrape",
        {
          url: url,
          formats: ["markdown"],
          waitFor: 5000
        },
        {
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      res.json(response.data);
    } catch (error: any) {
      console.error("Firecrawl scrape failed:", error.response?.data || error.message);
      res.status(500).json({ 
        error: "Firecrawl scrape failed", 
        details: error.response?.data || error.message 
      });
    }
  });



// ============================================================
// GOOGLE DRIVE API — OAUTH & FILE STORAGE
// ============================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

// GET /api/auth/google/url
app.get('/api/auth/google/url', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ error: 'Google OAuth credentials not configured.' });
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

// GET /auth/google/callback
app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.send(`
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
    `);
  }

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // Send success message to parent window and close popup
    res.send(`
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
    `);
  } catch (error: any) {
    console.error('Google OAuth callback error:', error.response?.data || error.message);
    res.send(`
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
    `);
  }
});

// ============================================================
// ONEDRIVE API — OAUTH & FILE STORAGE
// ============================================================

const ONEDRIVE_CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID || '';
const ONEDRIVE_CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET || '';
const ONEDRIVE_REDIRECT_URI = process.env.ONEDRIVE_REDIRECT_URI || '';

// GET /api/auth/onedrive/url
app.get('/api/auth/onedrive/url', (req, res) => {
  if (!ONEDRIVE_CLIENT_ID || !ONEDRIVE_REDIRECT_URI) {
    return res.status(500).json({ error: 'OneDrive OAuth credentials not configured.' });
  }

  const params = new URLSearchParams({
    client_id: ONEDRIVE_CLIENT_ID,
    redirect_uri: ONEDRIVE_REDIRECT_URI,
    response_type: 'code',
    scope: 'Files.ReadWrite offline_access User.Read',
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  res.json({ url: authUrl });
});

// GET /auth/onedrive/callback
app.get(['/auth/onedrive/callback', '/auth/onedrive/callback/'], async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.send(`
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
    `);
  }

  try {
    const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', new URLSearchParams({
      code: code as string,
      client_id: ONEDRIVE_CLIENT_ID,
      client_secret: ONEDRIVE_CLIENT_SECRET,
      redirect_uri: ONEDRIVE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token, expires_in } = response.data;

    res.send(`
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
    `);
  } catch (error: any) {
    console.error('OneDrive OAuth callback error:', error.response?.data || error.message);
    res.send(`
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
    `);
  }
});

// POST /api/onedrive/upload
app.post('/api/onedrive/upload', async (req, res) => {
  const { accessToken, fileName, base64Data } = req.body;

  if (!accessToken || !fileName || !base64Data) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
    
    const uploadRes = await axios.put(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`,
      buffer,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
      }
    );

    res.json(uploadRes.data);
  } catch (error: any) {
    console.error('OneDrive upload error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Upload failed', details: error.response?.data || error.message });
  }
});

// ============================================================
// CLOUDINARY API — IMAGE STORAGE
// ============================================================

app.post("/api/cloudinary/upload", upload.single("image"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Use upload_stream for better memory efficiency (avoids extra base64 conversion)
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "forge_posts",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ 
            error: "Failed to upload image to Cloudinary", 
            details: error.message 
          });
        }
        res.json({
          url: result?.secure_url,
          public_id: result?.public_id,
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ error: "Failed to upload image to Cloudinary", details: error.message });
  }
});

app.post("/api/cloudinary/delete", async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) {
    return res.status(400).json({ error: "Public ID is required" });
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    res.json(result);
  } catch (error: any) {
    console.error("Cloudinary delete error:", error);
    res.status(500).json({ error: "Failed to delete image from Cloudinary", details: error.message });
  }
});



// Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Robust pathing for both dev and production
    const isPackaged = process.argv[1] && process.argv[1].endsWith('server.js');
    const distPath = isPackaged 
      ? path.dirname(fileURLToPath(import.meta.url)) 
      : path.join(process.cwd(), "dist");
      
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  startServer();
}

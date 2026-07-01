/**
 * MLC/LiteRT Fetch Proxy
 * Handles CORS proxying for model downloads from Hugging Face
 * Used for both WebLLM and LiteRT-LM model downloads
 */

export const MLC_FETCH_PATH = "/api/mlc-fetch";

const ALLOWED_REPOS = [
  'mlc-ai/',
  'google/',
  'litert-community/',
  'huggingface/'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB max file size

/**
 * Check if a Hugging Face repository is allowed for proxying
 */
function isAllowedRepo(repoPath: string): boolean {
  return ALLOWED_REPOS.some(prefix => repoPath.startsWith(prefix));
}

/**
 * Build forward headers for upstream Hugging Face requests
 */
function buildForwardHeaders(url: string, requestHeaders: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; ForgeApp/1.0; +https://forge.app)',
  };
  
  // Forward some headers from the original request
  const forwardHeaders = ['accept', 'accept-language', 'cache-control'];
  forwardHeaders.forEach(header => {
    const value = requestHeaders[header];
    if (value) {
      headers[header] = value;
    }
  });
  
  return headers;
}

/**
 * Stream upstream response to Express response
 */
async function streamUpstreamToResponse(
  res: any,
  url: string,
  method: string,
  headers: Record<string, string>
): Promise<void> {
  const response = await fetch(url, {
    method,
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Upstream request failed: ${response.status} ${response.statusText}`);
  }
  
  // Copy response headers
  const contentType = response.headers.get('content-type');
  const contentLength = response.headers.get('content-length');
  
  if (contentType) {
    res.setHeader('Content-Type', contentType);
  }
  if (contentLength) {
    res.setHeader('Content-Length', contentLength);
  }
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Stream the response body
  if (response.body) {
    const reader = response.body.getReader();
    const writer = res;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        writer.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  res.end();
}

/**
 * Client-side function to fetch through the proxy
 */
export async function fetchMlcUpstream(
  remoteUrl: string,
  upstreamMethod: "GET" | "HEAD" = "GET"
): Promise<Response> {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    return fetch(`${origin}${MLC_FETCH_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: remoteUrl, upstreamMethod }),
    });
  }
  
  // Server-side: fetch directly
  return fetch(remoteUrl, { method: upstreamMethod });
}

/**
 * Express handler for the MLC fetch proxy
 */
export function createMlcFetchProxyHandler() {
  return async (req: any, res: any) => {
    try {
      const { url, upstreamMethod = "GET" } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      
      // Parse URL to check if it's from an allowed repository
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch (e) {
        return res.status(400).json({ error: "Invalid URL" });
      }
      
      // Only allow Hugging Face URLs
      if (parsedUrl.hostname !== 'huggingface.co' && !parsedUrl.hostname.endsWith('.huggingface.co')) {
        return res.status(403).json({ error: "Only Hugging Face URLs are allowed" });
      }
      
      // Check if repository is allowed
      const repoPath = parsedUrl.pathname.replace(/^\//, '');
      if (!isAllowedRepo(repoPath)) {
        return res.status(403).json({ error: "Repository not allowed for proxying" });
      }
      
      console.log(`[MLCFetchProxy] Proxying ${upstreamMethod} request to: ${url}`);
      
      const forwardHeaders = buildForwardHeaders(url, req.headers);
      await streamUpstreamToResponse(res, url, upstreamMethod, forwardHeaders);
      
    } catch (error: any) {
      console.error('[MLCFetchProxy] Error:', error);
      res.status(500).json({ error: error.message || "Proxy request failed" });
    }
  };
}

/**
 * Express handler for HEAD requests (for file size checking)
 */
export function createMlcHeadProxyHandler() {
  return async (req: any, res: any) => {
    try {
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      
      // Parse URL to check if it's from an allowed repository
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch (e) {
        return res.status(400).json({ error: "Invalid URL" });
      }
      
      // Only allow Hugging Face URLs
      if (parsedUrl.hostname !== 'huggingface.co' && !parsedUrl.hostname.endsWith('.huggingface.co')) {
        return res.status(403).json({ error: "Only Hugging Face URLs are allowed" });
      }
      
      // Check if repository is allowed
      const repoPath = parsedUrl.pathname.replace(/^\//, '');
      if (!isAllowedRepo(repoPath)) {
        return res.status(403).json({ error: "Repository not allowed for proxying" });
      }
      
      console.log(`[MLCFetchProxy] HEAD request to: ${url}`);
      
      const forwardHeaders = buildForwardHeaders(url, req.headers);
      await streamUpstreamToResponse(res, url, "HEAD", forwardHeaders);
      
    } catch (error: any) {
      console.error('[MLCFetchProxy] HEAD error:', error);
      res.status(500).json({ error: error.message || "HEAD request failed" });
    }
  };
}

import express from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { scraperRouter } from "./server/routes/api";
import { patchEsrganOnnxOutputDims } from "./src/lib/esrganOnnxPatch";
import { handleSupabaseTokenExchange } from "./src/lib/handleSupabaseTokenExchange";
import { handleFirestoreMigrateBatch, handleMigratePrefetchProfiles, handleMigrateRepairOwnership } from "./src/lib/handleFirestoreMigrate";
import {
  handleProfileSync,
  handleProfileCompleteOnboarding,
  handleBusinessesMine,
  handleBusinessCreate,
  handleOnboardingComplete,
} from "./src/lib/handleSupabaseProfile";
import {
  handleDataPosts,
  handleDataPostById,
  handleDataPostsBatchImport,
  handleDataWorkspace,
  handleDataNotebook,
  handleDataCategories,
  handleDataBrandOverview,
} from "./src/lib/handleSupabaseDataAccess";

function supabaseWorkerEnv() {
  return {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  };
}

console.log("[Server] Starting initialization...");
console.log("[Server] Environment:", process.env.NODE_ENV);

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
const requiredCloudinaryEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingCloudinaryEnv = requiredCloudinaryEnv.filter(k => !process.env[k]);

try {
  if (process.env.CLOUDINARY_URL) {
    console.log("[Server] Configuring Cloudinary with URL");
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
    });
  } else if (missingCloudinaryEnv.length === 0) {
    console.log("[Server] Configuring Cloudinary with credentials");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  } else {
    console.warn("[Server] Cloudinary credentials missing:", missingCloudinaryEnv.join(', '));
  }
} catch (error) {
  console.error("[Server] Failed to configure Cloudinary:", error);
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
  const PORT = forcePort || Number(process.env.PORT) || 5000;

  console.log(`[Server] Initializing startServer on port ${PORT}`);

  app.use(cors());
  app.use((req, res, next) => {
    // Disable restrictive headers that block Firebase Auth and cross-origin popups
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
  });
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // Expose config to client
  app.get("/api/config", (req, res) => {
    console.log("[Server] GET /api/config requested");
    if (!process.env.GOOGLE_GENAI_API_KEY) {
      console.warn("[Server] GOOGLE_GENAI_API_KEY is missing from environment");
    }
    try {
      const config = {
        hasGeminiApiKey: !!(process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY),
        hasGroqApiKey: !!process.env.GROQ_API_KEY,
        cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
      };
      console.log("[Server] Returning config (keys hidden)");
      res.json(config);
    } catch (error: any) {
      console.error("[Server] Error in /api/config:", error);
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  });

  app.post("/api/groq", async (req, res) => {
    try {
      const payload = { ...(req.body || {}) } as Record<string, unknown>;
      const clientKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
      delete payload.apiKey;

      const apiKey = clientKey || process.env.GROQ_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'Groq API key is not configured on the server' });
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const body = await response.text();
      res.status(response.status).type('application/json').send(body);
    } catch (error: any) {
      console.error('[Server] /api/groq error:', error);
      res.status(500).json({ error: error.message || 'Groq proxy failed' });
    }
  });

  app.post("/api/auth/supabase-token", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "POST",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
      });
      const response = await handleSupabaseTokenExchange(request, {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
        FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      });
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/auth/supabase-token error:", error);
      res.status(500).json({ error: error.message || "Token exchange failed" });
    }
  });

  app.get("/api/migrate/prefetch-profiles", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "GET",
        headers: {
          Authorization: req.get("Authorization") || "",
        },
      });
      const response = await handleMigratePrefetchProfiles(request, {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
        FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      });
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/migrate/prefetch-profiles error:", error);
      res.status(500).json({ error: error.message || "Prefetch failed" });
    }
  });

  app.post("/api/migrate/repair-ownership", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "POST",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      const response = await handleMigrateRepairOwnership(request, {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
        FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      });
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/migrate/repair-ownership error:", error);
      res.status(500).json({ error: error.message || "Repair failed" });
    }
  });

  app.post("/api/migrate/supabase-batch", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "POST",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      const response = await handleFirestoreMigrateBatch(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/migrate/supabase-batch error:", error);
      res.status(500).json({ error: error.message || "Migration batch failed" });
    }
  });

  app.post("/api/profile/sync", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "POST",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
      });
      const response = await handleProfileSync(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/profile/sync error:", error);
      res.status(500).json({ error: error.message || "Profile sync failed" });
    }
  });

  app.post("/api/profile/complete-onboarding", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "POST",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
      });
      const response = await handleProfileCompleteOnboarding(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/profile/complete-onboarding error:", error);
      res.status(500).json({ error: error.message || "Complete onboarding failed" });
    }
  });

  app.get("/api/businesses/mine", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "GET",
        headers: {
          Authorization: req.get("Authorization") || "",
        },
      });
      const response = await handleBusinessesMine(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/businesses/mine error:", error);
      res.status(500).json({ error: error.message || "Load businesses failed" });
    }
  });

  app.post("/api/businesses/create", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "POST",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      const response = await handleBusinessCreate(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/businesses/create error:", error);
      res.status(500).json({ error: error.message || "Create business failed" });
    }
  });

  app.post("/api/onboarding/complete", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "POST",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      const response = await handleOnboardingComplete(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/onboarding/complete error:", error);
      res.status(500).json({ error: error.message || "Complete onboarding failed" });
    }
  });

  app.get("/api/data/posts", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "GET",
        headers: { Authorization: req.get("Authorization") || "" },
      });
      const response = await handleDataPosts(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/data/posts GET error:", error);
      res.status(500).json({ error: error.message || "Load posts failed" });
    }
  });

  app.post("/api/data/posts", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "POST",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      const response = await handleDataPosts(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/data/posts POST error:", error);
      res.status(500).json({ error: error.message || "Create post failed" });
    }
  });

  app.post("/api/data/posts/batch-import", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "POST",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      const response = await handleDataPostsBatchImport(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/data/posts/batch-import error:", error);
      res.status(500).json({ error: error.message || "Import posts failed" });
    }
  });

  app.patch("/api/data/posts/:id", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "PATCH",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      const response = await handleDataPostById(request, supabaseWorkerEnv(), req.params.id);
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/data/posts PATCH error:", error);
      res.status(500).json({ error: error.message || "Update post failed" });
    }
  });

  app.delete("/api/data/posts/:id", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "DELETE",
        headers: { Authorization: req.get("Authorization") || "" },
      });
      const response = await handleDataPostById(request, supabaseWorkerEnv(), req.params.id);
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/data/posts DELETE error:", error);
      res.status(500).json({ error: error.message || "Delete post failed" });
    }
  });

  app.get("/api/data/workspace", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "GET",
        headers: { Authorization: req.get("Authorization") || "" },
      });
      const response = await handleDataWorkspace(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/data/workspace error:", error);
      res.status(500).json({ error: error.message || "Load workspace data failed" });
    }
  });

  app.get("/api/data/notebook", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "GET",
        headers: { Authorization: req.get("Authorization") || "" },
      });
      const response = await handleDataNotebook(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/data/notebook GET error:", error);
      res.status(500).json({ error: error.message || "Load notebook failed" });
    }
  });

  app.put("/api/data/notebook", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "PUT",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      const response = await handleDataNotebook(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/data/notebook PUT error:", error);
      res.status(500).json({ error: error.message || "Save notebook failed" });
    }
  });

  app.put("/api/data/categories", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "PUT",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      const response = await handleDataCategories(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/data/categories PUT error:", error);
      res.status(500).json({ error: error.message || "Save categories failed" });
    }
  });

  app.put("/api/data/brand-overview", async (req, res) => {
    try {
      const request = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
        method: "PUT",
        headers: {
          Authorization: req.get("Authorization") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      const response = await handleDataBrandOverview(request, supabaseWorkerEnv());
      const body = await response.text();
      res.status(response.status).type("application/json").send(body);
    } catch (error: any) {
      console.error("[Server] /api/data/brand-overview PUT error:", error);
      res.status(500).json({ error: error.message || "Save brand overview failed" });
    }
  });

  app.use("/api", scraperRouter);

  // --- AI FINE-TUNING SIMULATION ---
  let finetuneStatus = {
    isRunning: false,
    progress: 0,
    startTime: 0,
    logs: [] as string[]
  };

  app.post("/api/ai/finetune", (req, res) => {
    if (finetuneStatus.isRunning) {
      return res.status(400).json({ error: "A fine-tuning session is already in progress." });
    }

    const { modelId } = req.body;
    console.log(`[Server] Starting fine-tuning simulation for ${modelId}`);

    finetuneStatus = {
      isRunning: true,
      progress: 0,
      startTime: Date.now(),
      logs: [
        "Initializing Fine-tuning Pipeline...", 
        "Verifying environment...", 
        "Dependencies found: transformers, torch, peft.",
        "Target Task: Postcard Generation & Forge System Assistance Training"
      ]
    };

    // Simulate progress over time
    const interval = setInterval(() => {
      finetuneStatus.progress += 5;
      
      if (finetuneStatus.progress === 10) finetuneStatus.logs.push(`Loading Pretrained Model: ${modelId}...`);
      if (finetuneStatus.progress === 20) finetuneStatus.logs.push("Injecting Forge Master dataset: [TaskCard_BestPractices, Notebook_Architectures]...");
      if (finetuneStatus.progress === 30) finetuneStatus.logs.push("Optimizing for Strategic Short Captions and punchy business terminology.");
      if (finetuneStatus.progress === 40) finetuneStatus.logs.push("Configuring LoRA parameters (Rank=8, Alpha=32) for efficiency.");
      if (finetuneStatus.progress === 50) finetuneStatus.logs.push("Starting Training Loop (Epoch 1/3)... Tuning task card layouts.");
      if (finetuneStatus.progress === 70) finetuneStatus.logs.push("Epoch 2/3 - Enhancing notebook tab strategy logic... Loss: 0.2854");
      if (finetuneStatus.progress === 90) finetuneStatus.logs.push("Epoch 3/3 - Polishing caption impact... Loss: 0.1042");
      if (finetuneStatus.progress === 95) finetuneStatus.logs.push("Merging adapters... Model is now a Master Forge Assistant.");
      
      if (finetuneStatus.progress >= 100) {
        finetuneStatus.progress = 100;
        finetuneStatus.isRunning = false;
        finetuneStatus.logs.push("SUCCESS: Model fine-tuned and ready for local inference.");
        clearInterval(interval);
      }
    }, 1500);

    res.json({ message: "Fine-tuning started successfully", status: "running" });
  });

  app.get("/api/ai/finetune/status", (req, res) => {
    res.json(finetuneStatus);
  });
  // ----------------------------------

  // HuggingFace proxy for AI model weights (browser CORS)
  app.use('/api/hf-proxy', async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).send('Method not allowed');
    }
    const hfSubPath = req.path.replace(/^\//, '');
    const allowedRepos = ['mlc-ai/', 'litert-community/', 'google/'];
    if (!allowedRepos.some(repo => hfSubPath?.startsWith(repo))) {
      return res.status(403).json({ error: 'Only mlc-ai, litert-community, and google HuggingFace repos are allowed' });
    }

    try {
      const targetUrl = `https://huggingface.co/${hfSubPath}`;
      const response = await axios.get(targetUrl, {
        responseType: 'stream',
        timeout: 120000,
        headers: {
          'User-Agent': 'Forge-WebLLM-Proxy/1.0',
          ...(req.headers.range ? { Range: req.headers.range as string } : {}),
        },
        validateStatus: (status) => status < 500,
      });

      if (response.status >= 400) {
        return res.status(response.status).send(response.statusText);
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      if (response.headers['content-type']) {
        res.setHeader('Content-Type', String(response.headers['content-type']));
      }
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', String(response.headers['content-length']));
      }
      if (response.headers['content-range']) {
        res.setHeader('Content-Range', response.headers['content-range']);
      }
      if (response.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400');
      response.data.pipe(res);
    } catch (error: any) {
      console.error('[HF Proxy] failed:', error.message);
      res.status(502).json({ error: 'HuggingFace proxy failed', details: error.message });
    }
  });

  // ESRGAN ONNX model proxy (GitHub releases block browser CORS)
  app.get("/api/esrgan-model", async (req, res) => {
    const upstream =
      "https://github.com/Phhofm/models/releases/download/4xNomos2_otf_esrgan/4xNomos2_otf_esrgan_fp16_opset17.onnx";

    try {
      const response = await axios.get(upstream, {
        responseType: "arraybuffer",
        timeout: 120000,
        headers: {
          "User-Agent": "Forge-ESRGAN-Proxy/1.0",
        },
        validateStatus: (status) => status < 500,
      });

      if (response.status >= 400) {
        return res.status(response.status).send(`Failed to fetch model: ${response.statusText}`);
      }

      const patched = patchEsrganOnnxOutputDims(response.data);

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=604800");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Length", String(patched.byteLength));
      res.status(200).send(Buffer.from(patched));
    } catch (error: any) {
      console.error("ESRGAN model proxy failed:", error.message);
      res.status(500).send(`Failed to fetch model: ${error.message}`);
    }
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

      const contentType = String(response.headers["content-type"] || "image/png");
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.send(response.data);
    } catch (error: any) {
      console.error("Proxy image failed:", error.message);
      res.status(500).send(`Failed to fetch image: ${error.message}`);
    }
  });

  // Firecrawl Endpoints
  app.post("/api/map", async (req, res) => {
    const { url, limit = 5000, apiKey } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const rawKey = apiKey || process.env.FIRECRAWL_API_KEY;
    const FIRECRAWL_API_KEY = typeof rawKey === 'string' ? rawKey.replace(/[^\x21-\x7E]/g, '') : undefined;

    if (FIRECRAWL_API_KEY) {
      try {
        const response = await axios.post(
          "https://api.firecrawl.dev/v2/map",
          {
            url: url,
            limit: limit,
            sitemap: "include"
          },
          {
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );
        return res.json({ ...response.data, provider: 'firecrawl' });
      } catch (error: any) {
        console.error("Firecrawl map failed, trying local discovery:", error.response?.data || error.message);
      }
    }

    try {
      const { discoverSiteLinks } = await import("./server/scrapers/localSiteDiscover.js");
      const links = await discoverSiteLinks(url, { limit: Math.min(limit, 500) });
      return res.json({
        success: true,
        links,
        provider: 'local',
        message: FIRECRAWL_API_KEY
          ? 'Firecrawl map failed; used local link discovery'
          : 'No Firecrawl key — used local link discovery',
      });
    } catch (error: any) {
      console.error("Local map failed:", error.message);
      res.status(500).json({
        error: "Site map failed",
        details: error.message,
      });
    }
  });

  app.post("/api/crawl", async (req, res) => {
    const { url, limit = 10, apiKey, scrapegraphApiKey, useCrawl4ai, useLlmReader, includePaths, excludePaths, scrapeOptions: clientScrapeOptions } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const rawKey = apiKey || process.env.FIRECRAWL_API_KEY;
    const FIRECRAWL_API_KEY = typeof rawKey === 'string' ? rawKey.replace(/[^\x21-\x7E]/g, '') : undefined;

    if (!FIRECRAWL_API_KEY) {
      try {
        const { startLocalCrawl } = await import("./server/scrapers/localCrawlJobs.js");
        const id = startLocalCrawl({
          url,
          limit: limit || 50,
          includePaths,
          excludePaths,
          apiKey,
          scrapegraphApiKey,
          useCrawl4ai,
          useLlmReader,
        });
        return res.json({ success: true, id, provider: 'local' });
      } catch (error: any) {
        return res.status(500).json({ error: "Local crawl failed", details: error.message });
      }
    }

    try {
      const crawlBody: Record<string, unknown> = {
        url: url,
        sitemap: "include",
        crawlEntireDomain: false,
        limit: limit,
        scrapeOptions: {
          onlyMainContent: clientScrapeOptions?.onlyMainContent ?? true,
          maxAge: 172800000,
          waitFor: clientScrapeOptions?.waitFor ?? 5000,
          parsers: ["pdf"],
          formats: ["markdown"],
        },
      };
      if (Array.isArray(includePaths) && includePaths.length > 0) {
        crawlBody.includePaths = includePaths;
      }
      if (Array.isArray(excludePaths) && excludePaths.length > 0) {
        crawlBody.excludePaths = excludePaths;
      }

      const response = await axios.post(
        "https://api.firecrawl.dev/v2/crawl",
        crawlBody,
        {
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      res.json({ ...response.data, provider: 'firecrawl' });
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

    if (id.startsWith('local-')) {
      const { getLocalCrawlJob } = await import("./server/scrapers/localCrawlJobs.js");
      const job = getLocalCrawlJob(id);
      if (!job) {
        return res.status(404).json({ error: "Local crawl job not found" });
      }
      return res.json({
        status: job.status === 'scraping' ? 'scraping' : job.status,
        data: job.data,
        error: job.error,
        provider: 'local',
      });
    }

    const rawKey = apiKey as string || process.env.FIRECRAWL_API_KEY;
    const FIRECRAWL_API_KEY = typeof rawKey === 'string' ? rawKey.replace(/[^\x21-\x7E]/g, '') : undefined;

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

  app.post("/api/builtin-scrape", async (req, res) => {
    const { url, provider, waitFor = 5000 } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    if (provider !== "crawl4ai" && provider !== "llm-reader") {
      return res.status(400).json({ error: "provider must be crawl4ai or llm-reader" });
    }

    try {
      const mod = await import("./server/scrapers/pythonBuiltinScrape.js");
      const scrapeFn =
        provider === "crawl4ai" ? mod.crawl4aiScrapeMarkdown : mod.llmReaderScrapeMarkdown;
      const result = await scrapeFn(url, waitFor);
      if (result?.markdown) {
        return res.json({
          success: true,
          data: { markdown: result.markdown, metadata: result.metadata },
          provider,
        });
      }
      return res.status(500).json({
        success: false,
        error: `${provider} scrape failed`,
        provider,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || `${provider} scrape failed`,
      });
    }
  });

  app.post("/api/firecrawl-scrape", async (req, res) => {
    const { url, apiKey, scrapegraphApiKey, useCrawl4ai, useLlmReader, onlyMainContent = true, waitFor = 5000 } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const { scrapeWithProviders } = await import("./server/scrapers/unifiedScrape.js");
      const result = await scrapeWithProviders(url, {
        apiKey,
        scrapegraphApiKey,
        useCrawl4ai,
        useLlmReader,
        onlyMainContent,
        waitFor,
      });
      if (result.markdown) {
        return res.json({
          success: true,
          data: { markdown: result.markdown, metadata: result.metadata },
          provider: result.provider,
        });
      }
      return res.status(500).json({
        success: false,
        error: result.error || "Scrape failed",
        provider: result.provider,
      });
    } catch (error: any) {
      console.error("Unified scrape failed:", error.message);
      res.status(500).json({
        error: "Scrape failed",
        details: error.message,
        success: false,
      });
    }
  });

  app.post("/api/catalogue-scrape", async (req, res) => {
    const { url, apiKey, scrapegraphApiKey, useCrawl4ai, useLlmReader, onlyMainContent = true, waitFor = 5000 } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    const { scrapeWithProviders } = await import("./server/scrapers/unifiedScrape.js");
    const result = await scrapeWithProviders(url, {
      apiKey,
      scrapegraphApiKey,
      useCrawl4ai,
      useLlmReader,
      onlyMainContent,
      waitFor,
    });
    if (result.markdown) {
      return res.json({
        success: true,
        data: { markdown: result.markdown, metadata: result.metadata },
        provider: result.provider,
      });
    }
    return res.status(500).json({
      success: false,
      error: result.error || "Scrape failed",
      provider: result.provider,
    });
  });

  app.post("/api/firecrawl-scrape-batch", async (req, res) => {
    const { urls, apiKey, scrapegraphApiKey, useCrawl4ai, useLlmReader, onlyMainContent = true, waitFor = 5000 } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: "urls array is required" });
    }

    const { scrapeWithProviders } = await import("./server/scrapers/unifiedScrape.js");
    const results: Array<{
      url: string;
      markdown?: string;
      metadata?: unknown;
      provider?: string;
      error?: string;
    }> = [];
    const batch = urls.slice(0, 40);

    for (const url of batch) {
      const result = await scrapeWithProviders(url, {
        apiKey,
        scrapegraphApiKey,
        useCrawl4ai,
        useLlmReader,
        onlyMainContent,
        waitFor,
      });
      if (result.markdown) {
        results.push({
          url,
          markdown: result.markdown,
          metadata: result.metadata,
          provider: result.provider,
        });
      } else {
        results.push({ url, error: result.error || "Scrape failed", provider: result.provider });
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    res.json({ success: true, results });
  });



// ============================================================
// GOOGLE DRIVE API — OAUTH & FILE STORAGE
// ============================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

// GET /api/auth/google/url
app.get('/api/auth/google/url', (req, res) => {
  const customClientId = req.query.clientId as string;
  const customClientSecret = req.query.clientSecret as string;
  const customRedirectUri = req.query.redirectUri as string;

  const clientId = customClientId || GOOGLE_CLIENT_ID;
  const redirectUri = customRedirectUri || GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'Google OAuth credentials not configured.' });
  }

  const stateObj = {
    clientId: customClientId,
    clientSecret: customClientSecret,
    redirectUri: customRedirectUri
  };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    access_type: 'offline',
    prompt: 'consent',
    state: state
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

// GET /auth/google/callback
app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
  const { code, state } = req.query;

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

  let clientId = GOOGLE_CLIENT_ID;
  let clientSecret = GOOGLE_CLIENT_SECRET;
  let redirectUri = GOOGLE_REDIRECT_URI;

  if (state) {
    try {
      const stateStr = Buffer.from(state as string, 'base64').toString('utf-8');
      const stateObj = JSON.parse(stateStr);
      if (stateObj.clientId) clientId = stateObj.clientId;
      if (stateObj.clientSecret) clientSecret = stateObj.clientSecret;
      if (stateObj.redirectUri) redirectUri = stateObj.redirectUri;
    } catch (e) {
      console.error('Failed to parse state:', e);
    }
  }

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
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
  const customClientId = req.query.clientId as string;
  const customRedirectUri = req.query.redirectUri as string;
  const customClientSecret = req.query.clientSecret as string;
  const customTenantId = req.query.tenantId as string;

  const clientId = customClientId || ONEDRIVE_CLIENT_ID;
  const redirectUri = customRedirectUri || ONEDRIVE_REDIRECT_URI;
  const tenantId = customTenantId || 'common';

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'OneDrive OAuth credentials not configured.' });
  }

  const stateObj: any = {};
  if (customClientId) stateObj.clientId = customClientId;
  if (customClientSecret) stateObj.clientSecret = customClientSecret;
  if (customRedirectUri) stateObj.redirectUri = customRedirectUri;
  if (customTenantId) stateObj.tenantId = customTenantId;
  
  const state = Object.keys(stateObj).length > 0 
    ? Buffer.from(JSON.stringify(stateObj)).toString('base64')
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
  res.json({ url: authUrl });
});

// GET /auth/onedrive/callback
app.get(['/auth/onedrive/callback', '/auth/onedrive/callback/'], async (req, res) => {
  const { code, state } = req.query;

  let clientId = ONEDRIVE_CLIENT_ID;
  let clientSecret = ONEDRIVE_CLIENT_SECRET;
  let redirectUri = ONEDRIVE_REDIRECT_URI;
  let tenantId = 'common';

  if (state) {
    try {
      const stateStr = Buffer.from(state as string, 'base64').toString('utf-8');
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
    const response = await axios.post(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, new URLSearchParams({
      code: code as string,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
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

app.post("/api/media/upload", upload.single("image"), async (req: any, res) => {
  console.log("[Server] POST /api/media/upload requested");
  
  const cloudName = req.body.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = req.body.apiKey || process.env.CLOUDINARY_API_KEY;
  const apiSecret = req.body.apiSecret || process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ 
      error: "Server Configuration Error", 
      details: `Missing Cloudinary variables. Please provide them in Settings or set them in your environment.` 
    });
  }

  try {
    if (!req.file) {
      console.warn("[Server] No image file provided in request");
      return res.status(400).json({ error: "No image file provided" });
    }

    console.log(`[Server] Uploading file to Cloudinary: ${req.file.originalname} (${req.file.size} bytes)`);

    // Use upload_stream for better memory efficiency (avoids extra base64 conversion)
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "forge_posts",
        resource_type: "auto",
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      },
      (error: any, result: any) => {
        if (error) {
          console.error("[Server] Cloudinary upload error:", error);
          return res.status(500).json({ 
            error: "Failed to upload image to Cloudinary", 
            details: error.message 
          });
        }
        console.log("[Server] Cloudinary upload successful:", result?.secure_url);
        res.json({
          url: result?.secure_url,
          public_id: result?.public_id,
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error: any) {
    console.error("[Server] Cloudinary upload route error:", error);
    res.status(500).json({ error: "Failed to upload image to Cloudinary", details: error.message });
  }
});

app.post("/api/media/delete", async (req, res) => {
  const { publicId, cloudName, apiKey, apiSecret } = req.body;
  
  const finalCloudName = cloudName || process.env.CLOUDINARY_CLOUD_NAME;
  const finalApiKey = apiKey || process.env.CLOUDINARY_API_KEY;
  const finalApiSecret = apiSecret || process.env.CLOUDINARY_API_SECRET;

  if (!publicId) {
    return res.status(400).json({ error: "Public ID is required" });
  }

  if (!finalCloudName || !finalApiKey || !finalApiSecret) {
    return res.status(500).json({ 
      error: "Server Configuration Error", 
      details: `Missing Cloudinary variables. Please provide them in Settings or set them in your environment.` 
    });
  }

  try {
    // Cloudinary's destroy method doesn't accept credentials in the options object like upload_stream does.
    // We must configure it globally or use a temporary instance. Since we want to avoid global config changes per request,
    // we'll use a temporary instance just for this delete operation.
    const tempCloudinary = require('cloudinary').v2;
    tempCloudinary.config({
      cloud_name: finalCloudName,
      api_key: finalApiKey,
      api_secret: finalApiSecret,
    });

    const result = await tempCloudinary.uploader.destroy(publicId);
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

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Server] Unhandled Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Server running on http://localhost:${PORT}`);
  });
}

// Start server
startServer().catch(err => {
  console.error("[Server] Critical failure during startup:", err);
});

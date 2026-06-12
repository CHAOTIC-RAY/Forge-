import { toast } from 'sonner';
import {
  buildProxiedWebLlmAppConfig,
  normalizeBuiltinModelId,
  rewriteHuggingFaceModelUrl,
} from './webLlmAppConfig';
import {
  getContextBudget,
  truncateMessagesForLocalAi,
  truncatePromptText,
} from './localAiContext';
import {
  BUILTIN_MODELS,
  BUILTIN_VISION_MODELS,
  DEFAULT_BUILTIN_VISION_MODEL_ID,
  type BuiltInModel,
} from './builtinModels';

export type { BuiltInModel };
export { BUILTIN_MODELS, BUILTIN_VISION_MODELS, DEFAULT_BUILTIN_VISION_MODEL_ID };

/**
 * Built-in AI Service (Modernized with WebLLM)
 * Uses high-performance WebGPU-accelerated LLMs directly in the browser.
 */

export interface BuiltInAiStatus {
  isLoaded: boolean;
  isLoading: boolean;
  isProcessing: boolean;
  progress: number;
  message: string;
  error: string | null;
  modelId: string | null;
  contextWindow?: number;
  maxInputChars?: number;
  visionModelId?: string | null;
  visionIsLoaded?: boolean;
  visionIsLoading?: boolean;
}

// ─── Chrome Built-in AI (Prompt API) ────────────────────────────────────────
async function tryWindowAi(prompt: string): Promise<string | null> {
  try {
    const ai = (window as any).ai;
    if (!ai?.languageModel) return null;
    const availability = await ai.languageModel.availability?.() ?? 'no';
    if (availability === 'no') return null;
    
    const session = await ai.languageModel.create({
      systemPrompt: 'You are a helpful AI assistant. Be concise and professional.',
    });
    const result = await session.prompt(prompt);
    session.destroy();
    return result || null;
  } catch (e) {
    return null;
  }
}

export const BUILTIN_SYSTEM_PROMPT = `You are the Forge AI Master Assistant. 
Your core capabilities include:
1. Generating high-impact Task Cards: Clear, actionable, and professionally formatted.
2. Notebook Tab Ideas: Creative, organized, and strategic workspace suggestions.
3. Strategic Short Captions: Engaging, punchy, and results-oriented copy for Forge users.
Always follow user instructions strictly. Be helpful, concise, and professional. 
If an instructions file context is provided, prioritize it above all else.`;

type WebLlmModule = typeof import('@mlc-ai/web-llm');

class BuiltInAiService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private engine: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private visionEngine: any = null;
  private webllmModule: WebLlmModule | null = null;

  private async loadWebLlm(): Promise<WebLlmModule> {
    if (!this.webllmModule) {
      this.webllmModule = await import('@mlc-ai/web-llm');
    }
    return this.webllmModule;
  }
  private currentModelId: string | null = null;
  private visionModelId: string | null = null;
  private visionIsLoading = false;
  private visionIsLoaded = false;
  private isLoading = false;
  private isProcessing = false;
  private isLoaded = false;
  private progress = 0;
  private message = "";
  private error: string | null = null;
  private statusListeners: ((status: BuiltInAiStatus) => void)[] = [];
  private pendingRequest: Promise<any> = Promise.resolve();
  private skipCache = false;
  private corsBlocked = false;

  getStatus(): BuiltInAiStatus {
    const budget = getContextBudget(this.currentModelId);
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading || this.visionIsLoading,
      isProcessing: this.isProcessing,
      progress: this.progress,
      message: this.message,
      error: this.error,
      modelId: this.currentModelId,
      contextWindow: budget.contextWindow,
      maxInputChars: budget.maxInputChars,
      visionModelId: this.visionModelId,
      visionIsLoaded: this.visionIsLoaded,
      visionIsLoading: this.visionIsLoading,
    };
  }

  toggleSkipCache() {
    this.skipCache = !this.skipCache;
    console.log(`[BuiltInAI] Skip Cache toggled to: ${this.skipCache}`);
    if (this.isLoading || this.isLoaded) {
      this.reset();
    }
    this.notify();
    toast.info(`Local AI Cache: ${this.skipCache ? 'DISABLED (Run in RAM)' : 'ENABLED (Optimized)'}`);
  }

  isCacheSkipped() {
    return this.skipCache;
  }

  async clearCache(): Promise<void> {
    try {
      this.reset(); // Stop engine and clear internal state first
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
        console.log("[BuiltInAI] Cache cleared successfully.");
        toast.success("Local AI cache cleared successfully. You can now try re-initializing.");
      } else {
        throw new Error("Cache API not available.");
      }
    } catch (err: any) {
      console.error("[BuiltInAI] Failed to clear cache:", err);
      toast.error(`Failed to clear cache: ${err.message}`);
    }
  }

  onStatusChange(callback: (status: BuiltInAiStatus) => void) {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== callback);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.statusListeners.forEach(l => l(status));
  }

  reset() {
    if (this.engine) {
      this.engine.unload();
      this.engine = null;
    }
    if (this.visionEngine) {
      this.visionEngine.unload();
      this.visionEngine = null;
    }
    this.visionModelId = null;
    this.visionIsLoaded = false;
    this.visionIsLoading = false;
    this.isLoading = false;
    this.isLoaded = false;
    this.progress = 0;
    this.message = "";
    this.error = null;
    this.corsBlocked = false;
    this.notify();
  }

  async initVision(modelId: string = DEFAULT_BUILTIN_VISION_MODEL_ID) {
    const normalizedId = normalizeBuiltinModelId(modelId);
    if (this.visionIsLoading) return;
    if (this.visionIsLoaded && this.visionModelId === normalizedId) return;

    if (this.visionEngine && this.visionModelId !== normalizedId) {
      this.visionEngine.unload();
      this.visionEngine = null;
      this.visionIsLoaded = false;
    }

    this.visionIsLoading = true;
    this.message = `Loading vision model (${normalizedId})…`;
    this.notify();

    try {
      if (!(navigator as Navigator & { gpu?: unknown }).gpu) {
        throw new Error('WebGPU is required for local vision. Enable hardware acceleration in your browser.');
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const engineConfig: Record<string, unknown> = {
        initProgressCallback: (report: { text?: string; progress?: number }) => {
          this.message = report.text ? `Vision: ${report.text}` : 'Loading vision model…';
          this.progress = Math.round((report.progress ?? 0) * 100);
          this.notify();
        },
        appConfig: await buildProxiedWebLlmAppConfig(origin),
      };

      const webllm = await this.loadWebLlm();
      this.visionEngine = await webllm.CreateMLCEngine(normalizedId, engineConfig);
      this.visionModelId = normalizedId;
      this.visionIsLoaded = true;
      this.message = 'Local vision model ready';
      console.log(`[BuiltInAI] Vision model ${normalizedId} loaded.`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load local vision model.';
      this.error = errorMsg;
      console.error('[BuiltInAI] Vision init failed:', err);
      throw new Error(errorMsg);
    } finally {
      this.visionIsLoading = false;
      this.notify();
    }
  }

  /**
   * Multimodal inference (Phi-3.5 Vision). Pass one or more data:image URLs or https image URLs.
   */
  async generateWithVision(prompt: string, imageUrls: string[]): Promise<string> {
    if (!imageUrls.length) {
      throw new Error('At least one image URL is required for vision.');
    }

    const previous = this.pendingRequest;
    let resolveLock: (val: unknown) => void;
    this.pendingRequest = new Promise((resolve) => {
      resolveLock = resolve;
    });

    try {
      await previous;
      this.isProcessing = true;
      this.notify();

      const visionId = this.visionModelId || DEFAULT_BUILTIN_VISION_MODEL_ID;
      if (!this.visionIsLoaded || !this.visionEngine) {
        await this.initVision(visionId);
      }
      if (!this.visionEngine) {
        throw new Error(this.error || 'Local vision engine not ready.');
      }

      const budget = getContextBudget(visionId);
      const textPrompt = truncatePromptText(prompt, Math.floor(budget.maxInputChars * 0.65));

      const imageParts = imageUrls.slice(0, 4).map((url) => ({
        type: 'image_url' as const,
        image_url: { url },
      }));

      const response = await this.visionEngine.chat.completions.create({
        messages: [
          { role: 'system', content: BUILTIN_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [...imageParts, { type: 'text' as const, text: textPrompt }],
          },
        ],
        stream: false,
        temperature: 0.35,
        max_tokens: Math.min(1536, Math.floor(budget.contextWindow * budget.reserveOutputRatio)),
      });

      const content = response?.choices?.[0]?.message?.content;
      if (typeof content === 'string') return content;
      return '';
    } finally {
      this.isProcessing = false;
      this.notify();
      resolveLock!(null);
    }
  }

  async init(modelId: string = 'Phi-3-mini-4k-instruct-q4f16_1-MLC', customConfig?: any) {
    if (this.isLoading) return;
    const normalizedId = normalizeBuiltinModelId(modelId);

    if (this.isLoaded && this.currentModelId === normalizedId && !customConfig) return;

    this.isLoading = true;
    this.error = null;
    this.progress = 0;
    this.message = "Initializing engine...";
    this.notify();

    try {
      // 1. Check for WebGPU
      if (!(navigator as any).gpu) {
        throw new Error("WebGPU is not supported or disabled. Please ensure hardware acceleration is enabled in Chrome.");
      }

      console.log(`[BuiltInAI] Initializing ${normalizedId}...`);
      
      const engineConfig: any = {
        initProgressCallback: (report: any) => {
          this.message = report.text;
          this.progress = Math.round(report.progress * 100);
          this.notify();
        }
      };

      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      if (customConfig?.model_list) {
        engineConfig.appConfig = {
          ...customConfig,
          model_list: customConfig.model_list.map((rec: any) => ({
            ...rec,
            model: rewriteHuggingFaceModelUrl(rec.model, origin),
          })),
        };
        console.log('[BuiltInAI] Using custom appConfig (HF URLs proxied).');
      } else {
        engineConfig.appConfig = await buildProxiedWebLlmAppConfig(origin);
        console.log('[BuiltInAI] Using proxied WebLLM appConfig for HuggingFace weights.');
      }

      const webllm = await this.loadWebLlm();
      this.engine = await webllm.CreateMLCEngine(normalizedId, engineConfig);

      this.isLoaded = true;
      this.currentModelId = normalizedId;
      console.log(`[BuiltInAI] Model ${normalizedId} loaded successfully.`);
    } catch (err: any) {
      let errorMsg = err.message || "Failed to initialize Local AI Engine.";
      const raw = `${err?.message || ''} ${err?.stack || ''}`.toLowerCase();
      
      if (errorMsg.includes("Failed to execute 'add' on 'Cache'")) {
        errorMsg = "Browser Cache Restriction: Google AI Studio iframes block local storage. You MUST open this app in a NEW TAB to use local AI models.";
        console.warn("[BuiltInAI] Detected iframe cache restriction. User must open app in new tab.");
      }
      if (raw.includes('cors') || raw.includes('access-control-allow-origin')) {
        this.corsBlocked = true;
        errorMsg =
          'Local AI model download failed (network/CORS). Ensure /api/hf-proxy is deployed, or use Auto/Ollama/Groq in Settings.';
      }

      this.error = errorMsg;
      console.error("[BuiltInAI] Setup error details:", {
        message: err.message,
        stack: err.stack,
        modelId: normalizedId
      });
      
      // If we are in an iframe, provide the link directly in the toast
      if (window.self !== window.top) {
        toast.error("Initialization Failed: Please open the app in a new tab to enable local storage.", {
          duration: 10000,
        });
      } else if (this.corsBlocked) {
        toast.error("Local AI blocked by CORS on this domain. Use Auto/Cloud providers or localhost for Local AI.", {
          duration: 10000,
        });
      } else {
        toast.error(`Local AI failed: ${this.error}`);
      }
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  async generate(
    input: string | { role: "system" | "user" | "assistant"; content: string }[], 
    onToken?: (token: string) => void
  ): Promise<string> {
    const previous = this.pendingRequest;
    let resolveLock: (val: any) => void;
    this.pendingRequest = new Promise(resolve => { resolveLock = resolve; });

    try {
      if (this.isProcessing) {
        console.log("[BuiltInAI] Queuing concurrent request...");
      }
      await previous;
      this.isProcessing = true;
      this.notify();

      // Determine default model if none exists
      if (!this.currentModelId) this.currentModelId = 'Phi-3-mini-4k-instruct-q4f16_1-MLC';

      // Normalize input to messages array and inject Forge Master System Prompt
      const messages: any[] = [];
      const hasSystemMessage = typeof input !== 'string' && input.some(m => m.role === 'system');
      
      if (!hasSystemMessage) {
        messages.push({ role: "system", content: BUILTIN_SYSTEM_PROMPT });
      }

      const budget = getContextBudget(this.currentModelId);

      if (typeof input === 'string') {
        messages.push({
          role: 'user',
          content: truncatePromptText(input, budget.maxInputChars),
        });
      } else {
        messages.push(
          ...truncateMessagesForLocalAi(
            input.map((m) => ({ role: m.role, content: m.content })),
            budget.maxInputChars
          )
        );
      }

      const flatPrompt = typeof input === 'string'
        ? `${BUILTIN_SYSTEM_PROMPT}\n\nUSER: ${messages.find((m) => m.role === 'user')?.content || input}`
        : messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

      // ── 1. Try Chrome's built-in Gemini Nano first ──
      // Note: window.ai currently only takes a string prompt
      const windowAiResult = await tryWindowAi(flatPrompt);
      if (windowAiResult) {
        if (onToken) onToken(windowAiResult);
        return windowAiResult;
      }

      // ── 2. Use WebLLM Engine ──
      if (!this.isLoaded || !this.engine) {
        await this.init(this.currentModelId);
        if (!this.isLoaded) throw new Error(this.error || "Built-in AI engine not ready.");
      }

      let fullText = "";
      const chunks = await this.engine!.chat.completions.create({
        messages,
        stream: true,
        temperature: 0.7,
        top_p: 0.9,
        repetition_penalty: 1.2,
        max_tokens: Math.min(1024, Math.floor(budget.contextWindow * budget.reserveOutputRatio)),
      });

      for await (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta.content || "";
        fullText += delta;
        if (onToken) onToken(delta);
      }

      return fullText;
    } catch (err: any) {
      console.error("[BuiltInAI] Generation error:", err);
      throw err;
    } finally {
      this.isProcessing = false;
      this.notify();
      resolveLock!(null);
    }
  }
}

export const builtInAi = new BuiltInAiService();

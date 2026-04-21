import { toast } from 'sonner';
import * as webllm from '@mlc-ai/web-llm';

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
}

export interface BuiltInModel {
  id: string;
  name: string;
  size: string;
  description: string;
}

export const BUILTIN_MODELS: BuiltInModel[] = [
  { 
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', 
    name: 'Llama 3.2 1B Instruct', 
    size: '0.8GB',
    description: 'Meta\'s small but capable model. Best for fast responses on low-end hardware.'
  },
  { 
    id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC', 
    name: 'Phi-3 Mini Instruct', 
    size: '2.3GB',
    description: 'Microsoft\'s powerful 3.8B model. Highly optimized with strong reasoning.'
  },
  { 
    id: 'gemma-2-2b-it-q4f16_1-MLC', 
    name: 'Gemma 2 2B IT', 
    size: '1.6GB',
    description: 'Latest Google lightweight model. Excellent for writing and creativity.'
  },
  { 
    id: 'Llama-3.1-8B-Instruct-q4f32_1-MLC', 
    name: 'Llama 3.1 8B Instruct', 
    size: '5.2GB',
    description: 'Meta\'s industry-standard 8B model. Requires strong hardware and 8GB+ RAM.'
  },
  { 
    id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC', 
    name: 'Mistral 7B v0.3', 
    size: '4.8GB',
    description: 'The community favorite for high-quality instruction following.'
  }
];

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

class BuiltInAiService {
  private engine: webllm.MLCEngineInterface | null = null;
  private currentModelId: string | null = null;
  private isLoading = false;
  private isProcessing = false;
  private isLoaded = false;
  private progress = 0;
  private message = "";
  private error: string | null = null;
  private statusListeners: ((status: BuiltInAiStatus) => void)[] = [];
  private pendingRequest: Promise<any> = Promise.resolve();

  getStatus(): BuiltInAiStatus {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      isProcessing: this.isProcessing,
      progress: this.progress,
      message: this.message,
      error: this.error,
      modelId: this.currentModelId
    };
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
    this.isLoading = false;
    this.isLoaded = false;
    this.progress = 0;
    this.message = "";
    this.error = null;
    this.notify();
  }

  async init(modelId: string = 'Llama-3.2-1B-Instruct-q4f16_1-MLC') {
    if (this.isLoading) return;
    
    // Normalize modelId (lowercase some common ones that might have been saved with wrong case)
    let normalizedId = modelId;
    if (modelId.toLowerCase().includes('gemma-2')) {
      normalizedId = modelId.toLowerCase();
    } else if (modelId === 'Phi3-mini-4k-instruct-q4f16_1-MLC') {
      normalizedId = 'Phi-3-mini-4k-instruct-q4f16_1-MLC';
    }

    if (this.isLoaded && this.currentModelId === normalizedId) return;

    this.isLoading = true;
    this.error = null;
    this.progress = 0;
    this.message = "Initializing engine...";
    this.notify();

    try {
      // 1. Check for WebGPU
      if (!(navigator as any).gpu) {
        throw new Error("WebGPU is not supported or disabled in your browser. WebLLM requires WebGPU support (Chrome 113+).");
      }

      // 2. Load Engine
      this.engine = await webllm.CreateMLCEngine(normalizedId, {
        initProgressCallback: (report) => {
          this.message = report.text;
          this.progress = Math.round(report.progress * 100);
          console.log(`[BuiltInAI] ${report.text}`);
          this.notify();
        }
      });

      this.isLoaded = true;
      this.currentModelId = normalizedId;
      console.log(`[BuiltInAI] Model ${normalizedId} loaded successfully.`);
    } catch (err: any) {
      this.error = err.message || "Failed to initialize Local AI Engine.";
      console.error("[BuiltInAI] Setup error:", err);
      toast.error(`Local AI failed: ${this.error}`);
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

      // Normalize input to messages array
      const messages = typeof input === 'string' 
        ? [{ role: "user" as const, content: input }] 
        : input;
      
      const flatPrompt = typeof input === 'string'
        ? input
        : input.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

      // ── 1. Try Chrome's built-in Gemini Nano first ──
      // Note: window.ai currently only takes a string prompt
      const windowAiResult = await tryWindowAi(flatPrompt);
      if (windowAiResult) {
        if (onToken) onToken(windowAiResult);
        return windowAiResult;
      }

      // ── 2. Use WebLLM Engine ──
      if (!this.isLoaded || !this.engine) {
        await this.init(this.currentModelId || 'Llama-3.2-1B-Instruct-q4f16_1-MLC');
        if (!this.isLoaded) throw new Error(this.error || "Built-in AI engine not ready.");
      }

      let fullText = "";
      const chunks = await this.engine!.chat.completions.create({
        messages,
        stream: true,
        // High quality sampling to avoid repetition and loops
        temperature: 0.7,
        top_p: 0.9,
        repetition_penalty: 1.2,
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

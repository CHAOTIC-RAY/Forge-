/**
 * Built-in AI Service (Gemma 3 1B IT)
 * Runs entirely in-browser using MediaPipe / LiteRT
 */

export interface BuiltInAiStatus {
  isLoaded: boolean;
  isLoading: boolean;
  progress: number;
  error: string | null;
}

export interface BuiltInModel {
  id: string;
  name: string;
  url: string;
  size: string;
  description: string;
}

export const BUILTIN_MODELS: BuiltInModel[] = [
  { 
    id: 'gemma3-1b', 
    name: 'Gemma 3 1B IT', 
    url: 'https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/gemma3-1b-it-gpu-int4.bin',
    size: '≈1.0GB',
    description: 'Latest Google model. Best balance of speed and power.'
  },
  { 
    id: 'gemma2-2b', 
    name: 'Gemma 2 2B IT', 
    url: 'https://huggingface.co/google/gemma-2-2b-it-libert/resolve/main/gemma-2-2b-it-gpu-int4.bin',
    size: '≈1.5GB',
    description: 'Stable and smart. Good for complex instructions.'
  },
  { 
    id: 'falcon-1b', 
    name: 'Falcon 1B RW', 
    url: 'https://huggingface.co/tiiuae/falcon-1b-it-tflite/resolve/main/falcon-1b-it-gpu-int4.bin',
    size: '≈0.7GB',
    description: 'Ultra lightweight. Fast on older devices.'
  }
];

class BuiltInAiService {
  private inference: any = null;
  private currentModelId: string | null = null;
  private isLoading = false;
  private isLoaded = false;
  private progress = 0;
  private error: string | null = null;
  private statusListeners: ((status: BuiltInAiStatus) => void)[] = [];

  private readonly WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.14/wasm";

  getStatus(): BuiltInAiStatus {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      progress: this.progress,
      error: this.error
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

  private async loadLibrary(): Promise<any> {
    const GenAI = (window as any).GenAI || (window as any).tasksGenAi || (window as any).mediapipe?.tasks?.genai;
    if (GenAI) return GenAI;

    const cdns = [
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.14/genai_bundle.js",
      "https://unpkg.com/@mediapipe/tasks-genai/genai_bundle.js"
    ];

    for (const url of cdns) {
      try {
        console.log(`[BuiltInAI] Trying CDN: ${url}`);
        await this.injectScript(url);
        const loadedGenAI = (window as any).GenAI || (window as any).tasksGenAi || (window as any).mediapipe?.tasks?.genai;
        if (loadedGenAI) return loadedGenAI;
      } catch (e) {
        console.warn(`[BuiltInAI] Failed to load from ${url}`);
      }
    }

    // ULTIMATE FALLBACK: Same-origin proxy
    try {
      const proxyUrl = `/api/proxy-js?url=${encodeURIComponent("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.14/genai_bundle.js")}`;
      console.log(`[BuiltInAI] CDNs blocked. Trying same-origin proxy: ${proxyUrl}`);
      await this.injectScript(proxyUrl);
      const loadedGenAI = (window as any).GenAI || (window as any).tasksGenAi || (window as any).mediapipe?.tasks?.genai;
      if (loadedGenAI) return loadedGenAI;
    } catch (e) {
      console.error("[BuiltInAI] Proxy fallback failed.");
    }

    throw new Error("Could not load MediaPipe GenAI library. All CDNs and local proxys failed. Please check your browser's security settings or extensions.");
  }

  private injectScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Load failed: ${url}`));
      document.head.appendChild(script);
    });
  }

  async init(modelId: string = 'gemma3-1b') {
    if (this.isLoading) return;
    if (this.isLoaded && this.currentModelId === modelId) return;

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      // Find model
      const model = BUILTIN_MODELS.find(m => m.id === modelId) || BUILTIN_MODELS[0];

      // Ensure library is loaded
      const GenAI = await this.loadLibrary();
      
      const { LlmInference, FilesetResolver } = GenAI;

      const genaiFileset = await FilesetResolver.forGenAiTasks(this.WASM_PATH);
      
      this.inference = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: {
          modelAssetPath: model.url,
        },
        maxTokens: 1024,
        topK: 40,
        temperature: 0.7,
        randomSeed: Math.floor(Math.random() * 1000),
      });

      this.isLoaded = true;
      this.currentModelId = modelId;
      console.log(`[BuiltInAI] ${model.name} loaded successfully.`);
    } catch (err: any) {
      this.error = err.message || "Failed to load Gemma 3 model.";
      console.error("[BuiltInAI] Initialization error:", err);
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  async generate(prompt: string, onToken?: (token: string) => void): Promise<string> {
    if (!this.isLoaded || !this.inference) {
      await this.init();
      if (!this.isLoaded) throw new Error(this.error || "Built-in AI not ready.");
    }

    try {
      if (onToken) {
        // Streaming support
        return new Promise((resolve, reject) => {
          let fullText = "";
          this.inference.generateResponse(prompt, (partialText: string, done: boolean) => {
            fullText = partialText;
            onToken(partialText);
            if (done) resolve(fullText);
          }).catch(reject);
        });
      }

      const result = await this.inference.generateResponse(prompt);
      return result;
    } catch (err: any) {
      console.error("[BuiltInAI] Generation error:", err);
      throw err;
    }
  }
}

export const builtInAi = new BuiltInAiService();

import { toast } from 'sonner';

/**
 * Built-in AI Service (Gemma 3 1B IT)
 * Runs entirely in-browser using MediaPipe / LiteRT
 */

// IndexedDB Cache for models (Faster re-initialization)
const DB_NAME = 'built_in_ai_db';
const STORE_NAME = 'models';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getCachedBlob = async (key: string): Promise<Blob | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

const setCachedBlob = async (key: string, blob: Blob): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("[BuiltInAI] Cache write error:", e);
  }
};

// WebGPU Polyfill for requestAdapterInfo (Deprecated and removed in modern browsers)
if (typeof navigator !== 'undefined' && (navigator as any).gpu && typeof (window as any).GPUAdapter !== 'undefined' && !('requestAdapterInfo' in (window as any).GPUAdapter.prototype)) {
  try {
    ((window as any).GPUAdapter.prototype as any).requestAdapterInfo = async function() {
      return (this as any).info || { vendor: "", architecture: "", device: "", description: "" };
    };
    console.log("[BuiltInAI] WebGPU requestAdapterInfo polyfill applied.");
  } catch (e) {
    console.warn("[BuiltInAI] Could not polyfill WebGPU requestAdapterInfo:", e);
  }
}

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
    name: 'Gemma 3 1B IT (Int4)', 
    url: 'https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/gemma3-1b-it-int4-web.task',
    size: '0.7GB',
    description: 'Ultra-lightweight Google model. Very fast, under 1GB.'
  },
  { 
    id: 'gemma2-2b', 
    name: 'Gemma 2 2B IT (Int8)', 
    url: 'https://huggingface.co/CarlosJefte/Gemma-2-2b-mediapipe/resolve/main/gemma2-2b-it-gpu-int8.bin',
    size: '2.6GB',
    description: 'Latest model with superior reasoning capability.'
  },
  { 
    id: 'gemma-2b', 
    name: 'Gemma 2B IT (Int4)', 
    url: 'https://huggingface.co/alexdlov/gemma-2b-it-gpu-int4.bin/resolve/main/gemma-2b-it-gpu-int4.bin',
    size: '1.5GB',
    description: 'Stable and smart. Good for complex instructions.'
  },
  { 
    id: 'falcon-1b-gpu', 
    name: 'Falcon 1B RW (Int16)', 
    url: 'https://huggingface.co/a8nova/falcon-1b-gpu-int16/resolve/main/falcon-1b-gpu-int16.bin',
    size: '1.4GB',
    description: 'Ultra lightweight. Fast on older devices.'
  },
  { 
    id: 'phi2-cpu', 
    name: 'Phi-2 2.7B (CPU)', 
    url: 'https://huggingface.co/siddhantchalke/phi2-cpu-mediapipe-llm-inference/resolve/main/phi2_cpu.bin',
    size: '2.7GB',
    description: 'Microsoft\'s Phi-2 model. Runs on CPU.'
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
    try {
      // Import from local node_modules
      // We use @mediapipe/tasks-genai which was just installed via npm
      const pkg = await import('@mediapipe/tasks-genai');
      if (pkg && pkg.LlmInference) return pkg;
    } catch (e) {
      console.warn("[BuiltInAI] Local package import failed:", e);
    }

    // Official CDN Fallback (UMD)
    const cdns = [
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/genai_bundle.js",
      "https://www.gstatic.com/mediapipe/solutions/genai/genai_bundle.js"
    ];

    for (const url of cdns) {
      try {
        console.log(`[BuiltInAI] Trying Fallback CDN: ${url}`);
        await this.injectScript(url);
        const globalGenAI = (window as any).GenAI || (window as any).tasksGenAi || (window as any).mediapipe?.tasks?.genai;
        if (globalGenAI) return globalGenAI;
      } catch (e) {}
    }

    throw new Error("Local AI Engine library missing. Please restart your dev server or check browser console.");
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
      this.progress = 0;
      this.notify();

      // Find model
      const model = BUILTIN_MODELS.find(m => m.id === modelId) || BUILTIN_MODELS[0];

      // 1. Check IndexedDB Cache first
      let blob = await getCachedBlob(model.id);
      
      if (blob) {
        console.log(`[BuiltInAI] Loading ${model.name} from local cache...`);
        this.progress = 50; // Instantly move to 50% if cached
        this.notify();
      } else {
        // 2. Manual fetch to track progress
        console.log(`[BuiltInAI] Fetching model from ${model.url}`);
        const response = await fetch(model.url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength || '0', 10);
        
        let loaded = 0;
        const chunks: Uint8Array[] = [];
        const reader = response.body!.getReader();
        
        while(true) {
          const {done, value} = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.length;
            if (total) {
              this.progress = Math.min(99, Math.round((loaded / total) * 100)); // Keep at 99% until fully loaded into memory
              this.notify();
            }
          }
        }
        
        console.log(`[BuiltInAI] Download complete. Caching and Creating Object URL...`);
        blob = new Blob(chunks, { type: 'application/octet-stream' });
        await setCachedBlob(model.id, blob); // Save to cache for next time
      }

      const objectUrl = URL.createObjectURL(blob);

      // Ensure library is loaded
      const GenAI = await this.loadLibrary();
      
      const { LlmInference, FilesetResolver } = GenAI;

      const genaiFileset = await FilesetResolver.forGenAiTasks(this.WASM_PATH);
      
      this.inference = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: {
          // Absolute path or direct URL
          modelAssetPath: objectUrl,
        },
        maxTokens: 4096,
        topK: 10,
        temperature: 0.3,
      });

      URL.revokeObjectURL(objectUrl);
      this.progress = 100;
      this.isLoaded = true;
      this.currentModelId = modelId;
      console.log(`[BuiltInAI] ${model.name} loaded successfully.`);
    } catch (err: any) {
      this.error = err.message || "Failed to load Gemma 3 model.";
      console.error("[BuiltInAI] Initialization error:", err);
      toast.error(`Local AI Load Failed: ${this.error}`);
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  async generate(prompt: string, onToken?: (token: string) => void): Promise<string> {
    if (!this.isLoaded || !this.inference) {
      // Re-trigger init if lost, this handles the auto-re-init faster now via cache
      await this.init(this.currentModelId || 'gemma3-1b');
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

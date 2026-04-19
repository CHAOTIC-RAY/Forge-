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

class BuiltInAiService {
  private inference: any = null;
  private isLoading = false;
  private isLoaded = false;
  private progress = 0;
  private error: string | null = null;
  private statusListeners: ((status: BuiltInAiStatus) => void)[] = [];

  // Gemma 3 1B IT Model (Optimized for WebGPU/LiteRT)
  private readonly MODEL_URL = "https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/gemma3-1b-it-gpu-int4.bin";
  private readonly WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm";

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

  async init() {
    if (this.isLoaded || this.isLoading) return;

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      // Access MediaPipe from Global (loaded via script tag)
      const GenAI = (window as any).GenAI || (window as any).tasksGenAi;
      if (!GenAI) {
        throw new Error("MediaPipe GenAI library not loaded. Check your internet connection.");
      }

      const { LlmInference, FilesetResolver } = GenAI;

      const genaiFileset = await FilesetResolver.forGenAiTasks(this.WASM_PATH);
      
      this.inference = await LlmInference.createFromOptions(genaiFileset, {
        baseOptions: {
          modelAssetPath: this.MODEL_URL,
        },
        maxTokens: 1024,
        topK: 40,
        temperature: 0.7,
        randomSeed: Math.floor(Math.random() * 1000),
      });

      this.isLoaded = true;
      console.log("[BuiltInAI] Gemma 3 1B IT loaded successfully.");
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

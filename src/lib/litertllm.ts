import { CommunityLitert } from './communityLitert';

/**
 * LiteRT LLM Service (Google AI Edge)
 * Provides high-performance, cross-platform generative AI inference.
 * Uses the CommunityLitert wrapper for @litert-lm/core.
 */
export interface LitertllmModel {
  id: string;
  name: string;
  size: string;
  description: string;
  url: string;
  recommendedRamGb: number;
}

export interface LitertllmStatus {
  isLoaded: boolean;
  isLoading: boolean;
  progress: number;
  modelId: string | null;
  error: string | null;
}

class LitertllmAiService {
  private currentModelId: string | null = null;
  private isLoading = false;
  private isLoaded = false;
  private progress = 0;
  private error: string | null = null;
  private statusListeners: ((status: LitertllmStatus) => void)[] = [];

  static MODELS: LitertllmModel[] = [
    {
      id: 'gemma-3-1b-it-web',
      name: 'Gemma 3 1B IT (LiteRT - Efficient)',
      size: '1.2GB',
      description: 'Google Gemma 3 1B model optimized for LiteRT-LM. Best for mobile and speed.',
      url: 'https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm',
      recommendedRamGb: 4,
    },
    {
      id: 'gemma-4-e2b-it-web',
      name: 'Gemma 4 E2B IT (LiteRT - Fastest)',
      size: '1.2GB',
      description: 'Ultra-fast Gemma 4 model with Multi-Token Prediction. Best for mobile.',
      url: 'https://huggingface.co/google/gemma-4-e2b-it-litert/resolve/main/gemma-4-e2b-it-web.litertlm',
      recommendedRamGb: 4,
    },
    {
      id: 'gemma-2-2b-it-web',
      name: 'Gemma 2 2B IT (LiteRT - Balanced)',
      size: '1.6GB',
      description: 'Balanced Gemma 2 2B model for good performance and efficiency.',
      url: 'https://huggingface.co/google/gemma-2-2b-it-litert/resolve/main/gemma-2-2b-it-web.litertlm',
      recommendedRamGb: 8,
    },
    {
      id: 'gemma-2-9b-it-web',
      name: 'Gemma 2 9B IT (LiteRT - Performance)',
      size: '5.4GB',
      description: 'Larger, more capable Gemma model for complex reasoning. Best for desktop.',
      url: 'https://huggingface.co/google/gemma-2-9b-it-litert/resolve/main/gemma-2-9b-it-web.litertlm',
      recommendedRamGb: 16,
    },
    {
      id: 'phi-3-mini-4k-web',
      name: 'Phi-3 Mini 4K (LiteRT - Efficient)',
      size: '2.3GB',
      description: 'Microsoft Phi-3 Mini model optimized for efficiency and strong reasoning.',
      url: 'https://huggingface.co/litert-community/Phi-3-mini-4k-instruct/resolve/main/Phi-3-mini-4k-instruct_q4_ekv2048.litertlm',
      recommendedRamGb: 8,
    },
    {
      id: 'llama-3.2-1b-web',
      name: 'Llama 3.2 1B (LiteRT - Ultra Efficient)',
      size: '0.8GB',
      description: 'Meta Llama 3.2 1B model for maximum efficiency on low-end devices.',
      url: 'https://huggingface.co/litert-community/Llama-3.2-1B-Instruct/resolve/main/Llama-3.2-1B-Instruct_q4_ekv2048.litertlm',
      recommendedRamGb: 4,
    }
  ];

  static MOBILE_DEFAULT = 'gemma-3-1b-it-web';
  static DESKTOP_DEFAULT = 'gemma-2-2b-it-web';

  getStatus(): LitertllmStatus {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      progress: this.progress,
      modelId: this.currentModelId,
      error: this.error,
    };
  }

  onStatusChange(callback: (status: LitertllmStatus) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== callback);
    };
  }

  private notify(): void {
    const status = this.getStatus();
    this.statusListeners.forEach(l => l(status));
  }

  private isMobile(): boolean {
    return typeof navigator !== 'undefined' && (/Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth < 768);
  }

  async loadModel(modelId?: string): Promise<void> {
    if (this.isLoading) return;
    if (this.isLoaded && this.currentModelId === modelId) return;

    const targetId = modelId || (this.isMobile() ? LitertllmAiService.MOBILE_DEFAULT : LitertllmAiService.DESKTOP_DEFAULT);
    const modelConfig = LitertllmAiService.MODELS.find(m => m.id === targetId);

    if (!modelConfig) {
      throw new Error(`Litertllm model "${targetId}" not found.`);
    }

    this.isLoading = true;
    this.error = null;
    this.progress = 0;
    this.notify();

    try {
      console.log(`[Litertllm] Loading model: ${targetId}`);

      // Download model using CommunityLitert
      const downloadResult = await CommunityLitert.downloadModel({
        modelId: targetId,
        url: modelConfig.url
      });

      if (downloadResult.status !== 'completed' || !downloadResult.modelPath) {
        throw new Error(downloadResult.error || 'Download failed');
      }

      this.progress = 0.8;
      this.notify();

      // Load model using CommunityLitert
      const loadResult = await CommunityLitert.loadModel({
        modelId: targetId,
        modelPath: downloadResult.modelPath,
        contextWindowSize: 4096
      });

      if (!loadResult.success) {
        throw new Error(loadResult.error || 'Load failed');
      }

      this.isLoaded = true;
      this.currentModelId = targetId;
      this.progress = 1;
      console.log(`[Litertllm] Model ${targetId} loaded successfully.`);
      this.notify();

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load LiteRT-LM model.';
      this.error = errorMsg;
      console.error('[Litertllm] Load error:', err);
      throw new Error(errorMsg);
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  async generateText(prompt: string, onToken?: (token: string) => void): Promise<string> {
    if (!this.isLoaded) {
      const targetId = this.isMobile() ? LitertllmAiService.MOBILE_DEFAULT : LitertllmAiService.DESKTOP_DEFAULT;
      await this.loadModel(targetId);
    }

    try {
      const result = await CommunityLitert.complete({
        messages: [{ role: 'user', content: prompt }]
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (onToken && result.text) {
        onToken(result.text);
      }

      return result.text;
    } catch (err: any) {
      console.error('[Litertllm] Generation error:', err);
      throw err;
    }
  }

  async unload(): Promise<void> {
    await CommunityLitert.unloadModel();
    this.isLoaded = false;
    this.currentModelId = null;
    this.error = null;
    this.notify();
  }
}

export const litertllm = new LitertllmAiService();

export function getLitertllmModelId(): string {
  const isMobile = typeof navigator !== 'undefined' && (/Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth < 768);
  return isMobile ? LitertllmAiService.MOBILE_DEFAULT : LitertllmAiService.DESKTOP_DEFAULT;
}

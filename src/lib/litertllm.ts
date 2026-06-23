import { Engine } from '@litert-lm/core';

/**
 * LiteRT LLM Service (Google AI Edge)
 * Provides high-performance, cross-platform generative AI inference.
 * Uses the official @litert-lm/core package.
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
  private engine: any = null;
  private currentModelId: string | null = null;
  private isLoading = false;
  private isLoaded = false;
  private progress = 0;
  private error: string | null = null;
  private statusListeners: ((status: LitertllmStatus) => void)[] = [];

  static MODELS: LitertllmModel[] = [
    {
      id: 'gemma-4-e2b-it-web',
      name: 'Gemma 4 E2B IT (LiteRT - Fastest)',
      size: '1.2GB',
      description: 'Ultra-fast Gemma 4 model with Multi-Token Prediction. Best for mobile.',
      url: '/api/hf-proxy/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it-web.litertlm',
      recommendedRamGb: 4,
    },
    {
      id: 'gemma-4-e4b-it-web',
      name: 'Gemma 4 E4B IT (LiteRT - Performance)',
      size: '2.8GB',
      description: 'More capable Gemma 4 model for higher quality text. Best for desktop.',
      url: '/api/hf-proxy/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it-web.litertlm',
      recommendedRamGb: 8,
    }
  ];

  static MOBILE_DEFAULT = 'gemma-4-e2b-it-web';
  static DESKTOP_DEFAULT = 'gemma-4-e4b-it-web';

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
    const targetId = modelId || (this.isMobile() ? LitertllmAiService.MOBILE_DEFAULT : LitertllmAiService.DESKTOP_DEFAULT);

    if (this.isLoaded && this.currentModelId === targetId) return;

    const modelConfig = LitertllmAiService.MODELS.find(m => m.id === targetId);

    if (!modelConfig) {
      throw new Error(`Litertllm model "${targetId}" not found.`);
    }

    this.isLoading = true;
    this.error = null;
    this.progress = 0;
    this.notify();

    try {
      if (this.engine) {
        await this.unload();
      }

      console.log(`[Litertllm] Loading model: ${targetId} from ${modelConfig.url}`);

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = modelConfig.url.startsWith('/') ? `${origin}${modelConfig.url}` : modelConfig.url;

      this.engine = await Engine.create({
        model: fullUrl,
        mainExecutorSettings: {
          maxNumTokens: 8192,
        }
      });

      this.isLoaded = true;
      this.currentModelId = targetId;
      console.log(`[Litertllm] Model ${targetId} loaded successfully.`);

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
    if (!this.isLoaded || !this.engine) {
      const targetId = this.isMobile() ? LitertllmAiService.MOBILE_DEFAULT : LitertllmAiService.DESKTOP_DEFAULT;
      await this.loadModel(targetId);
    }

    try {
      const conversation = await this.engine.createConversation();

      if (onToken) {
        const stream = conversation.sendMessageStreaming(prompt);
        let fullText = '';
        for await (const chunk of stream) {
          for (const item of chunk.content) {
            if (item.type === 'text') {
              fullText += item.text;
              onToken(item.text);
            }
          }
        }
        return fullText;
      } else {
        const response = await conversation.sendMessage(prompt);
        return response.content[0].text;
      }
    } catch (err: any) {
      console.error('[Litertllm] Generation error:', err);
      throw err;
    }
  }

  async unload(): Promise<void> {
    if (this.engine) {
      if (typeof this.engine.delete === 'function') {
        await this.engine.delete();
      }
      this.engine = null;
    }
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

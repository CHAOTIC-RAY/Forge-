/**
 * Community LiteRT Plugin
 * Uses @litert-lm/core directly for cross-platform local AI inference.
 * All models are sourced from the litert-community Hugging Face organization.
 */

import { Engine, type Conversation } from '@litert-lm/core';
import { rewriteHuggingFaceModelUrl } from './webLlmAppConfig';

export interface CommunityLitertDeviceInfo {
  platform: 'android' | 'ios' | 'web' | 'desktop';
  socModel?: string;
  supportedBackends: Backend[];
  recommendedBackend: Backend;
  hasWebGpu: boolean;
  hasWasmJspi: boolean;
  totalMemoryMb: number;
}

export type Backend = 'npu' | 'gpu' | 'cpu' | 'auto';

export interface CommunityLitertDownloadOptions {
  modelId: string;
  url: string;
  destinationPath?: string;
}

export interface CommunityLitertDownloadProgress {
  modelId: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  status: 'downloading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  modelPath?: string;
}

export interface CommunityLitertLoadModelOptions {
  modelId: string;
  modelPath: string;
  backend?: Backend;
  contextWindowSize?: number;
}

export interface CommunityLitertLoadModelResult {
  modelId: string;
  backend: Backend;
  contextWindowSize: number;
  success: boolean;
  error?: string;
}

export interface CommunityLitertCompleteOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CommunityLitertCompleteResult {
  text: string;
  finishReason: 'stop' | 'length' | 'error';
  tokensGenerated: number;
  error?: string;
}

export interface CommunityLitertModelStatus {
  isLoaded: boolean;
  modelId: string | null;
  backend: Backend | null;
  contextWindowSize: number | null;
  isDownloading: boolean;
  downloadProgress: number;
}

/**
 * Community LiteRT plugin implementation using @litert-lm/core directly.
 * No Capacitor plugin wrapper required - works on web, Android (via WebView), and iOS.
 */
class CommunityLitertPlugin {
  private engine: Engine | null = null;
  private conversation: Conversation | null = null;
  private currentModelId: string | null = null;
  private isDownloading = false;
  private downloadProgress = 0;
  private downloadCancelController: AbortController | null = null;
  private currentModelPath: string | null = null;

  async getDeviceInfo(): Promise<CommunityLitertDeviceInfo> {
    const hasGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
    const hasJspi = typeof WebAssembly !== 'undefined' &&
      typeof (WebAssembly as { Suspending?: unknown }).Suspending === 'function';

    let platform: CommunityLitertDeviceInfo['platform'] = 'web';
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      if (/Android/i.test(ua)) platform = 'android';
      else if (/iPad|iPhone|iPod/i.test(ua)) platform = 'ios';
      else if (/Win|Mac|Linux/i.test(ua) && !/Mobile/i.test(ua)) platform = 'desktop';
    }

    const totalMemoryMb = typeof navigator !== 'undefined' && (navigator as { deviceMemory?: number }).deviceMemory
      ? (navigator as { deviceMemory?: number }).deviceMemory! * 1024
      : 4096;

    return {
      platform,
      supportedBackends: ['cpu', 'gpu'],
      recommendedBackend: hasGpu ? 'gpu' : 'cpu',
      hasWebGpu: hasGpu,
      hasWasmJspi: hasJspi,
      totalMemoryMb,
    };
  }

  async downloadModel(options: CommunityLitertDownloadOptions): Promise<CommunityLitertDownloadProgress> {
    if (this.isDownloading) {
      throw new Error('A download is already in progress');
    }

    this.isDownloading = true;
    this.downloadProgress = 0;
    this.downloadCancelController = new AbortController();

    try {
      const response = await fetch(options.url, {
        signal: this.downloadCancelController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentLength = response.headers.get('Content-Length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      let downloadedBytes = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        downloadedBytes += value.length;
        this.downloadProgress = totalBytes > 0 ? downloadedBytes / totalBytes : 0;
      }

      const blob = new Blob(chunks);
      const modelPath = URL.createObjectURL(blob);

      this.isDownloading = false;
      this.currentModelPath = modelPath;

      return {
        modelId: options.modelId,
        progress: 1,
        downloadedBytes,
        totalBytes,
        status: 'completed',
        modelPath,
      };
    } catch (error: any) {
      this.isDownloading = false;
      if (error.name === 'AbortError') {
        return {
          modelId: options.modelId,
          progress: this.downloadProgress,
          downloadedBytes: 0,
          totalBytes: 0,
          status: 'cancelled',
        };
      }
      throw error;
    }
  }

  async loadModel(options: CommunityLitertLoadModelOptions): Promise<CommunityLitertLoadModelResult> {
    try {
      if (this.engine) {
        await this.unloadModel();
      }

      console.log(`[CommunityLitert] Loading model: ${options.modelId}`);

      this.engine = await Engine.create({
        model: options.modelPath,
        mainExecutorSettings: {
          maxNumTokens: options.contextWindowSize ?? 4096,
        },
      });

      this.conversation = await this.engine.createConversation();
      this.currentModelId = options.modelId;

      console.log(`[CommunityLitert] Model loaded successfully`);

      return {
        modelId: options.modelId,
        backend: options.backend || 'gpu',
        contextWindowSize: options.contextWindowSize ?? 4096,
        success: true,
      };
    } catch (error: any) {
      console.error('[CommunityLitert] Load error:', error);
      return {
        modelId: options.modelId,
        backend: options.backend || 'gpu',
        contextWindowSize: options.contextWindowSize ?? 4096,
        success: false,
        error: error.message || 'Failed to load model',
      };
    }
  }

  async complete(options: CommunityLitertCompleteOptions): Promise<CommunityLitertCompleteResult> {
    if (!this.engine || !this.conversation) {
      throw new Error('No model loaded. Call loadModel first.');
    }

    try {
      const prompt = this.formatMessages(options.messages);
      const response = await this.conversation.sendMessage(prompt);
      const text = this.extractText(response);

      return {
        text,
        finishReason: 'stop',
        tokensGenerated: text.length,
      };
    } catch (error: any) {
      console.error('[CommunityLitert] Complete error:', error);
      return {
        text: '',
        finishReason: 'error',
        tokensGenerated: 0,
        error: error.message || 'Generation failed',
      };
    }
  }

  async completeStream(
    options: CommunityLitertCompleteOptions,
    callback: (chunk: string) => void
  ): Promise<CommunityLitertCompleteResult> {
    const result = await this.complete(options);
    callback(result.text);
    return result;
  }

  async unloadModel(): Promise<void> {
    if (this.engine) {
      try {
        if (typeof this.engine.close === 'function') {
          await this.engine.close();
        } else if (typeof this.engine.delete === 'function') {
          this.engine.delete();
        }
      } catch (error) {
        console.error('[CommunityLitert] Unload error:', error);
      }
      this.engine = null;
    }
    this.conversation = null;
    this.currentModelId = null;
    if (this.currentModelPath) {
      URL.revokeObjectURL(this.currentModelPath);
      this.currentModelPath = null;
    }
  }

  async getModelStatus(): Promise<CommunityLitertModelStatus> {
    return {
      isLoaded: this.engine !== null,
      modelId: this.currentModelId,
      backend: this.engine ? 'gpu' : null,
      contextWindowSize: this.engine ? 4096 : null,
      isDownloading: this.isDownloading,
      downloadProgress: this.downloadProgress,
    };
  }

  async cancel(): Promise<void> {
    if (this.downloadCancelController) {
      this.downloadCancelController.abort();
      this.downloadCancelController = null;
    }
    this.isDownloading = false;
  }

  private formatMessages(messages: ChatMessage[]): string {
    return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }

  private extractText(response: any): string {
    if (typeof response === 'string') return response;
    if (response?.content?.[0]?.text) return response.content[0].text;
    if (response?.text) return response.text;
    return '';
  }
}

export const CommunityLitert = new CommunityLitertPlugin();

/**
 * Rewrite a Hugging Face URL to use the proxy if needed.
 */
export function rewriteModelUrl(url: string, origin?: string): string {
  return rewriteHuggingFaceModelUrl(url, origin || (typeof window !== 'undefined' ? window.location.origin : ''));
}

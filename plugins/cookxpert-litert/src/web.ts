import { WebPlugin } from '@capacitor/core';
import { Engine, type Conversation, type Message } from '@litert-lm/core';
import { CookXpertLiteRtPlugin, DeviceInfo, DownloadModelOptions, DownloadProgress, LoadModelOptions, LoadModelResult, CompleteOptions, CompleteResult, ModelStatus, Backend, ChatMessage } from './definitions';
import { getPlatform, isWebLiteRtSupported, getWebGpuAdapterInfo, getDeviceMemory } from './runtime';

export class CookXpertLiteRtWeb extends WebPlugin implements CookXpertLiteRtPlugin {
  private engine: Engine | null = null;
  private conversation: Conversation | null = null;
  private currentModelId: string | null = null;
  private isDownloading = false;
  private downloadProgress = 0;
  private downloadCancelController: AbortController | null = null;

  constructor() {
    super({
      name: 'CookXpertLiteRt',
      platforms: ['web']
    });
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    const gpuInfo = await getWebGpuAdapterInfo();
    const memory = getDeviceMemory();
    
    return {
      platform: getPlatform(),
      supportedBackends: ['cpu', 'gpu'], // Web only supports CPU/GPU via WebGPU
      recommendedBackend: gpuInfo.available ? 'gpu' : 'cpu',
      hasWebGpu: gpuInfo.available,
      hasWasmJspi: typeof WebAssembly !== 'undefined' && 
                   typeof (WebAssembly as { Suspending?: unknown }).Suspending === 'function',
      totalMemoryMb: memory
    };
  }

  async downloadModel(options: DownloadModelOptions): Promise<DownloadProgress> {
    if (this.isDownloading) {
      throw new Error('A download is already in progress');
    }

    this.isDownloading = true;
    this.downloadProgress = 0;
    this.downloadCancelController = new AbortController();

    try {
      const response = await fetch(options.url, {
        signal: this.downloadCancelController.signal
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

        // Notify progress
        this.notifyListeners('downloadProgress', {
          modelId: options.modelId,
          progress: this.downloadProgress,
          downloadedBytes,
          totalBytes,
          status: 'downloading'
        });
      }

      // Combine chunks and create blob URL
      const blob = new Blob(chunks);
      const modelPath = URL.createObjectURL(blob);

      this.isDownloading = false;

      return {
        modelId: options.modelId,
        progress: 1,
        downloadedBytes,
        totalBytes,
        status: 'completed',
        modelPath
      };
    } catch (error: any) {
      this.isDownloading = false;
      if (error.name === 'AbortError') {
        return {
          modelId: options.modelId,
          progress: this.downloadProgress,
          downloadedBytes: 0,
          totalBytes: 0,
          status: 'cancelled'
        };
      }
      throw error;
    }
  }

  async loadModel(options: LoadModelOptions): Promise<LoadModelResult> {
    try {
      if (this.engine) {
        await this.unloadModel();
      }

      console.log(`[CookXpertLiteRtWeb] Loading model: ${options.modelId}`);

      this.engine = await Engine.create({
        model: options.modelPath,
        mainExecutorSettings: {
          maxNumTokens: options.contextWindowSize ?? 4096,
        },
      });

      // Create initial conversation
      this.conversation = await this.engine.createConversation();
      this.currentModelId = options.modelId;

      console.log(`[CookXpertLiteRtWeb] Model loaded successfully`);

      return {
        modelId: options.modelId,
        backend: options.backend || 'gpu',
        contextWindowSize: options.contextWindowSize ?? 4096,
        success: true
      };
    } catch (error: any) {
      console.error('[CookXpertLiteRtWeb] Load error:', error);
      return {
        modelId: options.modelId,
        backend: options.backend || 'gpu',
        contextWindowSize: options.contextWindowSize ?? 4096,
        success: false,
        error: error.message || 'Failed to load model'
      };
    }
  }

  async complete(options: CompleteOptions): Promise<CompleteResult> {
    if (!this.engine || !this.conversation) {
      throw new Error('No model loaded. Call loadModel first.');
    }

    try {
      // Convert messages to LiteRT format
      const prompt = this.formatMessages(options.messages);
      
      // Send message to conversation
      const response = await this.conversation.sendMessage(prompt);
      
      // Extract text from response
      const text = this.extractText(response);

      return {
        text,
        finishReason: 'stop',
        tokensGenerated: text.length // Approximate
      };
    } catch (error: any) {
      console.error('[CookXpertLiteRtWeb] Complete error:', error);
      return {
        text: '',
        finishReason: 'error',
        tokensGenerated: 0,
        error: error.message || 'Generation failed'
      };
    }
  }

  async completeStream(options: CompleteOptions, callback: (chunk: string) => void): Promise<CompleteResult> {
    // For basic implementation, fall back to non-streaming
    // Streaming would require async generator support in LiteRT
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
        console.error('[CookXpertLiteRtWeb] Unload error:', error);
      }
      this.engine = null;
    }
    this.conversation = null;
    this.currentModelId = null;
  }

  async getModelStatus(): Promise<ModelStatus> {
    return {
      isLoaded: this.engine !== null,
      modelId: this.currentModelId,
      backend: this.engine ? 'gpu' : null,
      contextWindowSize: this.engine ? 4096 : null,
      isDownloading: this.isDownloading,
      downloadProgress: this.downloadProgress
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
    // Simple message formatting - can be enhanced based on model requirements
    return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }

  private extractText(response: any): string {
    // Handle different response formats from LiteRT
    if (typeof response === 'string') return response;
    if (response?.content?.[0]?.text) return response.content[0].text;
    if (response?.text) return response.text;
    return '';
  }
}

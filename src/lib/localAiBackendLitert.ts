/**
 * Local AI Backend Service for LiteRT-LM
 * Uses community LiteRT models via @litert-lm/core directly.
 * No Capacitor plugin wrapper required - works cross-platform.
 */

import {
  CommunityLitert,
  CommunityLitertLoadModelOptions,
  CommunityLitertCompleteOptions,
  Backend,
} from './communityLitert';
import { findBestModel, resolveLiteRtArtifact, buildLiteRtDownloadUrl, getAvailableModels, CommunityLitertManifestModel } from './litertModelResolver';
import { getRuntimeCapabilities, isLiteRtSupported, getRecommendedRuntime } from './runtimeDetection';
import { installWebGpuAdapterPreferencePatch } from './webGpuAdapterPatch';
import { getContextBudget, truncateMessagesForLocalAi } from './localAiContext';

export interface LocalAiBackendConfig {
  autoBootstrap?: boolean;
  preferredPowerTier?: 'balanced' | 'performance' | 'efficiency';
  preferredBackend?: Backend;
  enableWebGpuPatch?: boolean;
  proxyDownloads?: boolean;
  preferredModelId?: string;
}

export interface LocalAiBackendStatus {
  isReady: boolean;
  isLoaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  currentModel: CommunityLitertManifestModel | null;
  backend: Backend | null;
  runtime: 'litert' | 'webllm' | 'none';
  platform: string;
  error: string | null;
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  onProgress?: (chunk: string) => void;
}

class LocalAiBackendService {
  private config: LocalAiBackendConfig;
  private status: LocalAiBackendStatus;
  private currentArtifact: any = null;
  private statusListeners: ((status: LocalAiBackendStatus) => void)[] = [];
  private initialized = false;

  constructor(config: LocalAiBackendConfig = {}) {
    this.config = {
      autoBootstrap: true,
      preferredPowerTier: 'balanced',
      enableWebGpuPatch: true,
      proxyDownloads: true,
      ...config
    };

    this.status = {
      isReady: false,
      isLoaded: false,
      isDownloading: false,
      downloadProgress: 0,
      currentModel: null,
      backend: null,
      runtime: 'none',
      platform: 'web',
      error: null
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[LocalAiBackend] Initializing...');

    try {
      if (this.config.enableWebGpuPatch) {
        installWebGpuAdapterPreferencePatch();
      }

      const capabilities = await getRuntimeCapabilities();
      this.status.platform = capabilities.platform;

      const supported = await isLiteRtSupported();
      if (!supported) {
        const recommendedRuntime = await getRecommendedRuntime();
        this.status.runtime = recommendedRuntime;
        this.status.error = 'LiteRT not supported, falling back to WebLLM or cloud';
        this.notifyStatus();
        return;
      }

      this.status.runtime = 'litert';
      this.status.isReady = true;

      try {
        const deviceInfo = await CommunityLitert.getDeviceInfo();
        console.log('[LocalAiBackend] Device info:', deviceInfo);
      } catch (error) {
        console.warn('[LocalAiBackend] Could not get device info:', error);
      }

      if (this.config.autoBootstrap) {
        await this.autoBootstrap();
      }

      this.initialized = true;
      this.notifyStatus();
    } catch (error: any) {
      console.error('[LocalAiBackend] Initialization failed:', error);
      this.status.error = error.message;
      this.notifyStatus();
      throw error;
    }
  }

  private async autoBootstrap(): Promise<void> {
    try {
      if (this.config.preferredModelId) {
        console.log(`[LocalAiBackend] Loading preferred model: ${this.config.preferredModelId}`);
        await this.loadModel(this.config.preferredModelId);
        return;
      }

      const platform = this.status.platform;
      const powerTier = this.config.preferredPowerTier || 'balanced';

      console.log(`[LocalAiBackend] Auto-bootstrapping with tier: ${powerTier}`);

      const model = await findBestModel(powerTier, platform as any);
      if (!model) {
        console.warn('[LocalAiBackend] No suitable model found for auto-bootstrap');
        return;
      }

      await this.loadModel(model.model_id);
    } catch (error: any) {
      console.error('[LocalAiBackend] Auto-bootstrap failed:', error);
    }
  }

  async loadModel(modelId: string): Promise<void> {
    try {
      console.log(`[LocalAiBackend] Loading model: ${modelId}`);

      this.status.isDownloading = true;
      this.status.downloadProgress = 0;
      this.notifyStatus();

      const models = await getAvailableModels();
      const model = models.find(m => m.model_id === modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      this.status.currentModel = model;

      let socModel: string | null = null;
      try {
        const deviceInfo = await CommunityLitert.getDeviceInfo();
        socModel = deviceInfo.socModel || null;
      } catch (error) {
        // Continue without SoC model
      }

      const artifact = await resolveLiteRtArtifact(model, socModel, this.status.platform as any);
      this.currentArtifact = artifact;

      console.log('[LocalAiBackend] Resolved artifact:', artifact);

      const downloadUrl = buildLiteRtDownloadUrl(artifact);

      if (this.config.proxyDownloads) {
        await this.downloadWithProxy(modelId, downloadUrl);
      } else {
        await this.downloadDirect(modelId, downloadUrl);
      }

      const loadOptions: CommunityLitertLoadModelOptions = {
        modelId,
        modelPath: this.currentArtifact.modelPath || downloadUrl,
        backend: this.config.preferredBackend || artifact.backend,
        contextWindowSize: model.context_window_size
      };

      const loadResult = await CommunityLitert.loadModel(loadOptions);

      if (!loadResult.success) {
        throw new Error(loadResult.error || 'Failed to load model');
      }

      this.status.isLoaded = true;
      this.status.isDownloading = false;
      this.status.downloadProgress = 1;
      this.status.backend = loadResult.backend;
      this.status.error = null;
      this.notifyStatus();

      console.log(`[LocalAiBackend] Model loaded successfully: ${modelId}`);
    } catch (error: any) {
      console.error('[LocalAiBackend] Load model failed:', error);
      this.status.isLoaded = false;
      this.status.isDownloading = false;
      this.status.error = error.message;
      this.notifyStatus();
      throw error;
    }
  }

  private async downloadWithProxy(modelId: string, url: string): Promise<void> {
    console.log('[LocalAiBackend] Downloading with proxy:', url);

    try {
      const downloadResult = await CommunityLitert.downloadModel({
        modelId,
        url
      });

      if (downloadResult.status === 'completed' && downloadResult.modelPath) {
        this.currentArtifact.modelPath = downloadResult.modelPath;
      } else {
        throw new Error(downloadResult.error || 'Download failed');
      }
    } catch (error: any) {
      console.error('[LocalAiBackend] Proxy download failed, trying direct:', error);
      await this.downloadDirect(modelId, url);
    }
  }

  private async downloadDirect(modelId: string, url: string): Promise<void> {
    console.log('[LocalAiBackend] Downloading directly:', url);

    try {
      const downloadResult = await CommunityLitert.downloadModel({
        modelId,
        url
      });

      if (downloadResult.status === 'completed' && downloadResult.modelPath) {
        this.currentArtifact.modelPath = downloadResult.modelPath;
      } else {
        throw new Error(downloadResult.error || 'Download failed');
      }
    } catch (error: any) {
      throw new Error(`Direct download failed: ${error.message}`);
    }
  }

  async generateText(
    messages: Array<{ role: string; content: string }>,
    options: GenerationOptions = {}
  ): Promise<string> {
    if (!this.status.isLoaded) {
      throw new Error('No model loaded. Call loadModel first.');
    }

    try {
      const budget = getContextBudget(this.status.currentModel?.model_id || null);
      const truncatedMessages = truncateMessagesForLocalAi(messages, budget.maxInputChars);

      const completeOptions: CommunityLitertCompleteOptions = {
        messages: truncatedMessages as any,
        maxTokens: options.maxTokens || budget.maxOutputChars / 4,
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.9
      };

      const result = await CommunityLitert.complete(completeOptions);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.text;
    } catch (error: any) {
      console.error('[LocalAiBackend] Generation failed:', error);
      throw error;
    }
  }

  async generateTextStream(
    messages: Array<{ role: string; content: string }>,
    options: GenerationOptions = {}
  ): Promise<string> {
    if (!this.status.isLoaded) {
      throw new Error('No model loaded. Call loadModel first.');
    }

    try {
      const budget = getContextBudget(this.status.currentModel?.model_id || null);
      const truncatedMessages = truncateMessagesForLocalAi(messages, budget.maxInputChars);

      const completeOptions: CommunityLitertCompleteOptions = {
        messages: truncatedMessages as any,
        maxTokens: options.maxTokens || budget.maxOutputChars / 4,
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.9
      };

      let fullText = '';

      await CommunityLitert.completeStream(completeOptions, (chunk) => {
        fullText += chunk;
        if (options.onProgress) {
          options.onProgress(chunk);
        }
      });

      return fullText;
    } catch (error: any) {
      console.error('[LocalAiBackend] Streaming generation failed:', error);
      throw error;
    }
  }

  async unloadModel(): Promise<void> {
    try {
      await CommunityLitert.unloadModel();

      this.status.isLoaded = false;
      this.status.currentModel = null;
      this.status.backend = null;
      this.currentArtifact = null;
      this.notifyStatus();
    } catch (error: any) {
      console.error('[LocalAiBackend] Unload failed:', error);
      throw error;
    }
  }

  getStatus(): LocalAiBackendStatus {
    return { ...this.status };
  }

  onStatusChange(callback: (status: LocalAiBackendStatus) => void): () => void {
    this.statusListeners.push(callback);
    callback(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== callback);
    };
  }

  async getAvailableModels(): Promise<CommunityLitertManifestModel[]> {
    return getAvailableModels();
  }

  async cancel(): Promise<void> {
    try {
      await CommunityLitert.cancel();
      this.status.isDownloading = false;
      this.notifyStatus();
    } catch (error: any) {
      console.error('[LocalAiBackend] Cancel failed:', error);
      throw error;
    }
  }

  private notifyStatus(): void {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => listener(status));
  }
}

let localAiBackendInstance: LocalAiBackendService | null = null;

export function getLocalAiBackend(config?: LocalAiBackendConfig): LocalAiBackendService {
  if (!localAiBackendInstance) {
    localAiBackendInstance = new LocalAiBackendService(config);
  }
  return localAiBackendInstance;
}

export function resetLocalAiBackend(): void {
  if (localAiBackendInstance) {
    localAiBackendInstance = null;
  }
}

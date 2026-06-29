/**
 * Local AI Backend Service for LiteRT-LM
 * Integrates Capacitor plugin, model resolver, and runtime detection
 * Provides a unified interface for local AI inference
 */

import { CookXpertLiteRt, DeviceInfo, LoadModelOptions, CompleteOptions, CompleteResult, ModelStatus, Backend } from '../plugins/cookxpert-litert/src/definitions';
import { findBestModel, resolveLiteRtArtifact, buildLiteRtDownloadUrl, getAvailableModels, CookXpertMlcManifestModel } from './litertModelResolver';
import { getRuntimeCapabilities, isLiteRtSupported, getRecommendedRuntime } from './runtimeDetection';
import { installWebGpuAdapterPreferencePatch } from './webGpuAdapterPatch';
import { fetchMlcUpstream } from './mlcFetchProxy';
import { getContextBudget, truncateMessagesForLocalAi } from './localAiContext';

export interface LocalAiBackendConfig {
  autoBootstrap?: boolean;
  preferredPowerTier?: 'balanced' | 'performance' | 'efficiency';
  preferredBackend?: Backend;
  enableWebGpuPatch?: boolean;
  proxyDownloads?: boolean;
  preferredModelId?: string; // Allow specific model selection
}

export interface LocalAiBackendStatus {
  isReady: boolean;
  isLoaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  currentModel: CookXpertMlcManifestModel | null;
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

  /**
   * Initialize the backend
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[LocalAiBackend] Initializing...');

    try {
      // Install WebGPU adapter patch if enabled
      if (this.config.enableWebGpuPatch) {
        installWebGpuAdapterPreferencePatch();
      }

      // Get runtime capabilities
      const capabilities = await getRuntimeCapabilities();
      this.status.platform = capabilities.platform;

      // Check if LiteRT is supported
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

      // Get device info from Capacitor plugin
      try {
        const deviceInfo = await CookXpertLiteRt.getDeviceInfo();
        console.log('[LocalAiBackend] Device info:', deviceInfo);
      } catch (error) {
        console.warn('[LocalAiBackend] Could not get device info:', error);
      }

      // Auto-bootstrap if enabled
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

  /**
   * Auto-bootstrap the best model
   */
  private async autoBootstrap(): Promise<void> {
    try {
      // If a specific model is preferred, use it
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
      // Don't throw - auto-bootstrap is best-effort
    }
  }

  /**
   * Load a specific model
   */
  async loadModel(modelId: string): Promise<void> {
    try {
      console.log(`[LocalAiBackend] Loading model: ${modelId}`);
      
      this.status.isDownloading = true;
      this.status.downloadProgress = 0;
      this.notifyStatus();

      // Get model info
      const models = await getAvailableModels();
      const model = models.find(m => m.model_id === modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      this.status.currentModel = model;

      // Get device info for SoC model
      let socModel: string | null = null;
      try {
        const deviceInfo = await CookXpertLiteRt.getDeviceInfo();
        socModel = deviceInfo.socModel || null;
      } catch (error) {
        // Continue without SoC model
      }

      // Resolve artifact
      const artifact = await resolveLiteRtArtifact(model, socModel, this.status.platform as any);
      this.currentArtifact = artifact;

      console.log('[LocalAiBackend] Resolved artifact:', artifact);

      // Build download URL
      const downloadUrl = buildLiteRtDownloadUrl(artifact);

      // Download model
      if (this.config.proxyDownloads) {
        // Use proxy for download
        await this.downloadWithProxy(modelId, downloadUrl);
      } else {
        // Direct download
        await this.downloadDirect(modelId, downloadUrl);
      }

      // Load model with Capacitor plugin
      const loadOptions: LoadModelOptions = {
        modelId,
        modelPath: this.currentArtifact.modelPath || downloadUrl,
        backend: this.config.preferredBackend || artifact.backend,
        contextWindowSize: model.context_window_size
      };

      const loadResult = await CookXpertLiteRt.loadModel(loadOptions);
      
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

  /**
   * Download model with proxy
   */
  private async downloadWithProxy(modelId: string, url: string): Promise<void> {
    console.log('[LocalAiBackend] Downloading with proxy:', url);

    // For web implementation, the Capacitor plugin handles download
    // For native, we'd use the plugin's download method
    try {
      const downloadResult = await CookXpertLiteRt.downloadModel({
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
      // Fallback to direct download
      await this.downloadDirect(modelId, url);
    }
  }

  /**
   * Download model directly
   */
  private async downloadDirect(modelId: string, url: string): Promise<void> {
    console.log('[LocalAiBackend] Downloading directly:', url);

    try {
      const downloadResult = await CookXpertLiteRt.downloadModel({
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

  /**
   * Generate text completion
   */
  async generateText(
    messages: Array<{ role: string; content: string }>,
    options: GenerationOptions = {}
  ): Promise<string> {
    if (!this.status.isLoaded) {
      throw new Error('No model loaded. Call loadModel first.');
    }

    try {
      // Get context budget
      const budget = getContextBudget(this.status.currentModel?.model_id || null);
      
      // Truncate messages if needed
      const truncatedMessages = truncateMessagesForLocalAi(messages, budget.maxInputChars);

      // Prepare completion options
      const completeOptions: CompleteOptions = {
        messages: truncatedMessages as any,
        maxTokens: options.maxTokens || budget.maxOutputChars / 4, // Approximate tokens
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.9
      };

      // Generate completion
      const result = await CookXpertLiteRt.complete(completeOptions);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.text;
    } catch (error: any) {
      console.error('[LocalAiBackend] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate streaming text completion
   */
  async generateTextStream(
    messages: Array<{ role: string; content: string }>,
    options: GenerationOptions = {}
  ): Promise<string> {
    if (!this.status.isLoaded) {
      throw new Error('No model loaded. Call loadModel first.');
    }

    try {
      // Get context budget
      const budget = getContextBudget(this.status.currentModel?.model_id || null);
      
      // Truncate messages if needed
      const truncatedMessages = truncateMessagesForLocalAi(messages, budget.maxInputChars);

      // Prepare completion options
      const completeOptions: CompleteOptions = {
        messages: truncatedMessages as any,
        maxTokens: options.maxTokens || budget.maxOutputChars / 4,
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.9
      };

      let fullText = '';

      // Generate streaming completion
      await CookXpertLiteRt.completeStream(completeOptions, (chunk) => {
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

  /**
   * Unload current model
   */
  async unloadModel(): Promise<void> {
    try {
      await CookXpertLiteRt.unloadModel();
      
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

  /**
   * Get current status
   */
  getStatus(): LocalAiBackendStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: LocalAiBackendStatus) => void): () => void {
    this.statusListeners.push(callback);
    callback(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== callback);
    };
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<CookXpertMlcManifestModel[]> {
    return getAvailableModels();
  }

  /**
   * Cancel current operation
   */
  async cancel(): Promise<void> {
    try {
      await CookXpertLiteRt.cancel();
      this.status.isDownloading = false;
      this.notifyStatus();
    } catch (error: any) {
      console.error('[LocalAiBackend] Cancel failed:', error);
      throw error;
    }
  }

  /**
   * Notify status listeners
   */
  private notifyStatus(): void {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => listener(status));
  }
}

// Singleton instance
let localAiBackendInstance: LocalAiBackendService | null = null;

/**
 * Get or create the local AI backend service
 */
export function getLocalAiBackend(config?: LocalAiBackendConfig): LocalAiBackendService {
  if (!localAiBackendInstance) {
    localAiBackendInstance = new LocalAiBackendService(config);
  }
  return localAiBackendInstance;
}

/**
 * Reset the local AI backend service (useful for testing)
 */
export function resetLocalAiBackend(): void {
  if (localAiBackendInstance) {
    localAiBackendInstance = null;
  }
}

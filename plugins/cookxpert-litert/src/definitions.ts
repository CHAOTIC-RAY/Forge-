import { registerPlugin } from '@capacitor/core';

export interface CookXpertLiteRtPlugin {
  /**
   * Get device information including SoC model and supported backends
   */
  getDeviceInfo(): Promise<DeviceInfo>;

  /**
   * Download a LiteRT model from a URL
   */
  downloadModel(options: DownloadModelOptions): Promise<DownloadProgress>;

  /**
   * Load a LiteRT model with specified backend preference
   */
  loadModel(options: LoadModelOptions): Promise<LoadModelResult>;

  /**
   * Generate text completion using the loaded model
   */
  complete(options: CompleteOptions): Promise<CompleteResult>;

  /**
   * Generate streaming text completion
   */
  completeStream(options: CompleteOptions, callback: (chunk: string) => void): Promise<CompleteResult>;

  /**
   * Unload the current model from memory
   */
  unloadModel(): Promise<void>;

  /**
   * Get current model status
   */
  getModelStatus(): Promise<ModelStatus>;

  /**
   * Cancel ongoing model download or generation
   */
  cancel(): Promise<void>;
}

export interface DeviceInfo {
  platform: 'android' | 'ios' | 'web';
  socModel?: string;
  supportedBackends: Backend[];
  recommendedBackend: Backend;
  hasWebGpu: boolean;
  hasWasmJspi: boolean;
  totalMemoryMb: number;
}

export type Backend = 'npu' | 'gpu' | 'cpu' | 'auto';

export interface DownloadModelOptions {
  modelId: string;
  url: string;
  destinationPath?: string;
}

export interface DownloadProgress {
  modelId: string;
  progress: number; // 0-1
  downloadedBytes: number;
  totalBytes: number;
  status: 'downloading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  modelPath?: string;
}

export interface LoadModelOptions {
  modelId: string;
  modelPath: string;
  backend?: Backend;
  contextWindowSize?: number;
}

export interface LoadModelResult {
  modelId: string;
  backend: Backend;
  contextWindowSize: number;
  success: boolean;
  error?: string;
}

export interface CompleteOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompleteResult {
  text: string;
  finishReason: 'stop' | 'length' | 'error';
  tokensGenerated: number;
  error?: string;
}

export interface ModelStatus {
  isLoaded: boolean;
  modelId: string | null;
  backend: Backend | null;
  contextWindowSize: number | null;
  isDownloading: boolean;
  downloadProgress: number;
}

const CookXpertLiteRt = registerPlugin<CookXpertLiteRtPlugin>('CookXpertLiteRt');

export { CookXpertLiteRt };

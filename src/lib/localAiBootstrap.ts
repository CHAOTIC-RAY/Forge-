export type LocalAiBootstrapResult = {
  textReady: boolean;
  visionReady: boolean;
  visionSkipped: boolean;
  litertReady: boolean;
  litertModelId?: string;
  litertError?: string;
};

export type BootstrapStatus = {
  phase: 'idle' | 'checking' | 'downloading' | 'loading' | 'ready' | 'unsupported' | 'error';
  progress?: number;
  message: string;
  modelId?: string;
};

let bootstrapStatus: BootstrapStatus = {
  phase: 'idle',
  message: 'Not started'
};

const statusListeners: ((status: BootstrapStatus) => void)[] = [];

/**
 * Subscribe to bootstrap status updates
 */
export function onBootstrapStatusChange(callback: (status: BootstrapStatus) => void): () => void {
  statusListeners.push(callback);
  callback(bootstrapStatus);
  return () => {
    const index = statusListeners.indexOf(callback);
    if (index > -1) statusListeners.splice(index, 1);
  };
}

/**
 * Update bootstrap status and notify listeners
 */
function updateBootstrapStatus(status: BootstrapStatus): void {
  bootstrapStatus = status;
  statusListeners.forEach(listener => listener(status));
}

/**
 * Check if auto-bootstrap should run
 */
function shouldAutoBootstrapLocalAi(): boolean {
  try {
    const settings = localStorage.getItem('forge_ai_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.autoBootstrapLocalAi !== false;
    }
  } catch (e) {
    // Default to true if settings can't be read
  }
  return true;
}

/**
 * Check WebGPU support for LiteRT
 */
async function checkWebGPUSupport(): Promise<string | null> {
  updateBootstrapStatus({
    phase: 'checking',
    message: 'Checking WebGPU support...'
  });

  try {
    const { probeWebGpuAdapter } = await import('./webGpu');
    const gpuInfo = await probeWebGpuAdapter();
    
    if (!gpuInfo.available) {
      return gpuInfo.reason || 'WebGPU is not available';
    }
    
    return null;
  } catch (error: any) {
    return `WebGPU check failed: ${error.message}`;
  }
}

/**
 * Download progress callback type
 */
type DownloadProgressCallback = (report: { progress: number; text: string }) => void;

/**
 * Warm up local model download
 */
async function warmLocalModelDownload(onProgress: DownloadProgressCallback): Promise<{ success: boolean; modelId: string }> {
  try {
    const { findBestModel, resolveLiteRtArtifact, buildLiteRtDownloadUrl } = await import('./litertModelResolver');
    
    // Find best model for current platform
    onProgress({ progress: 0.1, text: 'Finding best model...' });
    const model = await findBestModel('balanced');
    
    if (!model) {
      throw new Error('No suitable model found');
    }
    
    updateBootstrapStatus({
      phase: 'downloading',
      progress: 0.2,
      message: `Found model: ${model.name}`,
      modelId: model.model_id
    });
    
    // Resolve artifact
    onProgress({ progress: 0.3, text: 'Resolving model variant...' });
    const artifact = await resolveLiteRtArtifact(model);
    
    // Download model (this would use the Capacitor plugin or web implementation)
    onProgress({ progress: 0.5, text: 'Downloading model...' });
    
    // Simulate download progress
    for (let i = 50; i <= 90; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 100));
      onProgress({ progress: i / 100, text: `Downloading model... ${i}%` });
    }
    
    return { success: true, modelId: model.model_id };
  } catch (error: any) {
    console.error('[warmLocalModelDownload] Error:', error);
    throw error;
  }
}

/**
 * Load LiteRT model into memory
 */
async function loadLiteRtModel(modelId: string): Promise<void> {
  updateBootstrapStatus({
    phase: 'loading',
    progress: 0.9,
    message: 'Loading model into memory...',
    modelId
  });

  try {
    // This would use the Capacitor plugin or web implementation
    // For now, simulate loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    updateBootstrapStatus({
      phase: 'ready',
      progress: 1.0,
      message: 'LiteRT model ready',
      modelId
    });
  } catch (error: any) {
    throw new Error(`Failed to load model: ${error.message}`);
  }
}

/**
 * Bootstrap LiteRT on app launch
 */
export async function bootstrapLocalAiOnLaunch(): Promise<void> {
  if (!shouldAutoBootstrapLocalAi()) {
    console.log('[bootstrapLocalAiOnLaunch] Auto-bootstrap disabled');
    return;
  }

  try {
    // Check WebGPU support
    const warning = await checkWebGPUSupport();
    if (warning) {
      updateBootstrapStatus({
        phase: 'unsupported',
        message: warning
      });
      return;
    }

    // Download and warm model
    const result = await warmLocalModelDownload((report) => {
      updateBootstrapStatus({
        phase: 'downloading',
        progress: report.progress,
        message: report.text
      });
    });

    if (result.success) {
      await loadLiteRtModel(result.modelId);
    }
  } catch (error: any) {
    console.error('[bootstrapLocalAiOnLaunch] Error:', error);
    updateBootstrapStatus({
      phase: 'error',
      message: `Bootstrap failed: ${error.message}`
    });
  }
}

/**
 * Get current bootstrap status
 */
export function getBootstrapStatus(): BootstrapStatus {
  return bootstrapStatus;
}

/** Download and warm the local text WebLLM engine when WebGPU is available. Vision loads on demand. */
export async function ensureLocalAiEnginesReady(): Promise<LocalAiBootstrapResult> {
  const { ensureLocalTextEngineReady } = await import('./gemini');

  try {
    await ensureLocalTextEngineReady();
    
    // Also try to bootstrap LiteRT
    try {
      await bootstrapLocalAiOnLaunch();
      const status = getBootstrapStatus();
      return { 
        textReady: true, 
        visionReady: false, 
        visionSkipped: true,
        litertReady: status.phase === 'ready',
        litertModelId: status.modelId,
        litertError: status.phase === 'error' ? status.message : undefined
      };
    } catch (litertError) {
      console.warn('[ensureLocalAiEnginesReady] LiteRT bootstrap failed:', litertError);
      return { 
        textReady: true, 
        visionReady: false, 
        visionSkipped: true,
        litertReady: false,
        litertError: litertError instanceof Error ? litertError.message : 'Unknown error'
      };
    }
  } catch (err) {
    console.warn('[ensureLocalAiEnginesReady] Text preload failed:', err);
    return { textReady: false, visionReady: false, visionSkipped: true, litertReady: false };
  }
}

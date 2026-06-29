/**
 * WebGPU Adapter Compatibility Layer
 * Provides device-specific profile support for LiteRT-LM WebGPU execution
 * Handles adapter selection, feature level preferences, and device limit wrapping
 */

export type WebGpuAdapterProfile = 'compatibility' | 'low-power' | 'high-performance' | 'auto';

export interface WebGpuAdapterPatchOpts {
  /**
   * Force a specific adapter profile instead of auto-detection
   */
  forceProfile?: WebGpuAdapterProfile;
  
  /**
   * Enable compatibility mode for problematic drivers
   */
  enableCompatibilityMode?: boolean;
  
  /**
   * Prefer mobile-specific optimizations
   */
  preferMobile?: boolean;
  
  /**
   * Platform detection override for testing
   */
  platformOverride?: 'ios' | 'android' | 'desktop';
}

interface AdapterRequestOptions {
  featureLevel?: 'compatibility' | 'normal';
  powerPreference?: 'low-power' | 'high-performance';
  forceFallbackAdapter?: boolean;
}

/**
 * Install WebGPU adapter preference patch
 * This intercepts navigator.gpu.requestAdapter calls to apply device-specific profiles
 */
export function installWebGpuAdapterPreferencePatch(opts: WebGpuAdapterPatchOpts = {}): void {
  const gpu = navigator?.gpu;
  if (!gpu?.requestAdapter) {
    console.warn('[WebGPUAdapterPatch] navigator.gpu.requestAdapter not available');
    return;
  }

  const patchMode = opts.forceProfile || detectOptimalProfile(opts);
  console.log(`[WebGPUAdapterPatch] Installing patch with profile: ${patchMode}`);

  const origRequestAdapter = gpu.requestAdapter.bind(gpu);
  
  gpu.requestAdapter = async (options?: AdapterRequestOptions) => {
    const profileOpts = buildAdapterRequestOptions(patchMode, opts);
    console.log('[WebGPUAdapterPatch] Requesting adapter with options:', profileOpts);
    
    try {
      const adapter = await origRequestAdapter(profileOpts);
      
      if (!adapter) {
        console.warn('[WebGPUAdapterPatch] No adapter found, trying fallback...');
        // Try with fallback adapter if initial request fails
        return await origRequestAdapter({ 
          ...profileOpts, 
          forceFallbackAdapter: true 
        });
      }
      
      return wrapAdapterWithMlcDeviceLimits(adapter);
    } catch (error) {
      console.error('[WebGPUAdapterPatch] Adapter request failed:', error);
      // On error, try a more conservative configuration
      if (patchMode !== 'compatibility') {
        console.log('[WebGPUAdapterPatch] Retrying with compatibility mode');
        const compatOpts = buildAdapterRequestOptions('compatibility', opts);
        return await origRequestAdapter(compatOpts);
      }
      throw error;
    }
  };
}

/**
 * Build adapter request options based on profile
 */
export function buildAdapterRequestOptions(
  profile: WebGpuAdapterProfile,
  userOptions?: AdapterRequestOptions
): AdapterRequestOptions {
  const baseOptions: AdapterRequestOptions = {};
  
  switch (profile) {
    case 'compatibility':
      return {
        ...baseOptions,
        ...userOptions,
        featureLevel: 'compatibility',
        powerPreference: 'low-power',
      };
      
    case 'low-power':
      return {
        ...baseOptions,
        ...userOptions,
        powerPreference: 'low-power',
      };
      
    case 'high-performance':
      return {
        ...baseOptions,
        ...userOptions,
        powerPreference: 'high-performance',
      };
      
    case 'auto':
      return detectAutoOptions(userOptions);
      
    default:
      return userOptions || baseOptions;
  }
}

/**
 * Auto-detect optimal profile based on device characteristics
 */
function detectOptimalProfile(opts: WebGpuAdapterPatchOpts): WebGpuAdapterProfile {
  if (opts.enableCompatibilityMode) {
    return 'compatibility';
  }
  
  if (opts.preferMobile) {
    return 'low-power';
  }
  
  const platform = opts.platformOverride || detectPlatform();
  
  // iOS devices need compatibility mode
  if (platform === 'ios') {
    return 'compatibility';
  }
  
  // Android devices prefer low-power
  if (platform === 'android') {
    return 'low-power';
  }
  
  // Desktop can use high-performance by default
  return 'high-performance';
}

/**
 * Auto-detect adapter options based on platform and device characteristics
 */
function detectAutoOptions(userOptions?: AdapterRequestOptions): AdapterRequestOptions {
  const platform = detectPlatform();
  
  // Check if we should prefer compatibility feature level
  if (shouldPreferCompatibilityFeatureLevel()) {
    return {
      ...userOptions,
      featureLevel: 'compatibility',
      powerPreference: 'low-power',
    };
  }
  
  // iOS clients need special handling
  if (platform === 'ios') {
    return {
      ...userOptions,
      featureLevel: 'compatibility',
      powerPreference: 'low-power',
    };
  }
  
  // Mobile clients prefer low-power
  if (shouldPreferMobileLowPowerFirst()) {
    return {
      ...userOptions,
      powerPreference: 'low-power',
    };
  }
  
  // Desktop clients can use high-performance
  return {
    ...userOptions,
    powerPreference: 'high-performance',
  };
}

/**
 * Detect current platform
 */
function detectPlatform(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent;
  
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'ios';
  }
  
  if (/Android/.test(userAgent)) {
    return 'android';
  }
  
  return 'desktop';
}

/**
 * Check if compatibility feature level should be preferred
 */
function shouldPreferCompatibilityFeatureLevel(): boolean {
  // Check for known problematic browsers/driver combinations
  const userAgent = navigator.userAgent;
  
  // Older Chrome versions may need compatibility mode
  const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
  if (chromeMatch) {
    const version = parseInt(chromeMatch[1], 10);
    if (version < 113) return true;
  }
  
  // Safari on iOS may need compatibility mode
  if (/Safari/.test(userAgent) && /iPhone|iPad/.test(userAgent)) {
    return true;
  }
  
  return false;
}

/**
 * Check if mobile low-power preference should be used
 */
function shouldPreferMobileLowPowerFirst(): boolean {
  const platform = detectPlatform();
  return platform === 'android' || platform === 'ios';
}

/**
 * Check if this is an iOS client
 */
export function isIosClient(): boolean {
  return detectPlatform() === 'ios';
}

/**
 * Wrap adapter with MLC-specific device limits
 * This ensures the adapter reports limits compatible with MLC WebLLM/LiteRT requirements
 */
function wrapAdapterWithMlcDeviceLimits(adapter: GPUAdapter): GPUAdapter {
  const originalRequestDevice = adapter.requestDevice.bind(adapter);
  
  adapter.requestDevice = async (descriptor?: GPUDeviceDescriptor) => {
    const enhancedDescriptor: GPUDeviceDescriptor = {
      ...descriptor,
      requiredLimits: {
        ...descriptor?.requiredLimits,
        // Ensure minimum limits for LiteRT-LM
        maxBufferSize: descriptor?.requiredLimits?.maxBufferSize || 256 * 1024 * 1024, // 256MB
        maxStorageBufferBindingSize: descriptor?.requiredLimits?.maxStorageBufferBindingSize || 128 * 1024 * 1024, // 128MB
        maxTextureDimension2D: descriptor?.requiredLimits?.maxTextureDimension2D || 8192,
      },
    };
    
    const device = await originalRequestDevice(enhancedDescriptor);
    
    // Wrap device to handle lost context
    wrapDeviceForLostContext(device);
    
    return device;
  };
  
  return adapter;
}

/**
 * Wrap device to handle lost GPU context
 */
function wrapDeviceForLostContext(device: GPUDevice): GPUDevice {
  device.lost.then((info) => {
    console.error('[WebGPUAdapterPatch] GPU device lost:', info);
    // Trigger reload or recovery logic
    window.dispatchEvent(new CustomEvent('webgpu-device-lost', { detail: info }));
  });
  
  return device;
}

/**
 * Remove the WebGPU adapter patch (useful for testing)
 */
export function removeWebGpuAdapterPreferencePatch(): void {
  const gpu = navigator?.gpu;
  if (!gpu) return;
  
  // Reset to original (requires storing original reference)
  // For now, this is a placeholder - would need to store original reference
  console.log('[WebGPUAdapterPatch] Patch removal not fully implemented');
}

/**
 * Check if the patch is currently installed
 */
export function isWebGpuAdapterPatchInstalled(): boolean {
  const gpu = navigator?.gpu;
  if (!gpu?.requestAdapter) return false;
  
  // Check if the function has been modified (basic check)
  const funcString = gpu.requestAdapter.toString();
  return funcString.includes('WebGPUAdapterPatch');
}

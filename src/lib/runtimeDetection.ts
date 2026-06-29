/**
 * Runtime Detection Utilities
 * Comprehensive detection of WebGPU, WebAssembly JSPI, and platform capabilities
 * for LiteRT-LM and WebLLM
 */

export type Platform = 'android' | 'ios' | 'web' | 'desktop';
export type Architecture = 'x64' | 'arm64' | 'x86' | 'unknown';

export interface RuntimeCapabilities {
  platform: Platform;
  architecture: Architecture;
  hasWebGpu: boolean;
  hasWasmJspi: boolean;
  hasSharedArrayBuffer: boolean;
  hasOffscreenCanvas: boolean;
  webGpuAdapterName?: string;
  webGpuVendor?: string;
  totalMemoryMb: number;
  deviceMemoryGb?: number;
  hardwareConcurrency: number;
  userAgent: string;
  isMobile: boolean;
  isTouchDevice: boolean;
}

let cachedCapabilities: RuntimeCapabilities | null = null;
let capabilitiesPromise: Promise<RuntimeCapabilities> | null = null;

/**
 * Detect current platform
 */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'web';
  
  const userAgent = navigator.userAgent;
  
  if (/Android/i.test(userAgent)) {
    return 'android';
  }
  
  if (/iPad|iPhone|iPod/i.test(userAgent)) {
    return 'ios';
  }
  
  if (/Win|Mac|Linux/i.test(userAgent) && !/Mobile/i.test(userAgent)) {
    return 'desktop';
  }
  
  return 'web';
}

/**
 * Detect CPU architecture
 */
export function detectArchitecture(): Architecture {
  if (typeof navigator === 'undefined') return 'unknown';
  
  const userAgent = navigator.userAgent;
  
  if (/arm64|aarch64/i.test(userAgent)) {
    return 'arm64';
  }
  
  if (/x86_64|x64|amd64/i.test(userAgent)) {
    return 'x64';
  }
  
  if (/x86|i386|i686/i.test(userAgent)) {
    return 'x86';
  }
  
  return 'unknown';
}

/**
 * Check if WebGPU is available
 */
export function hasWebGpu(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Check if WebAssembly JSPI is available
 */
export function hasWasmJspi(): boolean {
  return typeof WebAssembly !== 'undefined' &&
         typeof (WebAssembly as { Suspending?: unknown }).Suspending === 'function';
}

/**
 * Check if SharedArrayBuffer is available
 */
export function hasSharedArrayBuffer(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * Check if OffscreenCanvas is available
 */
export function hasOffscreenCanvas(): boolean {
  return typeof OffscreenCanvas !== 'undefined';
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /Android|iPhone|iPad|iPod|webOS/i.test(userAgent) || window.innerWidth < 768;
}

/**
 * Check if device has touch support
 */
export function isTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get total memory in MB
 */
export function getTotalMemoryMb(): number {
  if (typeof navigator === 'undefined') return 4096; // Default 4GB
  
  // Try deviceMemory API (Chrome)
  const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;
  if (deviceMemory) {
    return deviceMemory * 1024; // Convert GB to MB
  }
  
  // Fallback to default
  return 4096;
}

/**
 * Get hardware concurrency (CPU cores)
 */
export function getHardwareConcurrency(): number {
  if (typeof navigator === 'undefined') return 4;
  return navigator.hardwareConcurrency || 4;
}

/**
 * Get WebGPU adapter information
 */
async function getWebGpuAdapterInfo(): Promise<{ adapterName?: string; vendor?: string } | null> {
  if (!hasWebGpu()) return null;
  
  try {
    const gpu = (navigator as any).gpu;
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' }) ||
                    await gpu.requestAdapter({ powerPreference: 'low-power' });
    
    if (!adapter) return null;
    
    const info = adapter.info || (typeof adapter.requestAdapterInfo === 'function' ? await adapter.requestAdapterInfo() : undefined);
    
    return {
      adapterName: info?.description || info?.device || 'Unknown GPU',
      vendor: info?.vendor
    };
  } catch (error) {
    console.error('[RuntimeDetection] WebGPU adapter detection failed:', error);
    return null;
  }
}

/**
 * Get comprehensive runtime capabilities
 */
export async function getRuntimeCapabilities(): Promise<RuntimeCapabilities> {
  if (cachedCapabilities) return cachedCapabilities;
  if (capabilitiesPromise) return capabilitiesPromise;
  
  capabilitiesPromise = (async () => {
    const platform = detectPlatform();
    const architecture = detectArchitecture();
    const webGpuInfo = await getWebGpuAdapterInfo();
    
    const capabilities: RuntimeCapabilities = {
      platform,
      architecture,
      hasWebGpu: hasWebGpu(),
      hasWasmJspi: hasWasmJspi(),
      hasSharedArrayBuffer: hasSharedArrayBuffer(),
      hasOffscreenCanvas: hasOffscreenCanvas(),
      webGpuAdapterName: webGpuInfo?.adapterName,
      webGpuVendor: webGpuInfo?.vendor,
      totalMemoryMb: getTotalMemoryMb(),
      deviceMemoryGb: (navigator as { deviceMemory?: number }).deviceMemory,
      hardwareConcurrency: getHardwareConcurrency(),
      userAgent: navigator.userAgent,
      isMobile: isMobile(),
      isTouchDevice: isTouchDevice()
    };
    
    cachedCapabilities = capabilities;
    capabilitiesPromise = null;
    
    console.log('[RuntimeDetection] Capabilities:', capabilities);
    return capabilities;
  })();
  
  return capabilitiesPromise;
}

/**
 * Check if LiteRT-LM is supported on current platform
 */
export async function isLiteRtSupported(): Promise<boolean> {
  const capabilities = await getRuntimeCapabilities();
  
  // WebGPU is required for LiteRT-LM on web
  if (!capabilities.hasWebGpu) {
    return false;
  }
  
  // JSPI is required for WebAssembly suspending
  if (!capabilities.hasWasmJspi) {
    return false;
  }
  
  return true;
}

/**
 * Check if WebLLM is supported on current platform
 */
export async function isWebLlmSupported(): Promise<boolean> {
  const capabilities = await getRuntimeCapabilities();
  
  // WebGPU is required for WebLLM
  if (!capabilities.hasWebGpu) {
    return false;
  }
  
  // SharedArrayBuffer is required for worker threading
  if (!capabilities.hasSharedArrayBuffer) {
    return false;
  }
  
  return true;
}

/**
 * Get recommended runtime for current platform
 */
export async function getRecommendedRuntime(): Promise<'litert' | 'webllm' | 'none'> {
  const capabilities = await getRuntimeCapabilities();
  
  // Prefer LiteRT if available
  if (capabilities.hasWebGpu && capabilities.hasWasmJspi) {
    return 'litert';
  }
  
  // Fall back to WebLLM
  if (capabilities.hasWebGpu && capabilities.hasSharedArrayBuffer) {
    return 'webllm';
  }
  
  return 'none';
}

/**
 * Clear cached capabilities (useful for testing or device changes)
 */
export function clearRuntimeCapabilitiesCache(): void {
  cachedCapabilities = null;
  capabilitiesPromise = null;
}

/**
 * Get user-friendly support message
 */
export async function getSupportMessage(): Promise<string> {
  const capabilities = await getRuntimeCapabilities();
  
  if (!capabilities.hasWebGpu) {
    return 'WebGPU is not available. Please use Chrome/Edge 113+ with hardware acceleration enabled.';
  }
  
  if (!capabilities.hasWasmJspi) {
    return 'WebAssembly JSPI is not available. Please enable experimental WebAssembly features in your browser.';
  }
  
  if (!capabilities.hasSharedArrayBuffer) {
    return 'SharedArrayBuffer is not available. Please ensure your browser supports COOP/COEP headers.';
  }
  
  return 'Your browser supports local AI inference.';
}

/**
 * Check if browser supports required headers for SharedArrayBuffer
 */
export function hasCoopCoepSupport(): boolean {
  if (typeof window === 'undefined') return false;
  
  const coopHeader = document.querySelector('meta[http-equiv="Cross-Origin-Opener-Policy"]');
  const coepHeader = document.querySelector('meta[http-equiv="Cross-Origin-Embedder-Policy"]');
  
  return coopHeader !== null && coepHeader !== null;
}

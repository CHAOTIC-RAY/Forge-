/**
 * Runtime detection utilities for LiteRT LM
 * Detects WebGPU, WebAssembly JSPI, and platform capabilities
 */

const hasWebGpu = (): boolean =>
  typeof navigator !== 'undefined' && 'gpu' in navigator;

export const hasWasmJspi = (): boolean =>
  typeof WebAssembly !== 'undefined' &&
  typeof (WebAssembly as { Suspending?: unknown }).Suspending === 'function';

export const isMobile = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /Android|iPhone|iPad|iPod|webOS/i.test(userAgent) || window.innerWidth < 768;
};

export const isAndroid = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};

export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const isWebLiteRtSupported = (): boolean =>
  hasWebGpu() && hasWasmJspi();

export const getPlatform = (): 'android' | 'ios' | 'web' => {
  if (isAndroid()) return 'android';
  if (isIOS()) return 'ios';
  return 'web';
};

export const getDeviceMemory = (): number => {
  if (typeof navigator === 'undefined') return 4096; // Default 4GB
  return (navigator as { deviceMemory?: number }).deviceMemory || 4096;
};

export const getWebGpuAdapterInfo = async (): Promise<{ available: boolean; adapterName?: string; vendor?: string }> => {
  if (!hasWebGpu()) {
    return { available: false };
  }

  try {
    const gpu = (navigator as any).gpu;
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' }) ||
                    await gpu.requestAdapter({ powerPreference: 'low-power' });
    
    if (!adapter) {
      return { available: false };
    }

    const info = adapter.info || (typeof adapter.requestAdapterInfo === 'function' ? await adapter.requestAdapterInfo() : undefined);
    
    return {
      available: true,
      adapterName: info?.description || info?.device || 'Unknown GPU',
      vendor: info?.vendor
    };
  } catch (error) {
    console.error('[Runtime] WebGPU adapter detection failed:', error);
    return { available: false };
  }
};

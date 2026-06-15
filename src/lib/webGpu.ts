export type WebGpuAdapterInfo = {
  available: boolean;
  adapterName?: string;
  vendor?: string;
  reason?: string;
};

type NavigatorGpu = {
  requestAdapter: (options?: { powerPreference?: 'low-power' | 'high-performance' }) => Promise<{
    info?: { description?: string; device?: string; vendor?: string };
    requestAdapterInfo?: () => Promise<{ description?: string; device?: string; vendor?: string }>;
  } | null>;
};

let cachedAdapterInfo: WebGpuAdapterInfo | null = null;
let probePromise: Promise<WebGpuAdapterInfo> | null = null;

/** Probe for a hardware WebGPU adapter (discrete GPU preferred). */
export async function probeWebGpuAdapter(): Promise<WebGpuAdapterInfo> {
  if (cachedAdapterInfo) return cachedAdapterInfo;
  if (probePromise) return probePromise;

  probePromise = (async () => {
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
      cachedAdapterInfo = {
        available: false,
        reason: 'WebGPU is not available in this browser.',
      };
      return cachedAdapterInfo;
    }

    const gpu = (navigator as Navigator & { gpu: NavigatorGpu }).gpu;

    try {
      const adapter =
        (await gpu.requestAdapter({ powerPreference: 'high-performance' })) ??
        (await gpu.requestAdapter({ powerPreference: 'low-power' }));

      if (!adapter) {
        cachedAdapterInfo = {
          available: false,
          reason:
            'No WebGPU adapter found. Enable hardware acceleration in your browser settings (Chrome/Edge).',
        };
        return cachedAdapterInfo;
      }

      const info =
        adapter.info ??
        (typeof adapter.requestAdapterInfo === 'function'
          ? await adapter.requestAdapterInfo()
          : undefined);

      cachedAdapterInfo = {
        available: true,
        adapterName: info?.description || info?.device || 'GPU',
        vendor: info?.vendor,
      };
      return cachedAdapterInfo;
    } catch (err) {
      cachedAdapterInfo = {
        available: false,
        reason: err instanceof Error ? err.message : 'WebGPU adapter probe failed.',
      };
      return cachedAdapterInfo;
    } finally {
      probePromise = null;
    }
  })();

  return probePromise;
}

export function hasWebGpuApi(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export async function ensureWebGpuAdapter(): Promise<WebGpuAdapterInfo> {
  const info = await probeWebGpuAdapter();
  if (!info.available) {
    throw new Error(
      info.reason ||
        'WebGPU is not available. Use Chrome or Edge with hardware acceleration enabled for local AI.'
    );
  }
  return info;
}

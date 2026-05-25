import { BUILTIN_MODEL_IDS, BUILTIN_VISION_MODEL_IDS } from './builtinModels';

const ALLOWED_REPO_PREFIX = 'mlc-ai/';

/** Rewrite Hugging Face model URLs to same-origin proxy (fixes CORS on deployed Forge). */
export function rewriteHuggingFaceModelUrl(modelUrl: string, origin: string): string {
  if (!modelUrl || !origin) return modelUrl;
  try {
    const parsed = new URL(modelUrl, origin);
    if (parsed.hostname !== 'huggingface.co' && !parsed.pathname.includes('/api/hf-proxy/')) {
      return modelUrl;
    }
    if (parsed.pathname.startsWith('/api/hf-proxy/')) {
      return parsed.href;
    }
    const repoPath = parsed.pathname.replace(/^\//, '');
    if (!repoPath.startsWith(ALLOWED_REPO_PREFIX)) {
      console.warn('[WebLLM] Skipping proxy for non-mlc-ai repo:', repoPath);
      return modelUrl;
    }
    const base = origin.replace(/\/+$/, '');
    return `${base}/api/hf-proxy/${repoPath}${parsed.search}`;
  } catch {
    return modelUrl;
  }
}

function cloneModelRecord(record: { model: string; model_lib: string; model_id: string }, origin: string) {
  return {
    ...record,
    model: rewriteHuggingFaceModelUrl(record.model, origin),
    model_lib: record.model_lib,
  };
}

/**
 * AppConfig for WebLLM with HF weights fetched via /api/hf-proxy (Workers + Express).
 * WASM libs still load from GitHub raw (CORS-friendly).
 */
export async function buildProxiedWebLlmAppConfig(origin?: string) {
  const { prebuiltAppConfig } = await import('@mlc-ai/web-llm');
  const baseOrigin =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const model_list = prebuiltAppConfig.model_list
    .filter((r) => BUILTIN_MODEL_IDS.has(r.model_id) || BUILTIN_VISION_MODEL_IDS.has(r.model_id))
    .map((r) => cloneModelRecord(r, baseOrigin));

  return {
    ...prebuiltAppConfig,
    useIndexedDBCache: prebuiltAppConfig.useIndexedDBCache ?? true,
    model_list,
  };
}

export function shouldUseHfProxy(hostname?: string): boolean {
  if (!hostname) {
    return typeof window !== 'undefined' && shouldUseHfProxy(window.location.hostname);
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }
  return true;
}

export function normalizeBuiltinModelId(modelId: string): string {
  return modelId.replace(/\s+/g, '').trim();
}

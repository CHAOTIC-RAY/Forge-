/**
 * LiteRT Model Resolver
 * Handles model variant selection based on device capabilities, SoC model, and runtime type
 */

export interface CookXpertMlcManifestModel {
  model_id: string;
  name: string;
  runtime: string;
  litert_web?: boolean;
  litert_native?: boolean;
  litert_community_repo?: string;
  litert_hf_repo?: string;
  litert_file?: string;
  litert_variants?: Record<string, LiteRtVariant>;
  power_tier: 'balanced' | 'performance' | 'efficiency';
  context_window_size: number;
  size_mb?: number;
  published: boolean;
}

export interface LiteRtVariant {
  file: string;
  backend: 'npu' | 'gpu' | 'cpu';
  aot_backend?: string;
  aot_soc_model?: string;
}

export interface ResolvedLiteRtArtifact {
  hfRepo: string;
  fileName: string;
  backend: 'npu' | 'gpu' | 'cpu';
  source: 'chef' | 'community';
  variantKey?: string;
  modelId: string;
  contextWindowSize: number;
}

const DEFAULT_HF_REPO = 'litert-community';

/**
 * Normalize SoC model string for variant matching
 */
export function normalizeLiteRtSocModel(socModel?: string | null): string | null {
  if (!socModel) return null;
  
  // Normalize common SoC model patterns
  const normalized = socModel
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
  
  // Map common Qualcomm Snapdragon model numbers
  const socMappings: Record<string, string> = {
    'SM8750': 'sm8750', // Snapdragon 8 Gen 3
    'SM8550': 'sm8550', // Snapdragon 8 Gen 2
    'SM8450': 'sm8450', // Snapdragon 8 Gen 1
    'SM8350': 'sm8350', // Snapdragon 888
    'SM8250': 'sm8250', // Snapdragon 865
  };
  
  return socMappings[normalized] || normalized;
}

/**
 * Pick the best variant key for a given SoC model
 */
function pickVariantKey(entry: CookXpertMlcManifestModel, socModel: string | null): string | null {
  if (!entry.litert_variants || !socModel) return null;
  
  const normalizedSoc = normalizeLiteRtSocModel(socModel);
  if (!normalizedSoc) return null;
  
  // Try exact match first
  if (entry.litert_variants[normalizedSoc]) {
    return normalizedSoc;
  }
  
  // Try partial match for Qualcomm Snapdragon
  const socPrefix = normalizedSoc.substring(0, 5); // e.g., 'SM875'
  const matchingKeys = Object.keys(entry.litert_variants).filter(key => 
    key.startsWith(socPrefix)
  );
  
  if (matchingKeys.length > 0) {
    return matchingKeys[0];
  }
  
  return null;
}

/**
 * Check if a file exists on Hugging Face
 */
async function probeHfFile(repo: string, file: string): Promise<boolean> {
  try {
    const url = `https://huggingface.co/${repo}/resolve/main/${file}`;
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn(`[LiteRtModelResolver] Failed to probe HF file ${repo}/${file}:`, error);
    return false;
  }
}

/**
 * Resolve LiteRT artifact for a given model entry
 */
export async function resolveLiteRtArtifact(
  entry: CookXpertMlcManifestModel,
  socModelRaw?: string | null,
  platform?: 'android' | 'ios' | 'web'
): Promise<ResolvedLiteRtArtifact> {
  const socModel = normalizeLiteRtSocModel(socModelRaw);
  const currentPlatform = platform || detectPlatform();
  
  console.log(`[LiteRtModelResolver] Resolving artifact for ${entry.model_id} on ${currentPlatform} with SoC: ${socModel}`);
  
  // For all platforms, prioritize community Web variants (they work on all platforms)
  if (entry.litert_web && entry.litert_community_repo && entry.litert_file) {
    console.log(`[LiteRtModelResolver] Using community Web variant from ${entry.litert_community_repo}`);
    
    // Probe to ensure file exists
    if (await probeHfFile(entry.litert_community_repo, entry.litert_file)) {
      return {
        hfRepo: entry.litert_community_repo,
        fileName: entry.litert_file,
        backend: 'gpu',
        source: 'community',
        modelId: entry.model_id,
        contextWindowSize: entry.context_window_size
      };
    }
  }
  
  // For Android/iOS with native support, try SoC-specific NPU variants if available
  if (entry.litert_native && entry.litert_variants) {
    const variantKey = pickVariantKey(entry, socModel);
    const variant = variantKey ? entry.litert_variants[variantKey] : undefined;
    
    if (variant && entry.litert_hf_repo && await probeHfFile(entry.litert_hf_repo, variant.file)) {
      console.log(`[LiteRtModelResolver] Using SoC-specific variant: ${variantKey}`);
      return {
        hfRepo: entry.litert_hf_repo,
        fileName: variant.file,
        backend: variant.backend,
        source: 'native',
        variantKey,
        modelId: entry.model_id,
        contextWindowSize: entry.context_window_size
      };
    }
    
    // Fallback to GPU variant
    const gpuVariant = entry.litert_variants['generic_gpu'];
    if (gpuVariant && entry.litert_hf_repo && await probeHfFile(entry.litert_hf_repo, gpuVariant.file)) {
      console.log(`[LiteRtModelResolver] Using generic GPU variant`);
      return {
        hfRepo: entry.litert_hf_repo,
        fileName: gpuVariant.file,
        backend: gpuVariant.backend,
        source: 'native',
        variantKey: 'generic_gpu',
        modelId: entry.model_id,
        contextWindowSize: entry.context_window_size
      };
    }
    
    // Fallback to CPU variant
    const cpuVariant = entry.litert_variants['generic_cpu'];
    if (cpuVariant && entry.litert_hf_repo && await probeHfFile(entry.litert_hf_repo, cpuVariant.file)) {
      console.log(`[LiteRtModelResolver] Using generic CPU variant`);
      return {
        hfRepo: entry.litert_hf_repo,
        fileName: cpuVariant.file,
        backend: cpuVariant.backend,
        source: 'native',
        variantKey: 'generic_cpu',
        modelId: entry.model_id,
        contextWindowSize: entry.context_window_size
      };
    }
  }
  
  // Final fallback to default community model
  console.warn(`[LiteRtModelResolver] No specific variant found, using default community model`);
  return {
    hfRepo: entry.litert_community_repo || entry.litert_hf_repo || DEFAULT_HF_REPO,
    fileName: entry.litert_file || 'model.litertlm',
    backend: 'gpu',
    source: 'community',
    modelId: entry.model_id,
    contextWindowSize: entry.context_window_size
  };
}

/**
 * Detect current platform
 */
function detectPlatform(): 'android' | 'ios' | 'web' {
  if (typeof navigator === 'undefined') return 'web';
  
  const userAgent = navigator.userAgent;
  
  if (/Android/i.test(userAgent)) {
    return 'android';
  }
  
  if (/iPad|iPhone|iPod/i.test(userAgent)) {
    return 'ios';
  }
  
  return 'web';
}

/**
 * Load and parse the model manifest
 */
export async function loadModelManifest(): Promise<CookXpertMlcManifestModel[]> {
  try {
    const response = await fetch('/litert-models.manifest.json');
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.status}`);
    }
    
    const manifest = await response.json();
    return manifest.models || [];
  } catch (error) {
    console.error('[LiteRtModelResolver] Failed to load model manifest:', error);
    return [];
  }
}

/**
 * Find the best model for a given power tier and platform
 */
export async function findBestModel(
  powerTier: 'balanced' | 'performance' | 'efficiency' = 'balanced',
  platform?: 'android' | 'ios' | 'web',
  socModel?: string | null
): Promise<CookXpertMlcManifestModel | null> {
  const models = await loadModelManifest();
  const currentPlatform = platform || detectPlatform();
  
  // Filter by platform compatibility - all Web models work on all platforms
  const compatibleModels = models.filter(model => {
    if (currentPlatform === 'web') {
      return model.litert_web;
    }
    // For Android/iOS, prefer native but fall back to web
    return model.litert_native || model.litert_web;
  });
  
  // Filter by power tier
  const tierModels = compatibleModels.filter(model => model.power_tier === powerTier);
  
  // If no exact match, use any compatible model
  const candidates = tierModels.length > 0 ? tierModels : compatibleModels;
  
  if (candidates.length === 0) {
    return null;
  }
  
  // Sort by size (prefer smaller models for mobile, larger for desktop)
  if (currentPlatform === 'web' && !isMobile()) {
    // Desktop: prefer larger context windows
    candidates.sort((a, b) => b.context_window_size - a.context_window_size);
  } else {
    // Mobile: prefer smaller models
    candidates.sort((a, b) => (a.size_mb || 0) - (b.size_mb || 0));
  }
  
  return candidates[0];
}

/**
 * Check if current platform is mobile
 */
function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent;
  return /Android|iPhone|iPad|iPod|webOS/i.test(userAgent) || window.innerWidth < 768;
}

/**
 * Build download URL for a resolved artifact
 */
export function buildLiteRtDownloadUrl(artifact: ResolvedLiteRtArtifact): string {
  return `https://huggingface.co/${artifact.hfRepo}/resolve/main/${artifact.fileName}`;
}

/**
 * Get all available models from manifest
 */
export async function getAvailableModels(): Promise<CookXpertMlcManifestModel[]> {
  const models = await loadModelManifest();
  return models.filter(model => model.published);
}

export interface AiSettings {
  preferredProvider: string;
  imageProvider: string;
  geminiModel: string;
  groqModel: string;
  groqVisionModel: string;
  pollinationModel: string;
  pollinationApiKey: string;
  puterTextModel: string;
  puterImageModel: string;
  builtinModelId: string;
  builtinVisionModelId: string;
  customModelUrl: string;
  customModelConfig: Record<string, unknown> | null;
  allowedAutoProviders: string[];
  targetUrl: string;
  geminiApiKey: string;
  groqApiKey: string;
  firecrawlApiKey: string;
  scrapegraphApiKey: string;
  systemInstructions: string;
  brandVoice: string;
  businessRules: string;
  brandKnowledge: string;
  localAiDebug: boolean;
  localFirstDefaults: boolean;
  localProxyUrl: string;
  localProxyModel: string;
  localProxyApiKey: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  catalogueImportLocalOnly: boolean;
  catalogueImportCloudFallback: boolean;
  catalogueCrawlLimit: number;
  catalogueScrapeUseCrawl4ai: boolean;
  catalogueScrapeUseLlmReader: boolean;
  fallbackToCloudAi: boolean;
  [key: string]: unknown;
}

export function getDefaultAiSettings(): AiSettings {
  return {
    preferredProvider: 'builtin',
    imageProvider: 'builtin',
    geminiModel: 'gemini-2.5-flash',
    groqModel: 'llama-3.3-70b-versatile',
    groqVisionModel: 'llama-3.2-11b-vision-preview',
    pollinationModel: 'flux',
    pollinationApiKey: '',
    puterTextModel: 'gpt-4o-mini',
    puterImageModel: 'dall-e-3',
    builtinModelId: 'gemma-4-e2b-it-web',
    builtinVisionModelId: 'Phi-3.5-vision-instruct-q4f16_1-MLC',
    customModelUrl: '',
    customModelConfig: null,
    allowedAutoProviders: ['builtin', 'local_proxy', 'groq', 'gemini'],
    targetUrl: '',
    geminiApiKey: '',
    groqApiKey: '',
    firecrawlApiKey: '',
    scrapegraphApiKey: '',
    systemInstructions: '',
    brandVoice: '',
    businessRules: '',
    brandKnowledge: '',
    localAiDebug: false,
    localFirstDefaults: true,
    localProxyUrl: 'http://localhost:11434/v1',
    localProxyModel: 'llama3',
    localProxyApiKey: '',
    cloudinaryCloudName: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: '',
    catalogueImportLocalOnly: true,
    catalogueImportCloudFallback: true,
    catalogueCrawlLimit: 100,
    catalogueScrapeUseCrawl4ai: true,
    catalogueScrapeUseLlmReader: true,
    fallbackToCloudAi: false,
  };
}

function migrateToLocalFirstDefaults(parsed: Record<string, unknown>) {
  if (parsed.localFirstDefaults) return parsed;
  const legacyText =
    !parsed.preferredProvider || parsed.preferredProvider === 'auto';
  const legacyImage =
    !parsed.imageProvider ||
    parsed.imageProvider === 'gemini' ||
    parsed.imageProvider === 'auto' ||
    parsed.imageProvider === 'puter';
  if (legacyText) parsed.preferredProvider = 'builtin';
  if (legacyImage) parsed.imageProvider = 'builtin';
  parsed.localFirstDefaults = true;
  try {
    localStorage.setItem('forge_ai_settings', JSON.stringify(parsed));
  } catch {
    /* ignore quota errors */
  }
  return parsed;
}

export const getAiSettings = (): AiSettings => {
  const saved = localStorage.getItem('forge_ai_settings');
  if (saved) {
    try {
      const parsed = migrateToLocalFirstDefaults(JSON.parse(saved));
      if (!parsed.targetUrl) parsed.targetUrl = '';
      if (!parsed.imageProvider) parsed.imageProvider = 'builtin';
      if (!parsed.puterImageModel) parsed.puterImageModel = 'dall-e-3';
      if (!parsed.builtinModelId) parsed.builtinModelId = 'gemma-4-e2b-it-web';
      if (!parsed.builtinVisionModelId) parsed.builtinVisionModelId = 'Phi-3.5-vision-instruct-q4f16_1-MLC';
      if (!parsed.allowedAutoProviders) parsed.allowedAutoProviders = ['builtin', 'local_proxy', 'groq', 'gemini'];
      if (!parsed.brandVoice) parsed.brandVoice = '';
      if (!parsed.businessRules) parsed.businessRules = '';
      if (!parsed.brandKnowledge) parsed.brandKnowledge = '';
      if (!parsed.localAiDebug) parsed.localAiDebug = false;
      if (parsed.catalogueImportLocalOnly === undefined) parsed.catalogueImportLocalOnly = true;
      if (parsed.catalogueImportCloudFallback === undefined) parsed.catalogueImportCloudFallback = true;
      if (!parsed.catalogueCrawlLimit) parsed.catalogueCrawlLimit = 100;
      if (parsed.catalogueScrapeUseCrawl4ai === undefined) parsed.catalogueScrapeUseCrawl4ai = true;
      if (parsed.catalogueScrapeUseLlmReader === undefined) parsed.catalogueScrapeUseLlmReader = true;
      if (parsed.fallbackToCloudAi === undefined) parsed.fallbackToCloudAi = false;
      return { ...getDefaultAiSettings(), ...parsed } as AiSettings;
    } catch {
      /* fall through */
    }
  }
  return getDefaultAiSettings();
};

export const setAiSettings = (settings: AiSettings | Record<string, unknown>) => {
  localStorage.setItem('forge_ai_settings', JSON.stringify(settings));
};

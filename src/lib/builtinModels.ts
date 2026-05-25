/** WebLLM model catalog — standalone module to avoid circular imports with webLlmAppConfig. */

export interface BuiltInModel {
  id: string;
  name: string;
  size: string;
  description: string;
  recommendedRamGb: number;
  estimatedVramGb: number;
  recommendedDatasetMin: number;
  recommendedDatasetMax: number;
  expectedTuneMinutes: string;
  supportsAdvancedTuning?: boolean;
}

export const BUILTIN_MODELS: BuiltInModel[] = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B Instruct',
    size: '0.8GB',
    description:
      "Meta's small but capable model. Best for fast responses on low-end hardware.",
    recommendedRamGb: 8,
    estimatedVramGb: 2,
    recommendedDatasetMin: 30,
    recommendedDatasetMax: 250,
    expectedTuneMinutes: '5-12',
    supportsAdvancedTuning: false,
  },
  {
    id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
    name: 'Phi-3 Mini Instruct',
    size: '2.3GB',
    description:
      "Microsoft's powerful 3.8B model. Highly optimized with strong reasoning.",
    recommendedRamGb: 12,
    estimatedVramGb: 4,
    recommendedDatasetMin: 80,
    recommendedDatasetMax: 600,
    expectedTuneMinutes: '12-30',
    supportsAdvancedTuning: true,
  },
  {
    id: 'Gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2 2B IT',
    size: '1.6GB',
    description: 'Latest Google lightweight model. Excellent for writing and creativity.',
    recommendedRamGb: 10,
    estimatedVramGb: 3,
    recommendedDatasetMin: 60,
    recommendedDatasetMax: 450,
    expectedTuneMinutes: '10-24',
    supportsAdvancedTuning: true,
  },
  {
    id: 'Llama-3.1-8B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.1 8B Instruct',
    size: '5.2GB',
    description:
      "Meta's industry-standard 8B model. Requires strong hardware and 8GB+ RAM.",
    recommendedRamGb: 16,
    estimatedVramGb: 8,
    recommendedDatasetMin: 150,
    recommendedDatasetMax: 1200,
    expectedTuneMinutes: '25-60',
    supportsAdvancedTuning: true,
  },
  {
    id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
    name: 'Mistral 7B v0.3',
    size: '4.8GB',
    description: 'The community favorite for high-quality instruction following.',
    recommendedRamGb: 16,
    estimatedVramGb: 7,
    recommendedDatasetMin: 120,
    recommendedDatasetMax: 1000,
    expectedTuneMinutes: '22-55',
    supportsAdvancedTuning: true,
  },
];

export const BUILTIN_MODEL_IDS = new Set(BUILTIN_MODELS.map((m) => m.id));

/** Context budgeting for browser local models (WebLLM / Chrome Prompt API). */

/** Max chars for brand knowledge bundle when using local providers (plan: ≤2k). */
export const LOCAL_KNOWLEDGE_MAX_CHARS = 2000;

/** Target markdown slice per catalogue extraction chunk (see catalogueExtract.ts). */
export const CATALOGUE_EXTRACT_CHUNK_CHARS = 7000;

export const LOCAL_DESIGN_GUIDE_MAX_CHARS = 800;

export interface LocalAiContextBudget {
  contextWindow: number;
  maxInputChars: number;
  maxOutputChars: number;
  reserveOutputRatio: number;
}

const DEFAULT_CONTEXT = 4096;
const CHARS_PER_TOKEN_ESTIMATE = 4;

/** Conservative context windows per WebLLM / LiteRT model id (align with overrides where known). */
export const LOCAL_MODEL_CONTEXT: Record<string, number> = {
  // LiteRT Web models
  'gemma-3-1b-it-web': 4096,
  'gemma-4-e2b-it-web': 8192,
  'gemma-2-2b-it-web': 4096,
  'gemma-2-9b-it-web': 8192,
  'phi-3-mini-4k-web': 4096,
  'llama-3.2-1b-web': 4096,
  // Legacy WebLLM models
  'gemma-4-e2b-it-web': 8192,
  'gemma-2-9b-it-web': 8192,
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': 4096,
  'Phi-3-mini-4k-instruct-q4f16_1-MLC': 4096,
  'Gemma-2-2b-it-q4f16_1-MLC': 8192,
  'Llama-3.1-8B-Instruct-q4f32_1-MLC': 4096,
  'Mistral-7B-Instruct-v0.3-q4f16_1-MLC': 4096,
  'Phi-3.5-vision-instruct-q4f16_1-MLC': 4096,
  'Phi-3.5-vision-instruct-q4f32_1-MLC': 4096,
};

export function getContextBudget(modelId: string | null): LocalAiContextBudget {
  const contextWindow = (modelId && LOCAL_MODEL_CONTEXT[modelId]) || DEFAULT_CONTEXT;
  const reserveOutputRatio = 0.28;
  const maxInputTokens = Math.floor(contextWindow * (1 - reserveOutputRatio));
  return {
    contextWindow,
    maxInputChars: maxInputTokens * CHARS_PER_TOKEN_ESTIMATE,
    maxOutputChars: Math.floor(contextWindow * reserveOutputRatio) * CHARS_PER_TOKEN_ESTIMATE,
    reserveOutputRatio,
  };
}

export function estimateChars(text: string): number {
  return text?.length || 0;
}

type ChatMessage = { role: string; content: string };

/**
 * Trim conversation for local inference: keep system + latest user, drop middle history.
 */
export function truncateMessagesForLocalAi(
  messages: ChatMessage[],
  maxInputChars: number
): ChatMessage[] {
  if (!messages.length) return messages;

  const systemMsgs = messages.filter((m) => m.role === 'system');
  const nonSystem = messages.filter((m) => m.role !== 'system');

  const pack = (list: ChatMessage[]): ChatMessage[] => {
    let total = list.reduce((n, m) => n + estimateChars(m.content), 0);
    if (total <= maxInputChars) return list;

    const trimmed = [...list];
    while (trimmed.length > 1 && total > maxInputChars) {
      const dropIndex = trimmed.findIndex((m) => m.role !== 'system');
      if (dropIndex === -1) break;
      total -= estimateChars(trimmed[dropIndex].content);
      trimmed.splice(dropIndex, 1);
    }

    if (total > maxInputChars && trimmed.length > 0) {
      const last = trimmed[trimmed.length - 1];
      const allowed = Math.max(512, maxInputChars - 200);
      trimmed[trimmed.length - 1] = {
        ...last,
        content: last.content.slice(-allowed),
      };
    }
    return trimmed;
  };

  const core = pack([...systemMsgs, ...nonSystem]);
  return core;
}

export function truncatePromptText(prompt: string, maxInputChars: number): string {
  if (estimateChars(prompt) <= maxInputChars) return prompt;
  const head = prompt.slice(0, Math.floor(maxInputChars * 0.15));
  const tail = prompt.slice(-Math.floor(maxInputChars * 0.8));
  return `${head}\n\n[...context truncated for local model memory limit...]\n\n${tail}`;
}

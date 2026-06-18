import { getAiSettings, setAiSettings } from './aiSettings';

export type BrandKnowledgeInput = {
  brandVoice?: string;
  businessRules?: string;
  systemInstructions?: string;
  brandProfile?: string;
  designGuide?: string;
};

/** Build the text bundle injected into every AI prompt (local + cloud). */
export function buildBrandKnowledgeBlocks(input: BrandKnowledgeInput): string[] {
  const blocks: string[] = [];
  if (input.brandVoice?.trim()) blocks.push(`BRAND VOICE:\n${input.brandVoice.trim()}`);
  if (input.businessRules?.trim()) blocks.push(`BUSINESS RULES:\n${input.businessRules.trim()}`);
  if (input.systemInstructions?.trim()) blocks.push(`AI INSTRUCTIONS:\n${input.systemInstructions.trim()}`);
  if (input.brandProfile?.trim()) blocks.push(`BRAND PROFILE (brand.md):\n${input.brandProfile.trim()}`);
  if (input.designGuide?.trim()) blocks.push(`DESIGN GUIDE (design.md):\n${input.designGuide.trim()}`);
  return blocks;
}

export function buildMergedBrandKnowledgeMarkdown(input: BrandKnowledgeInput): string {
  const parts: string[] = [];
  if (input.brandVoice?.trim()) parts.push(`## Brand Voice\n${input.brandVoice.trim()}`);
  if (input.businessRules?.trim()) parts.push(`## Business Rules\n${input.businessRules.trim()}`);
  if (input.systemInstructions?.trim()) parts.push(`## AI System Instructions\n${input.systemInstructions.trim()}`);
  if (input.brandProfile?.trim()) parts.push(`## Brand Profile\n${input.brandProfile.trim()}`);
  if (input.designGuide?.trim()) parts.push(`## Design Guide\n${input.designGuide.trim()}`);
  return parts.join('\n\n');
}

/** Persist voice/rules/instructions + brand.md/design.md into forge_ai_settings for all providers. */
export function persistBrandKnowledgeToAiSettings(input: BrandKnowledgeInput): void {
  const settings = getAiSettings();
  const merged = buildMergedBrandKnowledgeMarkdown(input);
  setAiSettings({
    ...settings,
    brandVoice: input.brandVoice ?? settings.brandVoice ?? '',
    businessRules: input.businessRules ?? settings.businessRules ?? '',
    systemInstructions: input.systemInstructions ?? settings.systemInstructions ?? '',
    brandKnowledge: merged,
  });
}

export function knowledgeFromAiSettings(settings: Record<string, unknown>): BrandKnowledgeInput {
  return {
    brandVoice: (settings.brandVoice as string) || '',
    businessRules: (settings.businessRules as string) || '',
    systemInstructions: (settings.systemInstructions as string) || '',
  };
}

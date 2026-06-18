import { beforeEach, describe, expect, it } from 'vitest';
import { getAiSettings, getDefaultAiSettings, setAiSettings } from './aiSettings';

beforeEach(() => {
  localStorage.clear();
});

describe('getAiSettings', () => {
  it('returns fully-typed defaults when nothing is stored', () => {
    const s = getAiSettings();
    expect(typeof s.preferredProvider).toBe('string');
    expect(typeof s.builtinModelId).toBe('string');
    expect(Array.isArray(s.allowedAutoProviders)).toBe(true);
    expect(s).toMatchObject(getDefaultAiSettings());
  });

  it('merges persisted settings over defaults', () => {
    setAiSettings({ ...getDefaultAiSettings(), geminiModel: 'gemini-custom' });
    const s = getAiSettings();
    expect(s.geminiModel).toBe('gemini-custom');
    // Missing keys still fall back to defaults.
    expect(s.groqModel).toBe(getDefaultAiSettings().groqModel);
  });

  it('falls back to defaults when stored JSON is corrupt', () => {
    localStorage.setItem('forge_ai_settings', '{broken');
    expect(getAiSettings()).toMatchObject(getDefaultAiSettings());
  });

  it('backfills defaults for partial persisted settings', () => {
    localStorage.setItem('forge_ai_settings', JSON.stringify({ preferredProvider: 'groq' }));
    const s = getAiSettings();
    expect(s.preferredProvider).toBe('groq');
    expect(s.builtinModelId).toBeTruthy();
    expect(s.catalogueCrawlLimit).toBeGreaterThan(0);
  });
});

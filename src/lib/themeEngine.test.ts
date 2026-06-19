import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_CONFIG,
  PALETTE_PRESETS,
  applyPublicTheme,
  applyThemeConfig,
  clearThemeConfig,
  loadThemeConfig,
  resetThemeConfig,
  saveThemeConfig,
  type ThemeConfig,
} from './themeEngine';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('data-sidebar-style');
  document.documentElement.removeAttribute('data-forge-themed');
  document.documentElement.classList.remove('dark');
  ['forge-font-override', 'forge-radius-override', 'forge-glass-override', 'forge-surface-override'].forEach((id) =>
    document.getElementById(id)?.remove(),
  );
});

describe('PALETTE_PRESETS', () => {
  it('is a curated list with unique names', () => {
    const names = PALETTE_PRESETS.map((p) => p.name);
    expect(names.length).toBe(new Set(names).size);
    expect(PALETTE_PRESETS.length).toBeGreaterThan(0);
  });

  it('every preset declares a light/dark mode and core config', () => {
    for (const p of PALETTE_PRESETS) {
      expect(['light', 'dark']).toContain(p.mode);
      expect(p.colors.length).toBeGreaterThan(0);
      // Each preset must drive font, radius and glass (not just colors).
      expect(p.config.fontFamily).toBeTruthy();
      expect(p.config.borderRadius).toBeTruthy();
      expect(p.config.glassIntensity).toBeTruthy();
    }
  });

  it('contains both light and dark presets', () => {
    const modes = new Set(PALETTE_PRESETS.map((p) => p.mode));
    expect(modes.has('light')).toBe(true);
    expect(modes.has('dark')).toBe(true);
  });
});

describe('theme persistence', () => {
  it('saves and loads a config round-trip', () => {
    const cfg: ThemeConfig = { ...DEFAULT_THEME_CONFIG, accentColor: '#ff0000' };
    saveThemeConfig(cfg);
    expect(loadThemeConfig()).toEqual(cfg);
  });

  it('returns null when nothing is stored', () => {
    expect(loadThemeConfig()).toBeNull();
  });

  it('returns null for corrupt stored JSON', () => {
    localStorage.setItem('forge_custom_theme', '{not json');
    expect(loadThemeConfig()).toBeNull();
  });

  it('clears stored config', () => {
    saveThemeConfig(DEFAULT_THEME_CONFIG);
    clearThemeConfig();
    expect(loadThemeConfig()).toBeNull();
  });
});

describe('applyThemeConfig', () => {
  it('sets brand CSS variables from the accent color', () => {
    applyThemeConfig({ ...DEFAULT_THEME_CONFIG, accentColor: '#2665fd' });
    expect(document.documentElement.style.getPropertyValue('--brand-color')).toBe('#2665fd');
    expect(document.documentElement.style.getPropertyValue('--brand-color-bg')).toBe(
      'rgba(38,101,253,0.1)',
    );
  });

  it('reflects the sidebar style on the root element', () => {
    applyThemeConfig({ ...DEFAULT_THEME_CONFIG, sidebarStyle: 'island' });
    expect(document.documentElement.getAttribute('data-sidebar-style')).toBe('island');
  });

  it('injects a glass override style tag', () => {
    applyThemeConfig({ ...DEFAULT_THEME_CONFIG, glassIntensity: 'glassy' });
    expect(document.getElementById('forge-glass-override')).not.toBeNull();
  });

  it('skips light surface tokens while dark mode is active', () => {
    document.documentElement.classList.add('dark');
    applyThemeConfig(
      {
        ...DEFAULT_THEME_CONFIG,
        canvasBackground: '#f5f0e8',
        panelBackground: '#ede8de',
        textPrimary: '#2d3b2d',
        textSecondary: '#5a6b5a',
      },
      { isDarkMode: true },
    );
    expect(document.documentElement.style.getPropertyValue('--bg-main')).toBe('');
    expect(document.documentElement.getAttribute('data-forge-themed')).toBeNull();
  });

  it('applies dark surface tokens in dark mode for dark palettes', () => {
    document.documentElement.classList.add('dark');
    applyThemeConfig(
      {
        ...DEFAULT_THEME_CONFIG,
        canvasBackground: '#0d0b1a',
        panelBackground: '#150e28',
        textPrimary: '#ede9fe',
        textSecondary: '#9d8fcc',
      },
      { isDarkMode: true },
    );
    expect(document.documentElement.style.getPropertyValue('--bg-main')).toBe('#0d0b1a');
    expect(document.documentElement.getAttribute('data-forge-themed')).toBe('true');
  });
});

describe('applyPublicTheme', () => {
  it('clears dark mode and runtime overrides without clearing storage', () => {
    saveThemeConfig({ ...DEFAULT_THEME_CONFIG, accentColor: '#ff0000' });
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-forge-themed', 'true');
    applyThemeConfig({ ...DEFAULT_THEME_CONFIG, fontFamily: 'Lora' });
    applyPublicTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-forge-themed')).toBeNull();
    expect(document.getElementById('forge-font-override')).toBeNull();
    expect(loadThemeConfig()?.accentColor).toBe('#ff0000');
  });
});

describe('resetThemeConfig', () => {
  it('removes overrides and clears storage', () => {
    applyThemeConfig({ ...DEFAULT_THEME_CONFIG, fontFamily: 'Lora', sidebarStyle: 'dock' });
    saveThemeConfig(DEFAULT_THEME_CONFIG);
    resetThemeConfig();
    expect(document.documentElement.getAttribute('data-sidebar-style')).toBeNull();
    expect(document.getElementById('forge-font-override')).toBeNull();
    expect(loadThemeConfig()).toBeNull();
  });
});

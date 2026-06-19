export interface ThemeConfig {
  accentColor: string;
  accentHover: string;
  borderColor: string;
  canvasBackground: string;
  panelBackground: string;
  textPrimary: string;
  textSecondary: string;
  fontFamily: string;
  borderRadius: 'sharp' | 'balanced' | 'rounded' | 'capsule';
  glassIntensity: 'off' | 'soft' | 'glassy' | 'frosty';
  sidebarStyle?: 'classic' | 'expanded' | 'island' | 'dock';
}

export const BORDER_RADIUS_MAP: Record<ThemeConfig['borderRadius'], string> = {
  sharp: '0px',
  balanced: '8px',
  rounded: '16px',
  capsule: '24px',
};

export const GLASS_MAP: Record<ThemeConfig['glassIntensity'], { blur: string; bg: string; darkBg: string }> = {
  off: { blur: '0px', bg: 'rgba(255,255,255,0.98)', darkBg: 'rgba(26,26,26,0.98)' },
  soft: { blur: '8px', bg: 'rgba(255,255,255,0.88)', darkBg: 'rgba(26,26,26,0.88)' },
  glassy: { blur: '14px', bg: 'rgba(255,255,255,0.78)', darkBg: 'rgba(26,26,26,0.78)' },
  frosty: { blur: '24px', bg: 'rgba(255,255,255,0.60)', darkBg: 'rgba(26,26,26,0.60)' },
};

export const FONT_OPTIONS = [
  { label: 'Inter (Default)', value: 'Inter' },
  { label: 'Space Grotesk', value: 'Space Grotesk' },
  { label: 'Outfit', value: 'Outfit' },
  { label: 'DM Sans', value: 'DM Sans' },
  { label: 'Poppins', value: 'Poppins' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono' },
  { label: 'Lora (Editorial)', value: 'Lora' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Bricolage Grotesque', value: 'Bricolage Grotesque' },
];

export type PalettePreset = {
  name: string;
  mode: 'light' | 'dark';
  colors: string[];
  config: Partial<ThemeConfig>;
};

// Curated presets. Each fully defines its look — accent, surfaces, font, radius,
// glass and sidebar — and declares whether it is a light or dark theme so the app
// can switch modes when it is applied (no more light sidebar in dark mode).
export const PALETTE_PRESETS: PalettePreset[] = [
  {
    name: 'Aurora',
    mode: 'light',
    colors: ['#2665fd', '#5b8cff', '#ffffff'],
    config: {
      accentColor: '#2665fd',
      accentHover: '#1e52d0',
      borderColor: 'rgba(38,101,253,0.18)',
      canvasBackground: '#ffffff',
      panelBackground: '#f7f8fa',
      textPrimary: '#1a1a2e',
      textSecondary: '#5a5f73',
      fontFamily: 'Inter',
      borderRadius: 'rounded',
      glassIntensity: 'soft',
      sidebarStyle: 'classic',
    },
  },
  {
    name: 'Earthy Sage',
    mode: 'light',
    colors: ['#5a7a5a', '#8faf8f', '#f5f0e8'],
    config: {
      accentColor: '#5a7a5a',
      accentHover: '#4a6a4a',
      borderColor: 'rgba(90,122,90,0.2)',
      canvasBackground: '#f5f0e8',
      panelBackground: '#ede8de',
      textPrimary: '#2d3b2d',
      textSecondary: '#5a6b5a',
      fontFamily: 'Lora',
      borderRadius: 'rounded',
      glassIntensity: 'soft',
      sidebarStyle: 'classic',
    },
  },
  {
    name: 'Warm Clay',
    mode: 'light',
    colors: ['#c06b3d', '#e8956a', '#fdf6f0'],
    config: {
      accentColor: '#c06b3d',
      accentHover: '#a85a2c',
      borderColor: 'rgba(192,107,61,0.2)',
      canvasBackground: '#fdf6f0',
      panelBackground: '#f5ece4',
      textPrimary: '#3b2318',
      textSecondary: '#7a4f38',
      fontFamily: 'DM Sans',
      borderRadius: 'balanced',
      glassIntensity: 'off',
      sidebarStyle: 'expanded',
    },
  },
  {
    name: 'Midnight Purple',
    mode: 'dark',
    colors: ['#a78bfa', '#7c3aed', '#0d0b1a'],
    config: {
      accentColor: '#a78bfa',
      accentHover: '#8b5cf6',
      borderColor: 'rgba(167,139,250,0.25)',
      canvasBackground: '#0d0b1a',
      panelBackground: '#150e28',
      textPrimary: '#ede9fe',
      textSecondary: '#9d8fcc',
      fontFamily: 'Space Grotesk',
      borderRadius: 'rounded',
      glassIntensity: 'glassy',
      sidebarStyle: 'classic',
    },
  },
  {
    name: 'Cyber Neon',
    mode: 'dark',
    colors: ['#00f5a0', '#00d9f5', '#060a10'],
    config: {
      accentColor: '#00f5a0',
      accentHover: '#00d88a',
      borderColor: 'rgba(0,245,160,0.25)',
      canvasBackground: '#060a10',
      panelBackground: '#0d1520',
      textPrimary: '#e0fff4',
      textSecondary: '#80bfa8',
      fontFamily: 'JetBrains Mono',
      borderRadius: 'sharp',
      glassIntensity: 'glassy',
      sidebarStyle: 'dock',
    },
  },
  {
    name: 'Obsidian',
    mode: 'dark',
    colors: ['#e0e0e0', '#a0a0a0', '#111111'],
    config: {
      accentColor: '#d0d0d0',
      accentHover: '#b0b0b0',
      borderColor: 'rgba(200,200,200,0.15)',
      canvasBackground: '#111111',
      panelBackground: '#1a1a1a',
      textPrimary: '#f0f0f0',
      textSecondary: '#888888',
      fontFamily: 'Inter',
      borderRadius: 'balanced',
      glassIntensity: 'off',
      sidebarStyle: 'island',
    },
  },
];

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  accentColor: '#2665fd',
  accentHover: '#1e52d0',
  borderColor: 'rgba(38,101,253,0.2)',
  canvasBackground: '',
  panelBackground: '',
  textPrimary: '',
  textSecondary: '',
  fontFamily: 'Inter',
  borderRadius: 'rounded',
  glassIntensity: 'soft',
  sidebarStyle: 'classic',
};

const STORAGE_KEY = 'forge_custom_theme';

export function loadThemeConfig(): ThemeConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ThemeConfig;
  } catch {
    return null;
  }
}

export function saveThemeConfig(config: ThemeConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearThemeConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbString(hex: string, alpha: number) {
  const c = hexToRgb(hex);
  if (!c) return `rgba(0,0,0,${alpha})`;
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

const RUNTIME_STYLE_IDS = [
  'forge-font-override',
  'forge-radius-override',
  'forge-glass-override',
  'forge-surface-override',
] as const;

const RUNTIME_CSS_VARS = [
  '--brand-color',
  '--brand-color-hover',
  '--brand-color-bg',
  '--brand-color-border',
  '--brand-color-ring',
  '--bg-main',
  '--bg-secondary',
  '--text-main',
  '--text-secondary',
  '--text-muted',
  '--border-main',
  '--forge-radius',
  '--forge-glass-blur',
  '--forge-glass-bg',
  '--forge-glass-dark-bg',
  '--forge-font-family',
] as const;

export type ApplyThemeOptions = {
  isDarkMode?: boolean;
};

function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

function shouldApplySurfaceTokens(config: ThemeConfig, isDarkMode: boolean): boolean {
  const hasCustomSurfaces = Boolean(
    config.canvasBackground || config.panelBackground || config.textPrimary || config.textSecondary
  );
  if (!hasCustomSurfaces) return false;
  if (!isDarkMode) return true;
  if (!config.canvasBackground) return false;
  const luminance = relativeLuminance(config.canvasBackground);
  return luminance !== null && luminance < 0.45;
}

function clearRuntimeThemeOverrides(root: HTMLElement): void {
  RUNTIME_CSS_VARS.forEach((v) => root.style.removeProperty(v));
  RUNTIME_STYLE_IDS.forEach((id) => document.getElementById(id)?.remove());
}

/** Reset DOM theme state for landing/login without clearing saved user preferences. */
export function applyPublicTheme(): void {
  const root = document.documentElement;
  root.classList.add('dark');
  root.setAttribute('data-theme', 'default');
  root.removeAttribute('data-sidebar-style');
  root.removeAttribute('data-glass-intensity');
  root.removeAttribute('data-forge-themed');
  clearRuntimeThemeOverrides(root);
}

export function applyThemeConfig(config: ThemeConfig, options: ApplyThemeOptions = {}): void {
  const root = document.documentElement;
  const isDarkMode =
    options.isDarkMode ?? root.classList.contains('dark');
  const applySurfaces = shouldApplySurfaceTokens(config, isDarkMode);

  if (config.accentColor) {
    root.style.setProperty('--brand-color', config.accentColor);
    root.style.setProperty('--brand-color-hover', config.accentHover || config.accentColor);
    root.style.setProperty('--brand-color-bg', rgbString(config.accentColor, 0.1));
    root.style.setProperty('--brand-color-border', rgbString(config.accentColor, 0.2));
    root.style.setProperty('--brand-color-ring', rgbString(config.accentColor, 0.4));
  }

  if (applySurfaces) {
    if (config.canvasBackground) {
      root.style.setProperty('--bg-main', config.canvasBackground);
    }
    if (config.panelBackground) {
      root.style.setProperty('--bg-secondary', config.panelBackground);
    }
    if (config.textPrimary) {
      root.style.setProperty('--text-main', config.textPrimary);
    }
    if (config.textSecondary) {
      root.style.setProperty('--text-secondary', config.textSecondary);
      root.style.setProperty('--text-muted', config.textSecondary);
    }
  } else {
    root.style.removeProperty('--bg-main');
    root.style.removeProperty('--bg-secondary');
    root.style.removeProperty('--text-main');
    root.style.removeProperty('--text-secondary');
    root.style.removeProperty('--text-muted');
  }

  if (config.borderColor) {
    root.style.setProperty('--border-main', config.borderColor);
  } else {
    root.style.removeProperty('--border-main');
  }

  const radius = BORDER_RADIUS_MAP[config.borderRadius] ?? '16px';
  root.style.setProperty('--forge-radius', radius);

  const glassIntensity = config.glassIntensity ?? 'soft';
  const glass = GLASS_MAP[glassIntensity] ?? GLASS_MAP.soft;
  root.style.setProperty('--forge-glass-blur', glass.blur);
  root.style.setProperty('--forge-glass-bg', glass.bg);
  root.style.setProperty('--forge-glass-dark-bg', glass.darkBg);
  root.setAttribute('data-glass-intensity', glassIntensity);

  // Font: Tailwind v4 @theme vars are compile-time only, so we inject a style tag
  // to override font-family at runtime for all elements globally.
  let fontStyleEl = document.getElementById('forge-font-override') as HTMLStyleElement | null;
  if (!fontStyleEl) {
    fontStyleEl = document.createElement('style');
    fontStyleEl.id = 'forge-font-override';
    document.head.appendChild(fontStyleEl);
  }

  const fontFamily = config.fontFamily && config.fontFamily !== 'Inter'
    ? config.fontFamily
    : null;

  if (fontFamily) {
    loadGoogleFont(fontFamily);
    const fontStack = `"${fontFamily}", ui-sans-serif, system-ui, sans-serif`;
    // Also update CSS custom properties for any code that reads them
    root.style.setProperty('--forge-font-family', fontStack);
    fontStyleEl.textContent = [
      `body, html, input, textarea, select, button { font-family: ${fontStack} !important; }`,
      `h1, h2, h3, h4, h5, h6 { font-family: ${fontStack} !important; }`,
      `* { font-family: ${fontStack} !important; }`,
    ].join('\n');
  } else {
    root.style.removeProperty('--forge-font-family');
    fontStyleEl.textContent = '';
  }

  // Border radius: inject a global style override so it applies everywhere
  let radiusStyleEl = document.getElementById('forge-radius-override') as HTMLStyleElement | null;
  if (!radiusStyleEl) {
    radiusStyleEl = document.createElement('style');
    radiusStyleEl.id = 'forge-radius-override';
    document.head.appendChild(radiusStyleEl);
  }
  if (config.borderRadius && config.borderRadius !== 'rounded') {
    radiusStyleEl.textContent = [
      `:root { --forge-radius: ${radius}; }`,
      `.rounded-\\[16px\\], .rounded-\\[12px\\], .rounded-\\[24px\\] { border-radius: ${radius} !important; }`,
    ].join('\n');
  } else {
    radiusStyleEl.textContent = `:root { --forge-radius: ${radius}; }`;
  }

  // Glass effect: inject style override
  let glassStyleEl = document.getElementById('forge-glass-override') as HTMLStyleElement | null;
  if (!glassStyleEl) {
    glassStyleEl = document.createElement('style');
    glassStyleEl.id = 'forge-glass-override';
    document.head.appendChild(glassStyleEl);
  }
  const glassSurfaces = [
    '.glass-panel',
    '.glass-card',
    '.forge-mobile-tab-bar',
    '.forge-dock-nav',
  ].join(', ');
  const darkGlassSurfaces = glassSurfaces.split(',').map((selector) => `.dark ${selector.trim()}`).join(', ');
  glassStyleEl.textContent = [
    `:root { --forge-glass-blur: ${glass.blur}; --forge-glass-bg: ${glass.bg}; --forge-glass-dark-bg: ${glass.darkBg}; }`,
    `${glassSurfaces} { background: ${glass.bg} !important; backdrop-filter: blur(${glass.blur}) !important; -webkit-backdrop-filter: blur(${glass.blur}) !important; }`,
    `${darkGlassSurfaces} { background: ${glass.darkBg} !important; }`,
  ].join('\n');

  if (config.sidebarStyle) {
    root.setAttribute('data-sidebar-style', config.sidebarStyle);
  } else {
    root.setAttribute('data-sidebar-style', 'classic');
  }

  if (applySurfaces) {
    root.setAttribute('data-forge-themed', 'true');
  } else {
    root.removeAttribute('data-forge-themed');
  }

  let surfaceStyleEl = document.getElementById('forge-surface-override') as HTMLStyleElement | null;
  if (!surfaceStyleEl) {
    surfaceStyleEl = document.createElement('style');
    surfaceStyleEl.id = 'forge-surface-override';
    document.head.appendChild(surfaceStyleEl);
  }
  const surfaceScope = isDarkMode ? 'html.dark' : 'html:not(.dark)';
  surfaceStyleEl.textContent = applySurfaces
    ? [
        `${surfaceScope} [data-forge-themed="true"] .forge-bento-card {`,
        '  background: var(--bg-main) !important;',
        '  border-color: var(--border-main) !important;',
        '  color: var(--text-main) !important;',
        '}',
        `${surfaceScope} [data-forge-themed="true"] .forge-bento-card .forge-bento-title {`,
        '  color: var(--text-main) !important;',
        '}',
        `${surfaceScope} [data-forge-themed="true"] .forge-bento-card .forge-bento-subtitle,`,
        `${surfaceScope} [data-forge-themed="true"] .forge-bento-card .text-secondary-safe {`,
        '  color: var(--text-secondary) !important;',
        '}',
        `${surfaceScope} [data-forge-themed="true"] .forge-setting-shell {`,
        '  background: var(--bg-main) !important;',
        '  border-color: var(--border-main) !important;',
        '}',
        `${surfaceScope} [data-forge-themed="true"] .forge-sidebar-rail,`,
        `${surfaceScope} [data-forge-themed="true"] .forge-dock-nav,`,
        `${surfaceScope} [data-forge-themed="true"] .forge-mobile-tab-bar {`,
        '  background: var(--bg-secondary) !important;',
        '  border-color: var(--border-main) !important;',
        '}',
        `${surfaceScope} [data-forge-themed="true"] .forge-chat-shell {`,
        '  background: var(--bg-main) !important;',
        '  color: var(--text-main) !important;',
        '}',
      ].join('\n')
    : '';
}

export function resetThemeConfig(): void {
  const root = document.documentElement;
  clearRuntimeThemeOverrides(root);
  root.removeAttribute('data-sidebar-style');
  root.removeAttribute('data-glass-intensity');
  root.removeAttribute('data-forge-themed');
  clearThemeConfig();
}

function loadGoogleFont(family: string) {
  const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

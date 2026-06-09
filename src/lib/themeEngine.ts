// Dynamic Theme Engine for Advanced Customization & User Freedom
export interface CustomThemeConfig {
  id: string;
  isCustom: boolean;
  brandColor: string;
  brandColorHover: string;
  brandColorBg: string;
  brandColorBorder: string;
  brandColorRing: string;
  bgMain: string;
  bgSecondary: string;
  textMain: string;
  textSecondary: string;
  borderMain: string;
  borderRadius: string; // e.g. "8px"
  fontSans: string; // e.g. "Inter"
  fontDisplay: string; // e.g. "Poppins"
  glassIntensity: 'none' | 'low' | 'medium' | 'high';
}

export const GOOGLE_FONTS = [
  { id: 'Inter', name: 'Inter (Sans-Serif)', family: "'Inter', sans-serif" },
  { id: 'Space Grotesk', name: 'Space Grotesk (Tech)', family: "'Space Grotesk', sans-serif" },
  { id: 'Outfit', name: 'Outfit (Modern)', family: "'Outfit', sans-serif" },
  { id: 'Open Sans', name: 'Open Sans (Clean)', family: "'Open Sans', sans-serif" },
  { id: 'Poppins', name: 'Poppins (Geometric Display)', family: "'Poppins', sans-serif" },
  { id: 'JetBrains Mono', name: 'JetBrains Mono (Technical)', family: "'JetBrains Mono', monospace" },
  { id: 'Lora', name: 'Lora (Elegant Serif)', family: "'Lora', serif" },
  { id: 'Playfair Display', name: 'Playfair Display (Classy Serif)', family: "'Playfair Display', serif" },
  { id: 'Bricolage Grotesque', name: 'Bricolage Grotesque (Playful)', family: "'Bricolage Grotesque', sans-serif" },
];

export function applyCustomTheme(config: CustomThemeConfig | null, isDarkMode: boolean) {
  const root = document.documentElement;
  
  // 1. Remove previous font links
  const existingLinks = document.querySelectorAll('link[data-custom-font]');
  existingLinks.forEach(link => link.remove());

  if (!config || !config.isCustom) {
    // Reset properties to fallback to standard themes
    root.style.removeProperty('--bg-main');
    root.style.removeProperty('--bg-secondary');
    root.style.removeProperty('--text-main');
    root.style.removeProperty('--text-secondary');
    root.style.removeProperty('--border-main');
    root.style.removeProperty('--brand-color');
    root.style.removeProperty('--brand-color-hover');
    root.style.removeProperty('--brand-color-bg');
    root.style.removeProperty('--brand-color-border');
    root.style.removeProperty('--brand-color-ring');
    root.style.removeProperty('--font-sans-custom');
    root.style.removeProperty('--font-display-custom');
    root.style.removeProperty('--border-radius-custom');
    root.style.removeProperty('--glass-bg-custom');
    root.style.removeProperty('--glass-backdrop-custom');
    return;
  }

  // 2. Load custom fonts from Google Fonts dynamically if they are custom
  const fontsToLoad = [config.fontSans, config.fontDisplay].filter(
    f => f && !['Open Sans', 'Poppins'].includes(f) // Fallbacks/preloaded in CSS
  );
  
  if (fontsToLoad.length > 0) {
    const fontQuery = fontsToLoad.map(f => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700`).join('&');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
    link.setAttribute('data-custom-font', 'true');
    document.head.appendChild(link);
  }

  // 3. Inject CSS Variables
  root.style.setProperty('--bg-main', config.bgMain);
  root.style.setProperty('--bg-secondary', config.bgSecondary);
  root.style.setProperty('--text-main', config.textMain);
  root.style.setProperty('--text-secondary', config.textSecondary);
  root.style.setProperty('--border-main', config.borderMain);

  root.style.setProperty('--brand-color', config.brandColor);
  root.style.setProperty('--brand-color-hover', config.brandColorHover || config.brandColor);
  root.style.setProperty('--brand-color-bg', config.brandColorBg);
  root.style.setProperty('--brand-color-border', config.brandColorBorder);
  root.style.setProperty('--brand-color-ring', config.brandColorRing);

  // Apply Fonts
  const sansFontObj = GOOGLE_FONTS.find(f => f.id === config.fontSans);
  const displayFontObj = GOOGLE_FONTS.find(f => f.id === config.fontDisplay);
  
  if (sansFontObj) {
    root.style.setProperty('--font-sans-custom', sansFontObj.family);
  } else {
    root.style.removeProperty('--font-sans-custom');
  }

  if (displayFontObj) {
    root.style.setProperty('--font-display-custom', displayFontObj.family);
  } else {
    root.style.removeProperty('--font-display-custom');
  }

  // Apply Border Radius
  root.style.setProperty('--border-radius-custom', config.borderRadius);

  // Apply Glassmorphism attributes
  let glassBg = 'rgba(255, 255, 255, 0.9)';
  let glassBlur = 'blurs(10px)';
  if (isDarkMode) {
    glassBg = 'rgba(26, 26, 26, 0.9)';
  }

  if (config.glassIntensity === 'none') {
    glassBg = config.bgMain;
    glassBlur = 'none';
  } else if (config.glassIntensity === 'low') {
    glassBg = isDarkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)';
    glassBlur = 'blur(4px)';
  } else if (config.glassIntensity === 'medium') {
    glassBg = isDarkMode ? 'rgba(26,26,26,0.85)' : 'rgba(255,255,255,0.85)';
    glassBlur = 'blur(12px)';
  } else if (config.glassIntensity === 'high') {
    glassBg = isDarkMode ? 'rgba(20,20,20,0.65)' : 'rgba(255,255,255,0.65)';
    glassBlur = 'blur(24px)';
  }

  root.style.setProperty('--glass-bg-custom', glassBg);
  root.style.setProperty('--glass-backdrop-custom', glassBlur);
}

export const DEFAULT_CUSTOM_THEME: CustomThemeConfig = {
  id: 'custom',
  isCustom: true,
  brandColor: '#6366f1',
  brandColorHover: '#4f46e5',
  brandColorBg: 'rgba(99, 102, 241, 0.1)',
  brandColorBorder: 'rgba(99, 102, 241, 0.2)',
  brandColorRing: 'rgba(99, 102, 241, 0.4)',
  bgMain: '#ffffff',
  bgSecondary: '#f9fafb',
  textMain: '#111827',
  textSecondary: '#4b5563',
  borderMain: '#e5e7eb',
  borderRadius: '16px',
  fontSans: 'Inter',
  fontDisplay: 'Outfit',
  glassIntensity: 'medium',
};

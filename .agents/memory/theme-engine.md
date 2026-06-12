---
name: Theme engine pattern
description: How Forge's custom theme system works — where it's applied, when it's stripped, and what it touches
---

## Rule
Custom theme CSS variables are applied via `applyThemeConfig()` in `src/lib/themeEngine.ts`. They are loaded on user login and stripped (via `resetThemeConfig()`) when the user is on the landing page or login screen.

**Why:** Landing and login views must be visually isolated from user-customized themes so they always render consistently.

**How to apply:** In App.tsx, a `useEffect([user?.uid])` calls `loadThemeConfig()` + `applyThemeConfig()` when user is truthy, and `resetThemeConfig()` when user is null.

## Key files
- `src/lib/themeEngine.ts` — ThemeConfig interface, palette presets, font options, applyThemeConfig/load/save/reset
- `src/components/SettingsView.tsx` — Advanced Theme Designer UI (palette presets, color pickers, font, radius, glass) inside the Appearance BentoCard
- `src/index.css` — `--forge-radius`, `--forge-glass-blur`, `--forge-glass-bg` CSS vars in `:root`

## CSS vars written by themeEngine
`--brand-color`, `--brand-color-hover`, `--brand-color-bg`, `--brand-color-border`, `--brand-color-ring`, `--bg-main`, `--bg-secondary`, `--text-main`, `--text-secondary`, `--text-muted`, `--border-main`, `--forge-radius`, `--forge-glass-blur`, `--forge-glass-bg`, `--forge-glass-dark-bg`, `--font-sans`

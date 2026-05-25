# Plan: Rename AI Studio → Widgets Tab

## Goal

Replace the current **AI Studio** experience (`activeTab: 'creative'`) with a clearer **Widgets** tab: a toolbox of built-in utilities (copywriting, image upscaling, resizing, link tools, etc.) plus optional custom widgets—without the confusing split between “modules grid” and a separate **Sandbox** (`AiStudioTab`).

## Current state (post-merge on `main`)

| Piece | Role today |
|-------|------------|
| `CreativeStudioTab.tsx` (~1.6k lines) | Main “AI Studio” UI: widget grid, pinning, built-in tools, custom widget builder playground |
| `AiStudioTab.tsx` | Separate iframe sandbox for AI-generated applets (`creativeView: 'sandbox'`) |
| `App.tsx` | `activeTab === 'creative'`, header “AI Studio”, Sparkles icon, toggles `creativeView` modules vs sandbox |
| Built-in widgets (already in `defaultWidgets`) | copywriting, frameworks, resizer, bulk, urlToCampaign, shortener, nano-upscaler |
| Child components | `ImageResizerTab`, `NanoBananaUpscaler`, `LinkShortener` embedded per widget |
| Firestore | Custom widgets on `business.widgets[]`; applets on `business.applets[]` |
| `workspaceConfig` | `showCreativeStudio` gates visibility |

**Pain points**

- Name “AI Studio” sounds like generic chat, but most value is **single-purpose tools**.
- Sandbox is a second product surface (code gen + iframe) hidden behind “Create” flow.
- Bulk generator copy says “Available in AI Content Tab” — stale / confusing.
- Navigation overload: Home still says “AI Studio”; Settings links to `creative`.

---

## Target experience

### Tab identity

- **Nav label:** `Widgets` (or `Tools` if you prefer shorter mobile labels).
- **Route / state:** rename `creative` → `widgets` (keep `creative` as alias for 1 release).
- **Icon:** `LayoutGrid` or `Boxes` (not Sparkles—that stays for generation-heavy actions).
- **Header:** “Widgets” + subtitle: “Built-in tools and custom workflows for your workspace.”

### Information architecture

```
Widgets (home)
├── Built-in tools (always visible, categorized)
│   ├── Write — Copywriting, Marketing frameworks, URL → campaign
│   ├── Image — Resizer, Nano upscaler, (future: bg remove, crop presets)
│   └── Utility — Link shortener, (future: hashtag tool, alt-text)
├── My widgets (Firestore custom widgets, pinned first)
└── Advanced (collapsed by default)
    └── Widget builder (today’s playground — rename, don’t bury)
```

**Remove** top-level navigation to Sandbox as a separate full-page mode. Fold applet builder into **Advanced → Build custom widget** or a modal/drawer.

---

## Built-in tools catalog (v1)

| Widget ID | Display name | Implementation | Notes |
|-----------|--------------|----------------|-------|
| `copywriting` | Copywriter | Inline in `CreativeStudioTab` | Uses `generateGenericText` + brand context |
| `frameworks` | Marketing frameworks | Inline | AIDA / PAS / BAB templates |
| `resizer` | Image resizer | `ImageResizerTab` | Client-side canvas |
| `nano-upscaler` | Image upscaler | `NanoBananaUpscaler` | Pollinations / AI upscale path |
| `urlToCampaign` | URL to campaign | Inline + `generateCampaignFromUrl` | Output → optional save to posts |
| `shortener` | Link shortener | `LinkShortener` | Firebase / API backed |
| `bulk` | Bulk post ideas | Move logic from stub | Wire to `generateBulkPosts`; save to schedule or Ideas inbox |

**v2 candidates:** alt-text generator, carousel splitter, brand voice checker, simple video thumbnail picker.

---

## Technical approach

### Phase 1 — Rename & shell (low risk)

1. Add `WidgetTab.tsx` (thin re-export or rename `CreativeStudioTab` → `WidgetsTab`).
2. `App.tsx`: `activeTab 'widgets'`, labels, mobile bottom nav, `isWidgetsTabActive` helper.
3. Deprecate `creativeView` / lazy `AiStudioTab` route from main nav; keep code behind feature flag `showWidgetBuilderSandbox`.
4. Update `HomeTab`, `SettingsView`, `AnalyticsTab`, `industryConfig` / `workspaceConfig`: `showCreativeStudio` → `showWidgets` (alias old key in config loader).
5. Search-replace user-facing “AI Studio” strings.

**Acceptance:** All existing built-in widgets open and run; pinning still works; no broken lazy imports.

### Phase 2 — Registry & categories (medium)

1. Extract `src/lib/widgetRegistry.ts`:
   - `WidgetDefinition`: id, title, description, category, icon, component, requiresAI, outputType.
   - `BUILTIN_WIDGETS` array (moves `defaultWidgets` + `renderWidgetUI` switch into data-driven map).
2. `WidgetsTab` renders:
   - Category sections (Write / Image / Utility).
   - Grid cards → `setActiveWidget(id)` or inline expand (prefer **side panel** on desktop, full-screen on mobile).
3. Unify card + pinned + detail header into `WidgetShell` component (title, pin, back).

**Acceptance:** Adding a new built-in widget = one registry entry + one component file.

### Phase 3 — Sandbox consolidation (higher risk)

1. Move `AiStudioTab` applet chat into **Widget builder** drawer inside `WidgetsTab` (reuse `chatToBuildWidget`, `generateAppletCode`).
2. Applets in sidebar: keep `business.applets` but label “Custom apps” under Advanced, not a separate tab.
3. Delete or gate `creativeView === 'sandbox'` path; remove duplicate Nano upscaler entry in sandbox if still present.

**Acceptance:** User can build/preview/save custom widget without leaving Widgets tab.

### Phase 4 — Outputs & Forge integration (product)

1. Standard **output actions** on every widget: Copy, Save to Ideas (inbox block), Create post (open `PostModal` prefilled), Add to calendar.
2. Bulk widget: destination picker (Schedule / Ideas / Download JSON).
3. Telemetry hooks (optional): widget_opened, widget_run_success.

---

## Data model (unchanged unless noted)

- `business.widgets[]` — custom widget definitions (keep schema).
- `business.applets[]` — generated mini-apps (keep; UI only changes).
- Local pin state — today in component state / localStorage; consider `business.pinnedWidgetIds: string[]` for cross-device sync (optional Phase 2.5).

---

## AI / provider behavior

- All text widgets continue through `generateAppText` / `generateGenericText` (local + cloud cascade).
- Image widgets respect `aiSettings.imageProvider` and built-in/local paths from Settings.
- Widget builder tests use same stack; surface provider badge in result footer (“Generated via Local AI / Gemini”).

---

## UI/UX guidelines

- Match **Ideas** / **Calendar** shell: `#F7F7F5` background, white cards, bold section labels.
- Reduce gradient hero or replace with compact header (Ideas-style) for consistency.
- Mobile: bottom nav item “Widgets”; one widget per screen when active; swipe back.
- Empty states per category with 1-line CTA (“Pin your most used tools”).

---

## Migration & compatibility

| Item | Action |
|------|--------|
| `activeTab=creative` bookmarks | Map to `widgets` in `setActiveTab` wrapper |
| `showCreativeStudio` in workspace config | Read both keys; write `showWidgets` |
| PR / docs | Update README feature list |
| Cloudflare worker / extension | No change required |

---

## Testing checklist

- [ ] Open each built-in widget; run primary action; no console errors.
- [ ] Pin/unpin; refresh; pins restored.
- [ ] Custom widget: create, test, save, run from grid.
- [ ] Local AI + Gemini paths for copywriting widget.
- [ ] Image upscaler with and without API keys.
- [ ] `showWidgets: false` (Banking profile) hides nav item.
- [ ] Mobile nav + safe-area padding (regression from main merge).
- [ ] `npm run lint` + `npm run build`.

---

## Suggested implementation order

1. Phase 1 (rename + strings + nav) — **1 PR**
2. Phase 2 (registry + `WidgetShell`) — **1 PR**
3. Phase 3 (sandbox merge) — **1 PR**
4. Phase 4 (Save to Ideas / Create post actions) — **1 PR**

---

## Out of scope (for now)

- Marketplace / shared widget templates across businesses.
- Billing per widget run.
- Replacing Pollinations upscale with a new model host (unless required for reliability).

---

## Open decisions (confirm with product owner)

1. Tab name: **Widgets** vs **Tools** vs **Toolkit**.
2. Keep **Sparkles** anywhere or reserve for “AI generate” buttons only.
3. Whether applets remain iframe-based or migrate to registry components only.
4. Banking workspaces: show Widgets tab with a reduced tool subset vs hide entirely.

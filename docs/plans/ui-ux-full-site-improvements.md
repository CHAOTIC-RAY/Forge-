# Forge — Full Site UI/UX Improvement Plan

Generated with **UI UX Pro Max** (`uipro init --ai cursor`). Design system: `design-system/forge/MASTER.md` (adapted to existing Forge blue brand).

## Product context

- **Type:** B2B SaaS — content calendar, ideas, widgets, brand kit, AI-assisted publishing
- **Stack:** React + Vite + Tailwind v4 + Lucide icons
- **Style direction:** Glassmorphism on chrome (nav, cards), Notion-like neutrals, **brand blue** `#2665fd` (keep theme presets)
- **Typography:** Poppins (headings) + Open Sans (body)

## Phase 1 — Foundation (this PR)

| Area | Changes |
|------|---------|
| Design tokens | Spacing, shadows, glass surfaces, focus rings in `index.css` |
| Accessibility | Skip-to-main link, visible focus, `prefers-reduced-motion` |
| App shell | Glass sidebar + mobile bottom nav, nav `aria-current`, no layout-shift hovers |
| Login | Glass auth card, clearer hierarchy |
| Home | Glass quick-action cards, `cursor-pointer` on interactives |

## Phase 2 — Core workflows

| Page | Improvements |
|------|----------------|
| Calendar / Schedule | Sticky week header, clearer post card density, empty states |
| Ideas | Board column headers, card hover without scale shift |
| Widgets | Consistent `WidgetShell`, output actions bar |
| Settings | Section nav tabs, reduce visual noise in AI panel |
| Post modal | Form labels, primary CTA hierarchy |

## Phase 3 — Polish

- Landing (`LandingView.tsx`) — hero, social proof, single CTA column
- Dark mode contrast audit (4.5:1 body text)
- Loading skeletons on Home + Calendar
- Toast placement + error states

## Phase 4 — Performance UX

- Per `react-performance.csv`: lazy tabs (done), defer heavy AI chunks (done)
- Virtualize long product lists in LocalDb

## UI Pro Max checklist (ongoing)

- [ ] No emoji as icons — Lucide only
- [ ] `cursor-pointer` on all click targets
- [ ] Transitions 150–300ms, no scale on layout-critical hovers
- [ ] Responsive: 375 / 768 / 1024 / 1440
- [ ] Keyboard: tab order, skip link, focus rings

## Commands

```bash
# Regenerate or refine design system
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard content calendar" --design-system -p "Forge" -f markdown

# UX domain search
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "accessibility focus mobile" --domain ux
```

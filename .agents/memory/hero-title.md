---
name: Hero title kinetic typography
description: How the HeroHandwritingTitle gradient animation works and why @property is required
---

## Rule
The "Sparks" gradient in HeroHandwritingTitle uses Framer Motion's `animate()` API to drive CSS custom properties `--spark-color-1` and `--spark-color-2`. These must be registered in CSS with `@property` (in `src/index.css`) for the browser to interpolate them as colors (not strings), enabling smooth transitions.

**Why:** Without `@property`, CSS custom properties are untyped strings — browsers cannot interpolate between two color strings, so the transition would be a hard cut instead of a smooth blend.

**How to apply:** `@property --spark-color-1 { syntax: '<color>'; inherits: false; initial-value: #60a5fa; }` — then Framer Motion's `animate(ref, { '--spark-color-1': newColor })` works with smooth easing.

## Implementation
- `src/components/HeroHandwritingTitle.tsx` — interval cycles through SPARK_PALETTE every 2.6s, then calls `animate(ref, { '--spark-color-1': nc1, '--spark-color-2': nc2 })` on each ref
- Gradient text uses `background: linear-gradient(135deg, var(--spark-color-1), var(--spark-color-2))` + `-webkit-background-clip: text`

# Public Launch Readiness Plan

Plan to take Forge — including shared calendar links — from internal/beta to a confident public release.

## Current state (after this PR)

| Area | Status |
|------|--------|
| Share link UI | Updated to match site design system (`glass-card`, brand tokens, focus rings) |
| Public calendar route (`/share/:businessId/:shareToken`) | Password, expiration, outlet/date filters, view analytics |
| Settings footer | Chaotic Studio credits (aligned with landing page) |
| Landing footer | Extracted to shared `ChaoticStudioCredits` component |

## Phase 1 — Share link hardening (high priority)

### Security

- [ ] **Server-side share validation** — Move token/password/expiry checks to a Cloudflare Worker or Firebase Callable Function so share rules cannot be bypassed by reading Firestore directly.
- [ ] **Password hashing** — Store `sharePassword` as a bcrypt/scrypt hash, never plaintext.
- [ ] **Rate limiting** — Throttle password attempts and short-link redirects (`/s/:code`) per IP.
- [ ] **Revoke on workspace delete** — Clear `shareToken` when a business is removed.
- [ ] **Firestore rules audit** — Ensure `posts` and `businesses` collections deny public writes; shared read should be scoped (today public views rely on client-side token checks).

### Reliability

- [ ] **Unify share entry points** — `App.tsx` embedded share mode and `PublicCalendarView` should share one hook (`useSharedCalendar`) backed by `shareUtils.ts`.
- [ ] **Short-link cleanup** — Delete `short_links` docs when share is revoked.
- [ ] **Expired link UX** — Dedicated expired-state page with owner contact CTA instead of generic “Access denied”.

### Tests

- [ ] Enable `e2e/landing.spec.ts` → `user can share a public calendar` (currently `test.fixme`).
- [ ] Unit tests for `applyShareFilters`, `isShareExpired`, `getShareOutletOptions`.
- [ ] Playwright: generate link → open in incognito → password gate → filter visibility.

---

## Phase 2 — Public product polish

### Shared calendar viewer

- [ ] **Read-only post modal** — Hide edit affordances, watermark “Shared view” badge.
- [ ] **OG meta tags** — Per-share `og:title`, `og:description`, workspace logo for link previews (requires SSR or Worker HTML injection on `/share/*`).
- [ ] **Print stylesheet** — Calendar print layout for client approvals (header already `print:hidden` in places; verify full flow).
- [ ] **Mobile share sheet** — Native Web Share API on “Copy link” for iOS/Android.

### Settings & branding

- [ ] **About section** — Optional expandable “About Forge / Chaotic Studio” card in Settings (version, changelog link).
- [ ] **Consistent credits** — Add `ChaoticStudioCredits` to Login and error pages if desired.

### Onboarding

- [ ] **First-share prompt** — After workspace creation, surface “Share your calendar” CTA once.
- [ ] **Empty calendar state** — Public link with zero posts should show a friendly empty state, not a blank grid.

---

## Phase 3 — Infrastructure & compliance

### Deployment

- [ ] **Production domain** — Confirm `forge.chaoticstudio.workers.dev` (or custom domain) on Cloudflare with HTTPS.
- [ ] **Environment separation** — Staging Firebase project vs production; document in `.env.example`.
- [ ] **Asset limits** — Worker bundle under 25 MiB (already monitored); CDN for ONNX if needed.

### Legal & trust

- [ ] **Privacy policy** — Data collected (Firebase auth, share analytics views, AI providers).
- [ ] **Terms of service** — Workspace ownership, shared link responsibility.
- [ ] **Cookie / analytics notice** — If adding Plausible/PostHog later.

### Observability

- [ ] **Share funnel metrics** — Links generated → opened → password success → “Add workspace” conversions.
- [ ] **Error tracking** — Sentry or Cloudflare Workers observability for public route failures.

---

## Phase 4 — Go-to-market checklist

### Pre-launch QA matrix

| Scenario | Desktop | Mobile |
|----------|---------|--------|
| Generate share link | ☐ | ☐ |
| Copy short + full URL | ☐ | ☐ |
| QR scan opens calendar | ☐ | ☐ |
| Public (no login) view | ☐ | ☐ |
| Login-required view | ☐ | ☐ |
| Password-protected view | ☐ | ☐ |
| Expired link | ☐ | ☐ |
| Outlet filter | ☐ | ☐ |
| Date range filter | ☐ | ☐ |
| Revoke link | ☐ | ☐ |
| Dark mode on public view | ☐ | ☐ |

### Launch assets

- [ ] Landing page CTA points to live sign-up
- [ ] Demo workspace with sample posts for screenshots
- [ ] Short screen recording: generate link → client view
- [ ] Support channel (Telegram/email from Chaotic Studio credits)

### Post-launch (first 2 weeks)

- [ ] Monitor share analytics spikes and Firestore read costs
- [ ] Collect feedback on password/filter UX
- [ ] Prioritize server-side share validation if abuse appears

---

## Suggested implementation order

1. **Firestore security rules + password hashing** — Blocks the biggest public risk.
2. **E2E share flow test** — Prevents regressions on the UI work in this PR.
3. **OG tags + empty states** — Improves first impression when links are shared externally.
4. **Privacy/terms pages** — Required before broad marketing.
5. **`useSharedCalendar` refactor** — Reduces duplicate logic between `App.tsx` and `PublicCalendarView`.

---

## Files touched in this PR

| File | Change |
|------|--------|
| `src/components/ChaoticStudioCredits.tsx` | New shared footer component |
| `src/components/CalendarSharing.tsx` | Design-system UI refresh |
| `src/components/PublicCalendarView.tsx` | Full share enforcement + footer |
| `src/components/LandingView.tsx` | Use shared credits component |
| `src/components/SettingsView.tsx` | Chaotic Studio footer at bottom |
| `src/lib/shareUtils.ts` | Shared filter/expiry/outlet helpers |

---

## Success criteria for “public ready”

Forge is ready for public calendar sharing when:

1. A non-technical user can generate a link, send it to a client, and the client sees only the intended posts — without signing in (unless configured).
2. Password, expiry, and revoke work reliably and cannot be bypassed with devtools alone.
3. Shared pages look branded, load on mobile, and include creator attribution.
4. Legal pages and support contact are one click away.
5. Automated tests cover the happy path and at least one security edge case (expired link).

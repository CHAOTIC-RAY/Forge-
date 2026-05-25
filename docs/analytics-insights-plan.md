# Insights & Analytics — free, out-of-the-box redesign

## Purpose (unchanged)

Help teams **track how they show up on social** for each workspace: what they post, how often, which formats and outlets they lean on, and what to do next—without requiring Meta API keys, paid analytics seats, or scraping credentials on day one.

## Problems with the current tab

- **External dependency**: Analysis is driven by `generateAnalyticsReport` and expects Instagram/Facebook URLs in settings; empty URLs block the tab.
- **Synthetic metrics**: Cloud AI invents engagement rates and demographics without real platform API data—misleading if presented as “live performance.”
- **Disconnected from the product**: The calendar already holds scheduled/published posts, outlets, formats, and captions—the richest honest dataset users already maintain.

## Design principles

1. **Truth from workspace data first** — charts and copy derived from Firestore `posts` (and related fields), not hallucinated platform stats.
2. **Free by default** — no API keys; optional cloud/local AI only for narrative summaries the user opts into.
3. **Same tab, clearer story** — keep “Insights” in nav; redesign layout to match Catalogue/Ideas density (stat row, filters, charts, AI coach card).
4. **Progressive enhancement** — optional profile URLs and future OAuth/API layers sit behind “Connect for live metrics” without blocking the free experience.

## Data sources (phase 1 — no keys)

| Source | Fields | Metrics |
|--------|--------|---------|
| `posts` collection | `date`, `status`, `outlet`, `format`, `category`, `caption`, `hashtags`, `createdAt` | Posts per week, outlet mix, format mix, posting days/hours, caption length, hashtag usage |
| Workspace settings | `instagramUrl`, `facebookUrl` (optional) | Display links, “last checked” placeholder—not live reach |
| Ideas (optional) | `status`, `folderId` | Pipeline: inbox vs ready vs archive |
| Brand kit (optional) | categories | Content pillar tags if posts use categories |

### Computed metrics (client-side)

- **Volume**: posts last 7/30/90 days, vs prior period (% change).
- **Cadence**: avg posts/week, busiest weekday, quiet gaps (>7 days without a scheduled post).
- **Mix**: % by outlet, % by format (carousel, reel, static, story, etc.).
- **Consistency score** (simple): scheduled posts with media + caption vs drafts—no external APIs.
- **Top themes** (lightweight): tokenize captions/hashtags, top 10 terms (stopword list), no LLM required.

## UI redesign (wireframe-level)

```
┌─────────────────────────────────────────────────────────────┐
│ Insights · Track your publishing from the calendar          │
│ [7d] [30d] [90d]                    [Optional: IG] [FB]     │
├─────────────────────────────────────────────────────────────┤
│ POSTS 30D │ AVG/WEEK │ TOP OUTLET │ TOP FORMAT │ GAP ALERT │
├──────────────────────────────┬──────────────────────────────┤
│ Posting rhythm (bar/heatmap) │ Outlet & format (donut)      │
├──────────────────────────────┴──────────────────────────────┤
│ Recent scheduled strip (chips) │ Hashtag / theme cloud      │
├─────────────────────────────────────────────────────────────┤
│ Coach (optional): “Summarize my month” — local AI / cloud   │
│ Uses only aggregated stats + anonymized snippets            │
└─────────────────────────────────────────────────────────────┘
```

### Sections

1. **Header** — subtitle: “Built from your calendar—no API keys required.”
2. **Stat cards** — same visual language as Catalogue (TOTAL POSTS, BUSIEST DAY, etc.).
3. **Charts** — Recharts or lightweight CSS bars; all data from `useMemo` over posts query.
4. **Profile strip (optional)** — show saved IG/FB URLs as bookmarks; copy: “Live reach requires connecting APIs (coming later).”
5. **AI coach card** — button “Generate summary”; uses `generateTextWithCascade` with **structured stats JSON** in the prompt, not “scrape this URL.”

## Implementation plan

### Phase 1 — Ship free insights (recommended next PR)

- [ ] Add `src/lib/insightsMetrics.ts` — pure functions: `computePostingStats(posts, range)`.
- [ ] Refactor `AnalyticsTab.tsx`:
  - Subscribe to posts `onSnapshot` for `activeBusiness.id` (same pattern as calendar).
  - Remove hard requirement for IG/FB URLs to render the tab.
  - Replace fake engagement JSON with computed stats + empty states.
- [ ] Settings: relabel social URLs as “Profile links (optional reference).”
- [ ] Keep `generateAnalyticsReport` behind “AI summary” with prompt: *only use provided stats object*.

### Phase 2 — Polish & parity

- [ ] Heatmap: day-of-week × hour from post `date`/`time` fields.
- [ ] Export PDF/CSV of stats.
- [ ] Link insights → Ideas: “You have 12 ready ideas but only 3 posts next week.”

### Phase 3 — Optional platform data (paid / keys)

- [ ] Meta Graph / Instagram Basic Display behind OAuth.
- [ ] Merge API reach/impressions with calendar stats in a single “Connected” badge.
- [ ] Clear labeling: **Measured** (API) vs **Planned** (calendar).

## AI behavior (no API keys)

**Prompt contract for coach:**

```json
{
  "range": "30d",
  "postsCount": 24,
  "deltaPercent": 12,
  "topOutlet": "Instagram",
  "topFormat": "carousel",
  "busiestDay": "Tuesday",
  "gaps": ["No posts scheduled for next Sunday"],
  "topHashtags": ["#tiles", "#maldives"]
}
```

Model returns 3–5 bullet recommendations; must not invent follower counts or engagement rates unless `apiMetrics` is present in the payload.

Prefer **builtin/local AI** for summaries; cloud optional.

## Success criteria

- New user with only calendar posts sees a populated Insights tab in <2s after load.
- No toast “connect Instagram” on first visit.
- Landing page claims match in-app behavior (calendar-native, free).
- AI summary cites only supplied stats (manual QA checklist).

## Files to touch

| File | Change |
|------|--------|
| `src/components/AnalyticsTab.tsx` | Full layout + data wiring |
| `src/lib/insightsMetrics.ts` | New metrics engine |
| `src/lib/utils.ts` | Optional: move `getAnalyticsSettings` copy updates |
| `src/components/LandingView.tsx` | Already aligned in marketing copy |
| `src/components/SettingsView.tsx` | Optional URLs helper text |

## Risks

- Sparse calendars → empty charts: use friendly empty states and link to Calendar/Ideas.
- Multi-business: scope all queries with `businessId`.
- Time zones: normalize post dates to workspace or browser local.

---

*This document is the product/technical plan for the Insights tab redesign. Phase 1 is the minimum shippable slice that fulfills “works out of the box for free with no API key.”*

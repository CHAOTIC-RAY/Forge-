# Migrate Firestore JSON export to Supabase

## Option A — Run generated SQL (recommended for bulk import)

1. Generate SQL from your export file:

```bash
node scripts/generate-supabase-import-sql.mjs path/to/forge-firestore-export.json supabase/import-forge-firestore-export.sql
```

2. Open [Supabase Dashboard](https://supabase.com/dashboard/project/tpjiowcovqfvmuockpop/sql/new) → **SQL Editor**.

3. Paste the contents of `supabase/import-forge-firestore-export.sql` and click **Run**.

The script wraps everything in `BEGIN` / `COMMIT` and uses `ON CONFLICT` so it is safe to re-run.

Rows that reference deleted/orphan businesses (not in the export's `businesses` list) are handled automatically:
- **Skipped:** `brand_kits`, `brand_overviews`, `categories`, `inventory_maps`, `inventory_category_counts`
- **Imported with `business_id = NULL`:** `posts`, `inventory_products`, `notebooks`, `short_links`

### What gets imported

| Table | From export collection |
|-------|------------------------|
| `profiles` | `users` |
| `businesses` | `businesses` |
| `business_members` | `businesses.members` |
| `posts` | `posts` |
| `inventory_products` | `inventory_products` |
| `notebooks` | `notebooks` |
| `brand_kits` | `brand_kits` |
| `short_links` | `short_links` |

All businesses are linked to Firebase UID `WR31B3zXQ7Sla6Pb28sOtTatREu2` (`2003ray.dark@gmail.com`).

### Verify after import

```sql
SELECT count(*) AS businesses
FROM businesses
WHERE owner_id = (
  SELECT id FROM profiles WHERE firebase_uid = 'WR31B3zXQ7Sla6Pb28sOtTatREu2'
);
-- Expected: 3 (Rainbow Enterprises, Rainbow, Maldives islamic bank)
```

## Option B — Repair workspace links only

If data is already in Supabase but the dashboard is empty, run:

```sql
UPDATE businesses
SET owner_id = (
  SELECT id FROM profiles WHERE firebase_uid = 'WR31B3zXQ7Sla6Pb28sOtTatREu2' LIMIT 1
)
WHERE id IN (
  '476bad32-86a2-467e-9560-0dbb78dddd18',
  '56bee2bd-d7f8-41fc-9490-f7d7ef409507',
  'caf82ac6-a9a5-4a77-b1f5-f8a53abe9f38'
);
```

## Option C — In-app import

1. Go to `https://forge.chaoticstudio.workers.dev/auth`
2. Sign in with **Google — Old database (Firestore)**
3. Use **Import exported JSON backup** with your `.json` file
4. Switch to **Google — New database (Supabase)** and reload

## Option D — AI instructions + calendar only (smaller import)

If you only need **AI system instructions** and **calendar posts**, use the focused generator:

```bash
node scripts/generate-ai-calendar-sql.mjs path/to/forge-firestore-export.json supabase/import-ai-and-calendar.sql
```

Then paste **`supabase/import-ai-and-calendar.sql`** into Supabase SQL Editor.

**Important:** Paste the `.sql` file only — do **not** paste the `.mjs` JavaScript script (that causes `syntax error at or near "{"`).

This imports:
- `profiles.ai_settings` (system instructions, business rules, API keys)
- 76 calendar posts for Rainbow Enterprises

Verify:

```sql
SELECT ai_settings->>'systemInstructions' IS NOT NULL AS has_ai_instructions
FROM profiles WHERE firebase_uid = 'WR31B3zXQ7Sla6Pb28sOtTatREu2';

SELECT count(*) AS calendar_posts
FROM posts WHERE business_id = '476bad32-86a2-467e-9560-0dbb78dddd18';
-- Expected: 76
```

## After migration

Sign in with **New database (Supabase)** at `/auth`, not the legacy Firestore mode.

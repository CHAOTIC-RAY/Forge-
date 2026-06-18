-- =============================================================================
-- FORGE — Full data reset (keeps tables, RLS, and functions)
-- Run in Supabase Dashboard → SQL Editor
-- Project: tpjiowcovqfvmuockpop
-- =============================================================================
-- WARNING: This deletes ALL workspaces, posts, profiles, and catalogue data.
-- It does NOT remove schema/migrations. After reset, sign in to Forge and use
-- onboarding → "Start fresh" or "Import JSON backup".
-- =============================================================================

BEGIN;

TRUNCATE TABLE
  comments,
  access_requests,
  short_links,
  todos,
  catalogue_import_state,
  brand_overviews,
  inventory_maps,
  categories,
  inventory_category_counts,
  inventory_products,
  notebooks,
  brand_kits,
  posts,
  business_members,
  businesses,
  profiles
RESTART IDENTITY CASCADE;

COMMIT;

-- Optional: verify empty
SELECT 'profiles' AS tbl, count(*) FROM profiles
UNION ALL SELECT 'businesses', count(*) FROM businesses
UNION ALL SELECT 'posts', count(*) FROM posts;

#!/usr/bin/env node
/**
 * Generate Supabase SQL for AI instructions + calendar posts only.
 * Usage: node scripts/generate-ai-calendar-sql.mjs export.json [output.sql]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { v5 as uuidv5, validate as uuidValidate } from 'uuid';

const FORGE_MIGRATE_NS = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const FIREBASE_UID = 'WR31B3zXQ7Sla6Pb28sOtTatREu2';
const RAINBOW_ENTERPRISES_ID = '476bad32-86a2-467e-9560-0dbb78dddd18';

function entityId(scope, rawId) {
  if (!rawId) return null;
  if (uuidValidate(String(rawId))) return String(rawId);
  return uuidv5(`${scope}:${rawId}`, FORGE_MIGRATE_NS);
}

function sqlStr(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function sqlTextArray(arr) {
  if (!Array.isArray(arr) || !arr.length) return "'{}'::text[]";
  return `ARRAY[${arr.map((v) => sqlStr(String(v))).join(', ')}]::text[]`;
}

function asIso(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  return null;
}

function asDateOnly(value) {
  const iso = asIso(value);
  return iso ? iso.split('T')[0] : typeof value === 'string' ? value.split('T')[0] : null;
}

function profileSubquery() {
  return `(SELECT id FROM profiles WHERE firebase_uid = ${sqlStr(FIREBASE_UID)} LIMIT 1)`;
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/generate-ai-calendar-sql.mjs <export.json> [output.sql]');
  process.exit(1);
}

const exportData = JSON.parse(readFileSync(inputPath, 'utf8'));
const collections = exportData.collections || {};
const profileId = entityId('profile', FIREBASE_UID);

const lines = [];
lines.push('-- Forge: AI instructions + calendar posts only');
lines.push('-- Paste this ENTIRE file into Supabase SQL Editor (not the .mjs script).');
lines.push('BEGIN;');
lines.push('');

// Minimal profile + business stubs so FKs succeed if missing
const user = collections.users?.[0]?.data || {};
const business = (collections.businesses || []).find(
  ({ id, data }) => String(data.id || id) === RAINBOW_ENTERPRISES_ID
)?.data;

lines.push('-- profile (needed for ai_settings)');
lines.push(`INSERT INTO profiles (id, firebase_uid, email, display_name, photo_url, settings, ai_settings, created_at, updated_at)`);
lines.push(`VALUES (`);
lines.push(`  ${sqlStr(profileId)},`);
lines.push(`  ${sqlStr(FIREBASE_UID)},`);
lines.push(`  ${sqlStr(user.email || '2003ray.dark@gmail.com')},`);
lines.push(`  ${sqlStr(user.displayName || 'Chaos')},`);
lines.push(`  ${sqlStr(user.photoURL || null)},`);
lines.push(`  '{}'::jsonb,`);
lines.push(`  ${sqlJson(user.aiSettings || user.ai_settings || {})},`);
lines.push(`  now(), now()`);
lines.push(`) ON CONFLICT (firebase_uid) DO UPDATE SET`);
lines.push(`  ai_settings = EXCLUDED.ai_settings,`);
lines.push(`  display_name = EXCLUDED.display_name,`);
lines.push(`  photo_url = EXCLUDED.photo_url,`);
lines.push(`  updated_at = now();`);
lines.push('');

if (business) {
  lines.push('-- workspace stub for calendar posts');
  lines.push(`INSERT INTO businesses (id, name, owner_id, industry, status, created_at, updated_at)`);
  lines.push(`VALUES (`);
  lines.push(`  ${sqlStr(RAINBOW_ENTERPRISES_ID)},`);
  lines.push(`  ${sqlStr(business.name || 'Rainbow Enterprises')},`);
  lines.push(`  ${profileSubquery()},`);
  lines.push(`  ${sqlStr(business.industry || null)},`);
  lines.push(`  'active',`);
  lines.push(`  now(), now()`);
  lines.push(`) ON CONFLICT (id) DO UPDATE SET`);
  lines.push(`  owner_id = EXCLUDED.owner_id,`);
  lines.push(`  name = EXCLUDED.name,`);
  lines.push(`  updated_at = now();`);
  lines.push('');
  lines.push(`INSERT INTO business_members (business_id, profile_id, role, joined_at)`);
  lines.push(`VALUES (${sqlStr(RAINBOW_ENTERPRISES_ID)}, ${profileSubquery()}, 'admin', now())`);
  lines.push(`ON CONFLICT (business_id, profile_id) DO UPDATE SET role = EXCLUDED.role;`);
  lines.push('');
}

lines.push('-- calendar posts');
let postCount = 0;
for (const { id, data } of collections.posts || []) {
  const rawPostId = String(data.id || id);
  const biz = String(data.businessId || data.business_id || '');
  if (biz && biz !== RAINBOW_ENTERPRISES_ID) continue;

  postCount++;
  lines.push(`INSERT INTO posts (`);
  lines.push(`  id, business_id, profile_id, date, outlet, type, title, brief, caption, hashtags, images,`);
  lines.push(`  publish_status, platforms, content_formats, approval_status, is_ai_generated, campaign_type, analytics, created_at, updated_at`);
  lines.push(`) VALUES (`);
  lines.push(`  ${sqlStr(entityId('post', rawPostId))},`);
  lines.push(`  ${sqlStr(RAINBOW_ENTERPRISES_ID)},`);
  lines.push(`  ${profileSubquery()},`);
  lines.push(`  ${sqlStr(asDateOnly(data.date) || '2026-01-01')},`);
  lines.push(`  ${sqlStr(data.outlet || null)},`);
  lines.push(`  ${sqlStr(data.type || null)},`);
  lines.push(`  ${sqlStr(data.title || null)},`);
  lines.push(`  ${sqlStr(data.brief || null)},`);
  lines.push(`  ${sqlStr(data.caption || null)},`);
  lines.push(`  ${sqlStr(data.hashtags || null)},`);
  lines.push(`  ${sqlTextArray(data.images || [])},`);
  lines.push(`  ${sqlStr(data.publishStatus || data.status || data.publish_status || 'draft')},`);
  lines.push(`  ${sqlTextArray(data.platforms || [])},`);
  lines.push(`  ${sqlTextArray(data.contentFormats || data.content_formats || [])},`);
  lines.push(`  ${sqlStr(data.approvalStatus || data.approval_status || 'draft')},`);
  lines.push(`  ${data.isAiGenerated ?? data.is_ai_generated ?? false},`);
  lines.push(`  ${sqlStr(data.campaignType || data.campaign_type || null)},`);
  lines.push(`  ${sqlJson(data.analytics || {})},`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.createdAt || data.created_at))}::timestamptz, now()),`);
  lines.push(`  COALESCE(${sqlStr(asIso(data.updatedAt || data.updated_at))}::timestamptz, now())`);
  lines.push(`) ON CONFLICT (id) DO UPDATE SET`);
  lines.push(`  date = EXCLUDED.date,`);
  lines.push(`  outlet = EXCLUDED.outlet,`);
  lines.push(`  type = EXCLUDED.type,`);
  lines.push(`  title = EXCLUDED.title,`);
  lines.push(`  brief = EXCLUDED.brief,`);
  lines.push(`  caption = EXCLUDED.caption,`);
  lines.push(`  hashtags = EXCLUDED.hashtags,`);
  lines.push(`  images = EXCLUDED.images,`);
  lines.push(`  publish_status = EXCLUDED.publish_status,`);
  lines.push(`  platforms = EXCLUDED.platforms,`);
  lines.push(`  approval_status = EXCLUDED.approval_status,`);
  lines.push(`  campaign_type = EXCLUDED.campaign_type,`);
  lines.push(`  updated_at = EXCLUDED.updated_at;`);
}

lines.push('');
lines.push('COMMIT;');
lines.push('');
lines.push('-- Verify:');
lines.push(`-- SELECT ai_settings->>'systemInstructions' IS NOT NULL AS has_ai_instructions FROM profiles WHERE firebase_uid = '${FIREBASE_UID}';`);
lines.push(`-- SELECT count(*) AS calendar_posts FROM posts WHERE business_id = '${RAINBOW_ENTERPRISES_ID}';`);

const sql = lines.join('\n');
const outputPath = process.argv[3] || 'supabase/import-ai-and-calendar.sql';
writeFileSync(outputPath, sql);
console.error(`Wrote ${outputPath} (${sql.length} bytes, ${postCount} posts)`);
